# 608JH9 - Develop a Stand-Alone LoRA Supervised Fine-Tuning Script for Causal LLMs

**Category:** sft

## Overview
- Task ID: 608JH9
- Title: Develop a Stand-Alone LoRA Supervised Fine-Tuning Script for Causal LLMs
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 608jh9-develop-a-stand-alone-lora-supervised-fine-tuning-script-for-causal-llms

## Requirements
- Implement supervised fine-tuning (SFT) for causal language models using LoRA adapters
- Accept JSONL datasets with instruction, input, and output fields
- Train using Hugging Face Trainer with support for gradient accumulation
- Save LoRA adapter weights and tokenizer locally after training
- Provide an optional step to merge LoRA adapters into the base model
- Use only local Python libraries
- Support fp16 and bf16 precision
- Support optional 4-bit and 8-bit quantized loading
- Enable automatic device mapping with optional CPU offloading for low-VRAM systems
- Support gradient checkpointing for memory efficiency

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
