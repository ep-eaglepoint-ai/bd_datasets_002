# Trajectory (problem-focused)

I started by running the same requirements-driven checks against **`repository_before`** so I could reproduce the failures and lock the expected behavior.

Then I fixed the implementation  by making these targeted changes in the language detection logic:

- **Empty / whitespace handling**: trim first, and if the trimmed text is empty return `reason: 'empty'`.
- **Non‑Latin precedence**: run non‑Latin detection before the “too short” word-count rule, so inputs like Arabic are classified as `non_latin` even if they’re only one word.
- **Correct word counting**: count words using `trim()` + split on `/\s+/` and ignore empty segments so multiple spaces don’t inflate the count.
- **`detectLanguage` return type**: return `null` (never `undefined`) for empty/whitespace and for undetermined (`'und'`) results.
- **Unicode bounds**: fix `NON_LATIN_REGEX` range endpoints to include `\u06FF`, `\u9FFF`, and `\uD7AF`.
- **Avoid false positives**: remove English tokens from `COMMON_NON_ENGLISH_WORDS` (e.g. `an`, `the`) so English text isn’t incorrectly flagged.
- **Deterministic caching**: only reuse the cached result on an **exact input match** (no prefix matching).

At the end, I reran the full requirement set on the updated implementation and **every requirement passed**.
