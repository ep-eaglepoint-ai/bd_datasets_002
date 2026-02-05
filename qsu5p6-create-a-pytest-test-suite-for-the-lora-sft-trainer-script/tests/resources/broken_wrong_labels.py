import torch
from dataclasses import dataclass

def build_prompt(instruction, inp, response=None):
    return f"<s>[SYSTEM]\nAssistant[/SYSTEM][INSTRUCTION]\n{instruction}[/INSTRUCTION]"

def read_jsonl(path): return []
def to_hf_dataset(path): return None

@dataclass
class DataCollatorForCausal:
    tokenizer: any
    max_length: int = 2048
    def __call__(self, features):
        ids = torch.tensor([[1, 2, 3, 4]])
        # BUG: Labels are NOT an exact copy (Requirement 5 violation)
        # Here we mask the first half, which is wrong for this specific project contract
        labels = ids.clone()
        labels[:, :2] = -100 
        return {"input_ids": ids, "labels": labels, "attention_mask": torch.ones_like(ids)}

def main(): pass