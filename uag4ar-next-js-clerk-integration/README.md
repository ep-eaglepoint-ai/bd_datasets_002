# UAG4AR - Next.js + Clerk integration

**Category:** sft

## Overview
- Task ID: UAG4AR
- Title: Next.js + Clerk integration
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: uag4ar-next-js-clerk-integration

## Requirements
- Use only the Next.js App Router approach (app/layout.tsx, app/page.tsx, etc.).
- Install and use @clerk/nextjs@latest.
- Add a proxy.ts file using clerkMiddleware() from @clerk/nextjs/server.
- Wrap the application with <ClerkProvider> inside app/layout.tsx.
- Add dedicated Sign-In and Sign-Up pages using <SignIn /> and <SignUp /> from @clerk/nextjs.
- Use catch-all routes ([[...sign-in]], [[...sign-up]]) for Clerk auth pages.
- Use Clerk UI components such as <SignInButton>, <SignUpButton>, <UserButton>, <SignedIn>, and <SignedOut> where appropriate.
- Assume Clerk automatically provides keys and do not request manual key setup unless required by official docs.

## Metadata
- Programming Languages: TypeScript
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
