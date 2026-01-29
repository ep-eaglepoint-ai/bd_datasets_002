# ABAZFC - Frontend-Only Image Sharpener & Cropper Web Application

**Category:** sft

## Overview
- Task ID: ABAZFC
- Title: Frontend-Only Image Sharpener & Cropper Web Application
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: abazfc-frontend-only-image-sharpener-cropper-web-application

## Requirements
- The application shall allow users to upload an image in PNG, JPG, or WebP format.
- The application shall reject unsupported file types and display a clear error message.
- The application shall display the uploaded image in a preview area.
- The application shall allow users to crop the image using a movable and resizable crop box.
- The application shall provide aspect ratio options: Free, 1:1, 4:3, and 16:9.
- The application shall allow users to rotate the image in 90-degree increments.
- The application shall provide a sharpening intensity slider with visible real-time preview updates.
- The sharpening effect shall be applied using client-side canvas processing only.
- The application shall allow users to preview before and after sharpening results.
- The application shall allow users to select an output format: PNG, JPG, or WebP.
- The application shall allow users to adjust output image quality for JPG and WebP formats.
- The application shall allow users to download the final cropped and sharpened image.
- The application shall process all images entirely in the browser with no backend communication.
- The application shall provide a reset function that restores the original uploaded image.

## Metadata
- Programming Languages: TypeScript
- Frameworks: React
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
