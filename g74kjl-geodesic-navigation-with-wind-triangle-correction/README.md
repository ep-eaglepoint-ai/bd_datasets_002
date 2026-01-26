# G74KJL - Geodesic Navigation with Wind Triangle Correction

**Category:** sft

## Overview
- Task ID: G74KJL
- Title: Geodesic Navigation with Wind Triangle Correction
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g74kjl-geodesic-navigation-with-wind-triangle-correction

## Requirements
- The code must use the Haversine formula (using math.sin, math.cos, math.radians). Simple Euclidean distance is an automatic failure.
- The initial bearing calculation must use math.atan2 with the specific spherical components.
- The solution must calculate the difference between the "Course" (Track) and the "Heading". If Heading == Course despite the presence of a crosswind, it is a failure.
- The ground speed must be derived from the vector sum. It is not simply TAS - WindSpeed.
- Headings must be normalized to 0-360. A result of -10 degrees or 370 degrees is a failure.
- Usage of geopy, numpy, or geographiclib is prohibited.
- The code should handle the case where Wind Speed is 0 (Heading should equal Course)

## Metadata
- Programming Languages: Python 3.10+
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
