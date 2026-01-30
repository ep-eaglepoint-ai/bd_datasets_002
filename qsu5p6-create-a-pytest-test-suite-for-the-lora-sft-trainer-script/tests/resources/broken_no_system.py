import json
import torch
from dataclasses import dataclass

def read_jsonl(path):
    return [json.loads(line) for line in open(path) if line.strip()]

def build_prompt(instruction, inp, response=None):
    # BUG: Skips [SYSTEM] section entirely
    prompt = f"[INSTRUCTION]\n{instruction.strip()}\n[/INSTRUCTION]"
    if inp:
        prompt += f"\n[INPUT]\n{inp.strip()}\n[/INPUT]"
    if response:
        prompt += f"\n[RESPONSE]\n{response.strip()}\n[/RESPONSE]</s>"
    return prompt

def to_hf_dataset(path):
    from datasets import Dataset
    return Dataset.from_list([{"text": build_prompt("a", "b", "c")}])

@dataclass
class DataCollatorForCausal:
    tokenizer: any
    max_length: int = 2048
    def __call__(self, features):
        ids = torch.tensor([[1, 2, 3]])
        return {"input_ids": ids, "labels": ids.clone(), "attention_mask": torch.ones_like(ids)}

def main():
    import os
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    os.makedirs(args.output, exist_ok=True)