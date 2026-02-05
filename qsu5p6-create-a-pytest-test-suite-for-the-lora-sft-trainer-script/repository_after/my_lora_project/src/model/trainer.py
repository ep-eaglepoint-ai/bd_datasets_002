import os
import json
import math
import argparse
from dataclasses import dataclass
from typing import Dict, List, Optional

import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
)
from peft import LoraConfig, get_peft_model, PeftModel, prepare_model_for_kbit_training
from transformers.trainer_utils import set_seed

def read_jsonl(path: str) -> List[Dict]:
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def build_prompt(instruction: str, inp: str, response: Optional[str] = None) -> str:
    """Simple SFT prompt. Swap to a chat template if your base model expects it."""
    sys = "You are a precise mechanical engineering design assistant."
    prompt = f"""<s>[SYSTEM]
{sys}
[/SYSTEM]
[INSTRUCTION]
{instruction.strip()}
[/INSTRUCTION]"""
    if inp and inp.strip():
        prompt += f"""
[INPUT]
{inp.strip()}
[/INPUT]"""
    if response is not None:
        prompt += f"""
[RESPONSE]
{response.strip()}
[/RESPONSE]</s>"""
    return prompt


def to_hf_dataset(jsonl_path: str) -> Dataset:
    """
    Always returns a dataset with a 'text' column so the causal LM collator works
    for both train and eval.
    """
    rows = []
    for ex in read_jsonl(jsonl_path):
        instruction = ex.get("instruction", "")
        inp = ex.get("input", "")
        out = ex.get("output", "")
        rows.append({"text": build_prompt(instruction, inp, out)})
    return Dataset.from_list(rows)


def smart_tokenizer(model_name: str):
    tok = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    tok.padding_side = "right"
    return tok
@dataclass
class DataCollatorForCausal:
    tokenizer: AutoTokenizer
    max_length: int = 2048

    def __call__(self, features: List[Dict]) -> Dict[str, torch.Tensor]:
        texts = [f["text"] for f in features]
        batch = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        batch["labels"] = batch["input_ids"].clone()
        return batch

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True, help="Path to train.jsonl")
    parser.add_argument("--eval", default=None, help="Path to eval.jsonl (optional)")
    parser.add_argument("--output", required=True, help="Output dir for checkpoints/adapters")
    parser.add_argument("--base_model", default=None, help="HF model id or local path")
    parser.add_argument("--seed", type=int, default=42)

    # Training hyperparams
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--warmup_ratio", type=float, default=0.03)
    parser.add_argument("--batch_size", type=int, default=2)
    parser.add_argument("--grad_accum", type=int, default=16)
    parser.add_argument("--max_steps", type=int, default=-1)
    parser.add_argument("--save_strategy", default="epoch", choices=["epoch", "steps"])
    parser.add_argument("--save_steps", type=int, default=500)

    # LoRA config
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    parser.add_argument("--target_modules", nargs="*", default=["q_proj", "v_proj"])

    # Quantization / memory
    parser.add_argument("--load_in_4bit", action="store_true")
    parser.add_argument("--load_in_8bit", action="store_true")
    parser.add_argument("--offload_cpu", action="store_true", help="Enable CPU offload for low VRAM GPUs")
    parser.add_argument("--offload_dir", default="offload", help="Folder for offloaded weights")

    # Logging / eval
    parser.add_argument("--logging_steps", type=int, default=25)
    parser.add_argument("--eval_steps", type=int, default=250)
    parser.add_argument("--evaluation_strategy", default="no", choices=["no", "steps", "epoch"])

    # Advanced
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--bf16", action="store_true")
    parser.add_argument("--gradient_checkpointing", action="store_true")
    parser.add_argument("--max_seq_len", type=int, default=2048)
    parser.add_argument("--merge_lora", action="store_true", help="Merge adapters into base weights at the end")
    parser.add_argument("--push_to_hub", action="store_true")

    args = parser.parse_args()
    set_seed(args.seed)

    base_model_name = args.base_model or os.getenv("LLM_BASE_MODEL", "mistralai/Mistral-7B-v0.1")
    os.makedirs(args.output, exist_ok=True)

    # ---- Datasets
    train_ds = to_hf_dataset(args.train)
    eval_ds = to_hf_dataset(args.eval) if args.eval else None

    # ---- Tokenizer
    tokenizer = smart_tokenizer(base_model_name)

    # ---- Load base model with quantization and (optional) CPU offload
    load_kwargs = {}
    if args.load_in_4bit:
        from transformers import BitsAndBytesConfig
        load_kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16 if args.bf16 else torch.float16,
            bnb_4bit_quant_type="nf4",
        )
    elif args.load_in_8bit:
        from transformers import BitsAndBytesConfig
        load_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)

    dtype = torch.bfloat16 if args.bf16 else (torch.float16 if args.fp16 else None)

    if args.offload_cpu:
        os.makedirs(args.offload_dir, exist_ok=True)
        load_kwargs["offload_folder"] = args.offload_dir

    print(f"[trainer] Loading base model: {base_model_name}")
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        device_map="auto",
        torch_dtype=dtype,
        **load_kwargs,
    )

    # Optional: gradient checkpointing for memory savings
    if args.gradient_checkpointing and hasattr(model, "gradient_checkpointing_enable"):
        model.gradient_checkpointing_enable()
        model.config.use_cache = False

    # If using k-bit, prep model for training (important for stability)
    if args.load_in_4bit or args.load_in_8bit:
        model = prepare_model_for_kbit_training(model)

    # ---- LoRA
    lora_cfg = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=args.target_modules,
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    # ---- Data collator
    data_collator = DataCollatorForCausal(tokenizer=tokenizer, max_length=args.max_seq_len)

    # ---- Trainer args
    total_bs = args.batch_size * args.grad_accum
    train_steps_guess = math.ceil(len(train_ds) / max(1, total_bs)) * args.epochs
    print(f"[trainer] Training examples: {len(train_ds)} | Estimated steps: {train_steps_guess}")

    training_args = TrainingArguments(
        output_dir=args.output,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        warmup_ratio=args.warmup_ratio,
        weight_decay=0.0,
        max_steps=args.max_steps,
        logging_steps=args.logging_steps,
        save_strategy=args.save_strategy,
        save_steps=args.save_steps,
        evaluation_strategy=args.evaluation_strategy,
        eval_steps=args.eval_steps if args.evaluation_strategy == "steps" else None,
        fp16=args.fp16,
        bf16=args.bf16,
        lr_scheduler_type="cosine",
        report_to=["none"],
        push_to_hub=args.push_to_hub,
        remove_unused_columns=False,  # IMPORTANT when using custom fields like "text"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds if args.evaluation_strategy != "no" else None,
        data_collator=data_collator,
        tokenizer=tokenizer,
    )

    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)

    # ---- Optional: merge LoRA into base weights
    if args.merge_lora:
        print("[trainer] Merging LoRA adapters into base model weights …")
        base = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            device_map="auto",
            torch_dtype=torch.float16,
        )
        peft = PeftModel.from_pretrained(base, args.output)
        merged = peft.merge_and_unload()
        merged_dir = os.path.join(args.output, "merged")
        os.makedirs(merged_dir, exist_ok=True)
        merged.save_pretrained(merged_dir)
        tokenizer.save_pretrained(merged_dir)
        print("[trainer] Merged model saved to:", merged_dir)

    print("[trainer] Done. Adapters saved to:", args.output)


if __name__ == "__main__":
    main()
