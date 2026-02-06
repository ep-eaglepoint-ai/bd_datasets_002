import importlib.util
import json
from pathlib import Path

import torch
from repository_after import (
    SFTConfig,
    build_prompt,
    create_tiny_model_and_tokenizer,
    load_jsonl_dataset,
    tokenize_dataset,
    train_sft,
)
from repository_after import sft_lora


def _write_jsonl(path: Path, rows):
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row) + "\n")


def _make_vocab():
    return [
        "[UNK]",
        "[PAD]",
        "</s>",
        "<s>",
        "<|system|>",
        "<|user|>",
        "<|assistant|>",
        "Instruction:",
        "Input:",
        "Hello",
        "World",
        "Test",
        "Response",
    ]


def test_prompt_structure_includes_optional_input():
    prompt = build_prompt("SYS", "Do X", "Given Y", "Z")
    assert "<|system|>" in prompt
    assert "Instruction:\nDo X" in prompt
    assert "Input:\nGiven Y" in prompt
    assert "<|assistant|>\nZ" in prompt


def test_prompt_structure_omits_empty_input():
    prompt = build_prompt("SYS", "Do X", "", "Z")
    assert "Input:" not in prompt


def test_jsonl_loading_and_tokenization(tmp_path):
    data_path = tmp_path / "data.jsonl"
    _write_jsonl(
        data_path,
        [
            {"instruction": "Hello", "input": "", "output": "World"},
            {"instruction": "Test", "input": "Input", "output": "Response"},
        ],
    )

    model_dir = tmp_path / "tiny_model"
    create_tiny_model_and_tokenizer(str(model_dir), _make_vocab())

    dataset = load_jsonl_dataset(str(data_path))
    tokenizer_dataset = dataset.map(
        lambda row: {"text": build_prompt("SYS", row["instruction"], row.get("input", ""), row["output"])},
        remove_columns=dataset.column_names,
    )

    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True)
    tokenized = tokenize_dataset(tokenizer_dataset, tokenizer, max_length=64)
    sample = tokenized[0]
    assert "input_ids" in sample
    assert "labels" in sample
    assert sample["input_ids"] == sample["labels"]


def test_train_sft_saves_adapter_and_merge(tmp_path):
    data_path = tmp_path / "data.jsonl"
    _write_jsonl(
        data_path,
        [
            {"instruction": "Hello", "input": "", "output": "World"},
            {"instruction": "Test", "input": "Input", "output": "Response"},
        ],
    )

    model_dir = tmp_path / "tiny_model"
    create_tiny_model_and_tokenizer(str(model_dir), _make_vocab())

    output_dir = tmp_path / "output"
    config = SFTConfig(
        base_model=str(model_dir),
        tokenizer_path=str(model_dir),
        data_path=str(data_path),
        output_dir=str(output_dir),
        max_length=64,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=2,
        max_steps=1,
        num_train_epochs=1.0,
        merge_lora=True,
        device_map_auto=False,
        offline=True,
    )

    train_sft(config)

    adapter_config = output_dir / "adapter_config.json"
    tokenizer_file = output_dir / "tokenizer.json"
    merged_dir = output_dir / "merged"

    assert adapter_config.exists()
    assert tokenizer_file.exists()
    assert merged_dir.exists()
    assert (merged_dir / "config.json").exists()


def test_precision_dtype_support():
    assert sft_lora._resolve_torch_dtype(True, False) == torch.float16
    assert sft_lora._resolve_torch_dtype(False, True) == torch.bfloat16
    try:
        sft_lora._resolve_torch_dtype(True, True)
    except ValueError:
        assert True
    else:
        assert False


def test_quantization_config_support():
    if importlib.util.find_spec("bitsandbytes") is None:
        try:
            sft_lora._build_quantization_config(4, False)
        except RuntimeError:
            assert True
        else:
            assert False
        return

    config_4 = sft_lora._build_quantization_config(4, False)
    assert config_4.load_in_4bit is True

    config_8 = sft_lora._build_quantization_config(8, True)
    assert config_8.load_in_8bit is True
    assert config_8.llm_int8_enable_fp32_cpu_offload is True


def test_device_map_offline_and_gradient_controls(tmp_path, monkeypatch):
    data_path = tmp_path / "data.jsonl"
    _write_jsonl(
        data_path,
        [
            {"instruction": "Hello", "input": "", "output": "World"},
            {"instruction": "Test", "input": "Input", "output": "Response"},
        ],
    )

    model_dir = tmp_path / "tiny_model"
    create_tiny_model_and_tokenizer(str(model_dir), _make_vocab())

    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True)
    model = AutoModelForCausalLM.from_pretrained(str(model_dir), local_files_only=True)
    model._gc_enabled = False

    calls = {"device_map": None, "model_local": None, "tokenizer_local": None}
    trainer_args = {}

    def fake_model_from_pretrained(*args, **kwargs):
        calls["device_map"] = kwargs.get("device_map")
        calls["model_local"] = kwargs.get("local_files_only")

        def _gc():
            model._gc_enabled = True

        model.gradient_checkpointing_enable = _gc
        return model

    def fake_tokenizer_from_pretrained(*args, **kwargs):
        calls["tokenizer_local"] = kwargs.get("local_files_only")
        return tokenizer

    class DummyTrainer:
        def __init__(self, model, args, train_dataset, data_collator):
            trainer_args["gradient_accumulation_steps"] = args.gradient_accumulation_steps
            trainer_args["fp16"] = args.fp16
            trainer_args["bf16"] = args.bf16

        def train(self):
            return None

    monkeypatch.setattr(sft_lora, "Trainer", DummyTrainer)
    monkeypatch.setattr(sft_lora.AutoModelForCausalLM, "from_pretrained", fake_model_from_pretrained)
    monkeypatch.setattr(sft_lora.AutoTokenizer, "from_pretrained", fake_tokenizer_from_pretrained)

    output_dir = tmp_path / "output_controls"
    config = SFTConfig(
        base_model=str(model_dir),
        tokenizer_path=str(model_dir),
        data_path=str(data_path),
        output_dir=str(output_dir),
        max_length=64,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=3,
        max_steps=1,
        num_train_epochs=1.0,
        gradient_checkpointing=True,
        fp16=False,
        bf16=False,
        device_map_auto=True,
        offline=True,
    )

    train_sft(config)

    assert calls["device_map"] == "auto"
    assert calls["model_local"] is True
    assert calls["tokenizer_local"] is True
    assert trainer_args["gradient_accumulation_steps"] == 3
    assert trainer_args["bf16"] is False
    assert trainer_args["fp16"] is False
    assert model._gc_enabled is True
    assert model.config.use_cache is False