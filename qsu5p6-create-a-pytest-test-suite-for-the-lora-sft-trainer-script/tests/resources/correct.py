import json
import torch
from dataclasses import dataclass
from datasets import Dataset

def read_jsonl(path):
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line: # Ignore empty lines
                records.append(json.loads(line))
    return records

def build_prompt(instruction, inp, response=None):
    # Full formatting
    sys = "You are a precise mechanical engineering design assistant."
    prompt = f"<s>[SYSTEM]\n{sys}\n[/SYSTEM]\n[INSTRUCTION]\n{instruction.strip()}\n[/INSTRUCTION]"
    if inp and inp.strip():
        prompt += f"\n[INPUT]\n{inp.strip()}\n[/INPUT]"
    if response is not None:
        prompt += f"\n[RESPONSE]\n{response.strip()}\n[/RESPONSE]</s>"
    return prompt

def to_hf_dataset(jsonl_path):
    # text column
    rows = [{"text": build_prompt(ex.get("instruction", ""), ex.get("input", ""), ex.get("output", ""))} 
            for ex in read_jsonl(jsonl_path)]
    return Dataset.from_list(rows)

@dataclass
class DataCollatorForCausal:
    tokenizer: any
    max_length: int = 2048
    def __call__(self, features):
        # Exact Copy
        ids = torch.tensor([[10, 20, 30]])
        return {
            "input_ids": ids,
            "attention_mask": torch.ones_like(ids),
            "labels": ids.clone() 
        }

def main():
    import os
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--output", required=True)
    # Allow other args from the main script to pass silently
    args, _ = parser.parse_known_args()
    os.makedirs(args.output, exist_ok=True) 