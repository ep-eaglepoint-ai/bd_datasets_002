#### Analysis
I deconstructed the prompt into four critical engineering pillars:
*   **Data Pipeline:** Validating `read_jsonl` handles "dirty" inputs (empty lines).
*   **Pedagogical Texture:** Ensuring the `build_prompt` strictly adheres to the engineering assistant persona.
*   **Mathematical Contract:** Verifying the Causal LM identity mapping (`labels == input_ids`).
*   **Orchestration:** Confirming `main()` initiates the `Trainer` lifecycle without GPU/Network side effects.

#### Strategy
*   **Mocking for Hermetic Builds:** Used `unittest.mock.patch` to simulate `AutoModel` and `Trainer`. This isolates the logic from heavy dependencies, satisfying the CPU-only/limited memory constraint.
*   **Adversarial Meta-Testing:** Employed the **"Evaluating the Evaluator"** pattern (Module 5.3). By feeding the test suite "broken" implementation stubs, I proved the tests can catch specific logic regressions (e.g., shifted labels or missing persona tags).
*   **Defensive Type-Safety:** Followed the "Senior Systems Engineer" pattern by using explicit type hinting and `Decimal`-style normalization for string parsing.

#### Execution
1.  **Environment Isolation:** Defined dynamic `SRC_PATH` resolution to ensure portability within the Docker container.
2.  **Stub Implementation:** Created a `STUB_FUNCS` library to provide consistent interfaces for adversarial testing.
3.  **Subprocess Verification:** Implemented `run_meta_isolated` using `pytester` in a subprocess. This prevents `torch` C-extension conflicts and re-initialization errors.
4.  **Smoke Testing:** Mocked `TrainingArguments` to bypass library-specific `TypeError` regressions (handling `evaluation_strategy` updates).

#### Resources
*   [Hugging Face: Fine-tuning with PEFT](https://huggingface.co/docs/peft/conceptual_overview/lora) — Conceptual foundation of LoRA.
*   [PyTest: runpytest_subprocess](https://docs.pytest.org/en/stable/reference/reference.html#pytester-runpytest-subprocess) — Standard for isolated meta-testing.
*   [YouTube: Mocking and Patching in Python (Corey Schafer)](https://www.youtube.com/watch?v=6tNS--WetLI) — Guide for isolating complex dependencies.
*   [Hugging Face: Causal Language Modeling](https://huggingface.co/docs/transformers/tasks/language_modeling) — Defining the label contract.