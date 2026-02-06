# RZ77WR - Meta-Test Suite for Validating PDF LLM Tokenizer Test

Run the following Docker commands:

```bash
docker compose run --rm app pytest repository_after/test_pdf_llm_tokenizer.py -v
docker compose run --rm app pytest tests/ -v
docker compose run --rm app python evaluation/evaluation.py
```
