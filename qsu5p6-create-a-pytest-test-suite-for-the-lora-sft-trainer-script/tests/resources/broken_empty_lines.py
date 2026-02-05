import json

def read_jsonl(path):
    records = []
    with open(path, "r") as f:
        for line in f:
            # BUG: Does not check 'if line.strip():' (Requirement 1 violation)
            # This will raise json.decoder.JSONDecodeError on empty lines
            records.append(json.loads(line))
    return records

def build_prompt(i, inp, r=None): return "prompt"
def to_hf_dataset(p): return None
@dataclass
class DataCollatorForCausal:
    def __call__(self, f): return {}
def main(): pass