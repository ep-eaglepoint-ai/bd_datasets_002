# SGM01W - NuxtPreferenceManagerWithNitro

**Category:** sft

## Overview
- Task ID: SGM01W
- Title: NuxtPreferenceManagerWithNitro
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sgm01w-nuxtpreferencemanagerwithnitro

## Requirements
- Define a strict Zod schema for a 'UserPreferences' object containing 'theme' (enum: light, dark, system, high-contrast), 'language' (string), and 'sidebarCollapsed' (boolean).
- Implement a Nuxt 3 composable `useUserPreferences` that handles the reactive state and provides an `updatePreference` method with optimistic UI updates.
- Isomorphic Implementation: Develop a Nitro server middleware or Nuxt plugin that reads the 'theme' preference from a Cookie and applies the appropriate class to the <html> tag during the SSR phase to prevent hydration flicker.
- Backend Integration: Create a Nitro API route `POST /api/settings/sync` that validates payloads with Zod and persists them to an in-memory database store (a global variable or a basic Map in the Nitro context is acceptable for this task).
- Cross-Tab Reactivity: Use the browser 'storage' event or a `BroadcastChannel` to ensure that a preference change in one tab is reflected in all other open instances of the application immediately.
- Schema-First Defense: Any data retrieved from Cookies or LocalStorage must be parsed through the Zod schema. If validation fails, the system must log the error, clear the corrupted storage, and reset to the defined default state.
- Theme Strategy: The 'system' theme option must utilize CSS media queries (`prefers-color-scheme`) but allow for manual overrides that persist in the UserPreferences object.
- Unit Test (SSR Context): Use Vitest to verify that the server-side initialization logic correctly parses a mock cookie string and returns the expected state object.
- Unit Test (Reactivity): Verify that calling `updatePreference` on the client triggers both a synchronous update to the reactive state and an asynchronous fetch request to the Nitro API.
- Unit Test (Validation): Provide a test case where a malformed JSON string is passed to the state initializer; assert that the Zod validation catches the error and the system falls back to the default preferences.

## Metadata
- Programming Languages: TypeScript, JavaScript
- Frameworks: Nuxt3, Nitro
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
