# VOVB0F - color pallete tool

**Category:** sft

## Overview
- Task ID: VOVB0F
- Title: color pallete tool
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vovb0f-color-pallete-tool

## Requirements
- Create an interactive generator that produces 5-color palettes using color theory rules (complementary, analogous, triadic, split-complementary), with a "generate new" button and the ability to lock individual colors while regenerating others
- Allow users to upload an image and automatically extract the dominant colors to create a palette, showing the source image alongside the extracted colors with adjustable extraction settings (vibrant, muted, dominant)
- Provide a color picker interface where users can manually select colors, see real-time contrast ratios between colors for accessibility checking, and get suggestions for complementary colors
- Enable users to save palettes to their personal library, organize them into named collections (e.g., "Website Redesign", "Summer Vibes"), and add tags and descriptions for searchability
- Implement multiple export formats including CSS custom properties, Tailwind CSS config object, SCSS variables, JSON array, and downloadable PNG swatch image with hex codes displayed
- Create a browsable gallery of palettes that users have chosen to share publicly, with filtering by tags and color, and one-click copy or save functionality for logged-in users

## Metadata
- Programming Languages: TypeScript
- Frameworks: Nextjs
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
