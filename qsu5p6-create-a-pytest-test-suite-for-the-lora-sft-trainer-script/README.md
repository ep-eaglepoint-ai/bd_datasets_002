# QSU5P6 - Create a PyTest Test Suite for the LoRA SFT Trainer Script

## Commands

### Test repository_before/

docker compose run --rm \
  -e TEST_SUITE_PATH=repository_before/my_lora_project/tests/test_lora_sft.py \
  app sh -c "pytest tests/test_trainer_meta.py || exit 0"

### Test repository_after


docker compose run --rm \
  -e TEST_SUITE_PATH=repository_after/tests/test_lora_sft.py \
  app pytest tests/test_trainer_meta.py

### Generate evaluation report

  docker compose run --rm app python3 evaluation/evaluation.py