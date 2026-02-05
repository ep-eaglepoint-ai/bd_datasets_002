import pytest
import os
from pathlib import Path

pytest_plugins = ("pytester",)

@pytest.fixture
def trainer_suite_text():
    # Use absolute paths for Docker reliability
    suite_path_env = os.getenv("TEST_SUITE_PATH", "repository_after/tests/test_lora_sft.py")
    path = Path("/app") / suite_path_env
    if not path.exists():
        pytest.fail(f"META-FAIL: Unit test suite not found at {path}")
    return path.read_text()

def run_meta_isolated(pytester, suite_text, broken_code):
    pytester.makepyfile(trainer=broken_code)
    pytester.makepyfile(test_lora_sft=suite_text)
    return pytester.runpytest_subprocess()

# Exhaustive Stubs to satisfy imports and @patch decorators in test_lora_sft.py
STUB_FUNCS = """
import torch
from dataclasses import dataclass
from unittest.mock import MagicMock

# Imports expected by test_lora_sft.py
def read_jsonl(p): return []
def build_prompt(i, inp, r=None): return ""
def to_hf_dataset(p): return None

@dataclass
class DataCollatorForCausal:
    tokenizer: any
    def __call__(self, f): return {"input_ids": torch.tensor([0]), "labels": torch.tensor([0])}

def main(): pass

# Symbols patched in test_main_smoke
class AutoTokenizer:
    @staticmethod
    def from_pretrained(*args, **kwargs): return MagicMock()
class AutoModelForCausalLM:
    @staticmethod
    def from_pretrained(*args, **kwargs): return MagicMock()
def get_peft_model(*args, **kwargs): return MagicMock()
class TrainingArguments: # FIXED: Added missing class for @patch
    def __init__(self, *args, **kwargs): pass
class Trainer:
    def __init__(self, *args, **kwargs): pass
    def train(self): pass
    def save_model(self, *args): pass
"""

def test_meta_detects_empty_line_bug(pytester, trainer_suite_text):
    broken = STUB_FUNCS + "\nimport json\ndef read_jsonl(p): return [json.loads(l) for l in open(p)]"
    result = run_meta_isolated(pytester, trainer_suite_text, broken)
    assert any("Failed Req 1" in line or "JSONDecodeError" in line for line in result.stdout.lines)
    assert result.ret != 0

def test_meta_detects_missing_system_persona(pytester, trainer_suite_text):
    broken = STUB_FUNCS + "\ndef build_prompt(i, inp, r=None): return '[INSTRUCTION]'"
    result = run_meta_isolated(pytester, trainer_suite_text, broken)
    result.stdout.fnmatch_lines(["*Failed Req 2*"])
    assert result.ret != 0

def test_meta_detects_wrong_column_name(pytester, trainer_suite_text):
    broken = STUB_FUNCS + "\nfrom datasets import Dataset\ndef to_hf_dataset(p): return Dataset.from_list([{'p': 'a'}])"
    result = run_meta_isolated(pytester, trainer_suite_text, broken)
    assert any("Failed Req 3" in line or "AttributeError" in line for line in result.stdout.lines)
    assert result.ret != 0

def test_meta_detects_label_mismatch(pytester, trainer_suite_text):
    broken = STUB_FUNCS + "\ndef DataCollatorForCausal(tokenizer): return lambda f: {'input_ids': torch.tensor([1]), 'labels': torch.tensor([0])}"
    result = run_meta_isolated(pytester, trainer_suite_text, broken)
    result.stdout.fnmatch_lines(["*Failed Req 5*"])
    assert result.ret != 0

def test_meta_detects_missing_output_dir(pytester, trainer_suite_text):
    # This now uses the full STUB_FUNCS so patching succeeds, but main() does nothing
    broken = STUB_FUNCS + "\ndef main(): pass"
    result = run_meta_isolated(pytester, trainer_suite_text, broken)
    # Check for the specific Requirement 8 failure message
    assert any("Failed Req 8" in line for line in result.stdout.lines)
    assert result.ret != 0