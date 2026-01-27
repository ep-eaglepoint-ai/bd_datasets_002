# 0AJC1Z - TechVision Pro Responsive design

**Category:** sft

## Overview
- Task ID: 0AJC1Z
- Title: TechVision Pro Responsive design
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0ajc1z-techvision-pro-responsive-design

## Requirements
- The page must be fully responsive from 320px to 2560px+ while keeping the desktop layout pixel-perfect.
- Vanilla CSS only; no frameworks, libraries, or JavaScript for layout.
- Absolute positioning remains on desktop (≥1440px); mobile/tablet must use flexbox or CSS grid.
- Navigation: horizontal on desktop, vertical stacked on mobile with 44px minimum touch targets.
- Hero section: image must appear below text on mobile using flex order or grid areas without changing HTML order.
- Pricing cards: 3 per row on desktop, 2 per row on tablet, 1 per row on mobile, with consistent gaps and fluid width calculations.
- Stats and features sections must stack vertically on mobile and expand horizontally on desktop using efficient flex/grid containers.

## Metadata
- Programming Languages: HTML, CSS
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

### 🐳 Docker Testing
Use these commands to verify implementation and responsiveness:

1. **Repository After**: 
   `docker compose run --rm test-after`
  

2. **Repository Before**: 
   `docker compose run --rm test-before`
   

3. **Run Full Evaluation**: 
   `docker compose run --rm evaluation`
   

### Local Management
- Update dependencies: Edit `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
