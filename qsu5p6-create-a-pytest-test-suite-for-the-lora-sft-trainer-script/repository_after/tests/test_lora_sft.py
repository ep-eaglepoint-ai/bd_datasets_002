import os
import json
import pytest
import torch
import sys
from unittest.mock import MagicMock, patch
from pathlib import Path

# Path resolution
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_PATH = BASE_DIR / "my_lora_project" / "src" / "model"
sys.path.append(str(SRC_PATH))

from trainer import read_jsonl, build_prompt, to_hf_dataset, DataCollatorForCausal, main

def test_read_jsonl_ignores_empty_lines(tmp_path):
    f = tmp_path / "data.jsonl"
    f.write_text('{"a": 1}\n\n{"b": 2}')
    try:
        records = read_jsonl(str(f))
    except Exception as e:
        pytest.fail(f"Failed Req 1: Code crashed on empty lines with {type(e).__name__}")
    assert len(records) == 2, "Failed Req 1: Empty lines must be filtered"

def test_build_prompt_has_system_persona():
    prompt = build_prompt("task", "input", "resp")
    assert "[SYSTEM]" in prompt, "Failed Req 2: Missing mandatory SYSTEM block"
    assert "precise mechanical engineering" in prompt.lower(), "Failed Req 2: Incorrect persona"

def test_hf_dataset_has_text_column(tmp_path):
    f = tmp_path / "t.jsonl"
    f.write_text(json.dumps({"instruction": "a", "input": "b", "output": "c"}))
    ds = to_hf_dataset(str(f))
    assert ds is not None, "Failed Req 3: to_hf_dataset returned None"
    assert "text" in ds.column_names, "Failed Req 3: Dataset must have 'text' column"

def test_collator_labels_are_exact_copy():
    # Fix: Tokenizer must return a dict so the collator can find keys
    mock_tok = MagicMock()
    mock_tok.return_value = {
        "input_ids": torch.tensor([[1, 2, 3]]),
        "attention_mask": torch.tensor([[1, 1, 1]])
    }
    collator = DataCollatorForCausal(tokenizer=mock_tok)
    batch = collator([{"text": "a"}])
    
    assert "input_ids" in batch, "Failed Req 4: input_ids missing from batch"
    assert "labels" in batch, "Failed Req 5: labels missing from batch"
    assert torch.equal(batch["input_ids"], batch["labels"]), "Failed Req 5: Labels must match input_ids"

@patch("trainer.AutoTokenizer.from_pretrained")
@patch("trainer.AutoModelForCausalLM.from_pretrained")
@patch("trainer.get_peft_model")
@patch("trainer.TrainingArguments") # Mock this to avoid version TypeErrors
@patch("trainer.Trainer")
def test_main_smoke(mock_trainer_cls, mock_args, mock_peft, mock_model, mock_tok, tmp_path):
    train_file = tmp_path / "train.jsonl"
    train_file.write_text(json.dumps({"instruction": "a", "input": "b", "output": "c"}))
    out_dir = tmp_path / "output_dir"
    
    with patch.object(sys, 'argv', ["t.py", "--train", str(train_file), "--output", str(out_dir)]):
        main()
    
    assert os.path.exists(out_dir), "Failed Req 8: Output directory was not created"