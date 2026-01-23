# HS1VLM - TypeScript Language Detection Utility Bug Fix

**Category:** sft

## Overview
- Task ID: HS1VLM
- Title: TypeScript Language Detection Utility Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hs1vlm-typescript-language-detection-utility-bug-fix

## Requirements
- Empty and whitespace-only inputs must return reason 'empty' with isEnglish: false. When checkLanguage receives a string containing only spaces, tabs, or newlines, the result must have reason set to 'empty' and isEnglish set to false.
- Texts containing non-Latin characters must return reason 'non_latin' before any other classification. When input contains Arabic, Chinese, Cyrillic, or other non-Latin scripts, the function must return 'non_latin' as the reason regardless of word count. A single Arabic word like "مرحبا" must return 'non_latin', not 'too_short'.
- Texts with fewer than 5 words must return reason 'too_short' with isEnglish: false. Word counting must correctly handle multiple consecutive spaces. The input "one two three four" contains exactly 4 words and must return 'too_short', not a higher count due to empty strings from splitting.
- Pure English text must return isEnglish: true with reason 'valid'. The sentence "The quick brown fox jumps over the lazy dog" must return isEnglish: true and reason: 'valid'. No English words should trigger false positives in the non-English word detection.
- Results must be deterministic. The same input string called 3 times in sequence must return identical LanguageCheckResult objects each time. No caching or mutable state should cause different results based on previous calls or call order.
- The detectLanguage function must return null (not undefined) for empty or undetermined inputs. When detectLanguage receives whitespace-only input like " ", it must return the value null, not undefined cast to null or any other value.
- All Unicode ranges for non-Latin scripts must be correctly bounded. The NON_LATIN_REGEX must use correct Unicode range endpoints. Arabic range must end at \u06FF not \u06FE, CJK range must end at \u9FFF not \u9FFE, and Hangul range must end at \uD7AF not \uD7AE.
- The COMMON_NON_ENGLISH_WORDS array must not contain any English words. Every regex pattern in this array must match only non-English words. Common English words must not be included as they would cause false positives.
- No breaking changes to existing function signatures. The exported functions checkLanguage, isEnglish, and detectLanguage must maintain their current parameter types and return types.
- Must handle any string input without throwing exceptions. The functions must gracefully handle null-like values, empty strings, extremely long strings, and strings with special characters without throwing runtime errors.
- Only franc-min is permitted as external dependency. No additional npm packages may be added to solve the language detection requirements.
- All validation scenarios must pass: "The quick brown fox jumps over the lazy dog" → isEnglish: true, reason: 'valid' " " (whitespace only) → isEnglish: false, reason: 'empty' "one two three four" (4 words with extra spaces) → reason: 'too_short' "مرحبا" (single Arabic word) → reason: 'non_latin' (not 'too_short') Same input called 3 times must return identical results each time detectLanguage(" ") → null (not undefined)

## Metadata
- Programming Languages: Typescript
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
