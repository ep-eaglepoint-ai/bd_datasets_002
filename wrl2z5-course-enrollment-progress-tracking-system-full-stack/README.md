# WRL2Z5 - Course Enrollment & Progress Tracking System (Full-Stack)

**Category:** sft

## Overview
- Task ID: WRL2Z5
- Title: Course Enrollment & Progress Tracking System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wrl2z5-course-enrollment-progress-tracking-system-full-stack

## Requirements
- 1. User Management Users can register and log in Each user has: Name Email Role (admin, instructor, student)
- 2. Course Management Create and list courses Each course includes: Title Description Published status Only published courses are visible to students
- 3. Lesson Management Courses contain multiple lessons Lessons have: Title Order index Content (read-only) Lesson order must be preserved
- 4. Enrollment Students can enroll in courses Duplicate enrollments are not allowed Enrollment timestamp must be recorded
- 5. Progress Tracking Students can mark lessons as completed Lesson completion is immutable once recorded Course progress is derived from lesson completion Course is considered completed only when all lessons are completed
- 6. Progress History View progress per student and per course Display: Completed lessons Completion timestamps History is read-only
- 7. Authentication & Authorization Email/password authentication JWT-based authentication Role-based access: Admin: manage courses and lessons Instructor: view progress Student: enroll and complete lessons

## Metadata
- Programming Languages: Javascript, Typescript and CSS
- Frameworks: React (Vite), Node.js, Express and Tailwind CSS
- Libraries: (none)
- Databases: PostgreSQL
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
