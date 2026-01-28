# QSU5P6 - Create a PyTest Test Suite for the LoRA SFT Trainer Script

**Category:** sft

## Overview
- Task ID: QSU5P6
- Title: Create a PyTest Test Suite for the LoRA SFT Trainer Script
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qsu5p6-create-a-pytest-test-suite-for-the-lora-sft-trainer-script

## Requirements
- The test must verify that the JSONL dataset reader correctly loads multiple records and ignores empty lines.
- The test must validate that the prompt-building function correctly formats SYSTEM, INSTRUCTION, INPUT, and RESPONSE sections.
- The test must ensure that the Hugging Face Dataset is created correctly and contains a text column used for causal language modeling.
- The test must confirm that the causal data collator returns input_ids, attention_mask, and labels tensors with matching shapes.
- The test must check that labels are an exact copy of input_ids (causal LM training behavior).
- The test must include a smoke test for the main() function that runs without downloading real models or performing training.
- The test must mock or monkeypatch Hugging Face model loading, tokenizer loading, and the Trainer training loop.
- The test must verify that the output directory is created when the trainer runs.
- The test must run successfully on a CPU-only machine with limited memory.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
