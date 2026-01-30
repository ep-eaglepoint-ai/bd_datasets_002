# Trajectory

1. Understood the problem thoroughly, especially the requirement that everything must run locally and be self-sufficient.
2. Reviewed the remaining requirements and identified the libraries to use (PyTorch, Transformers, Datasets, PEFT, Accelerate, optional BitsAndBytes).
3. Read about LoRA and how it works from the following IBM material: https://www.ibm.com/docs/en/watsonx/w-and-w/2.1.0?topic=tuning-lora-fine
4. Identified how to simulate a model for testing to avoid large models: used a tiny GPT-2 style model built from a minimal `GPT2Config` and a local `WordLevel` tokenizer to keep everything offline and fast. Reference: https://huggingface.co/docs/transformers/model_doc/gpt2
5. Wrote comprehensive tests that cover the listed requirements, including prompt formatting, JSONL ingestion, LoRA training outputs, precision/quantization support, device mapping, and gradient controls.
6. Wrote the evaluation runner to execute tests in a container and emit a JSON report.
