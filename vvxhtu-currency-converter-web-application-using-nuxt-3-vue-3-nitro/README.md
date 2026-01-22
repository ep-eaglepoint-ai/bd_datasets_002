# VVXHTU - currency converter web application using Nuxt 3 (Vue 3 + Nitro)

**Category:** sft

## Overview
- Task ID: VVXHTU
- Title: currency converter web application using Nuxt 3 (Vue 3 + Nitro)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vvxhtu-currency-converter-web-application-using-nuxt-3-vue-3-nitro

## Requirements
- The app must allow users to convert between fiat currencies with a clear base/reference model, supporting selection of “from” and “to” currencies, swap, favorites, and searchable currency lists, while preventing invalid or empty currency codes, blocking unsupported pairs, gracefully handling missing rates, and ensuring the UI never displays stale results without a visible “last updated” indicator.
- The system must fetch exchange-rate data through a Nuxt 3 server API (Nitro) layer and never directly from the client, enforcing rate-source integrity, network timeouts, retry/backoff, and tamper-resistant response shaping, while rejecting malformed upstream payloads, preventing SSRF-style URL injection, applying strict caching rules (TTL + ETag/If-Modified-Since where supported), and ensuring deterministic behavior when the provider is unreachable or returns partial rate tables.
- All currency calculations must be performed using arbitrary-precision decimal math (no floating-point for conversion), preserving input and rates as strings until computation, while rejecting invalid numeric formats, preventing negative amounts unless explicitly allowed via configuration, handling extremely large numbers without overflow, and applying correct per-currency minor-unit rounding with configurable strategies (HALF_UP by default), including edge cases like zero-decimal and three-decimal currencies and currencies that are not present in the minor-unit map.
- The app must support cross-rate conversion through a canonical base currency (e.g., EUR) and compute A→B using rB/rA, while preventing divide-by-zero, handling cases where either currency rate is missing, ensuring results remain stable when rates update mid-session, and providing optional “lock rate” mode to freeze the rate used for a conversion to support auditing and repeatability.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Nuxt 3
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
