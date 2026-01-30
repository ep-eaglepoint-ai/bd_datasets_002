# S8A2KP - health-care-platform

**Category:** sft

## Overview
- Task ID: S8A2KP
- Title: health-care-platform
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: s8a2kp-health-care-platform

## Requirements
- Build a comprehensive patient portal with secure registration including identity verification, insurance information capture with card scanning, medical history questionnaires, consent form management with electronic signatures, and family member account linking for dependents
- Create a sophisticated scheduling system where providers can define complex availability patterns (recurring schedules, time-off, lunch breaks), appointment type durations, buffer times between appointments, and overbooking rules, with automatic conflict detection and resolution suggestions
- Implement an intelligent booking system with real-time availability display, appointment type selection (new patient, follow-up, procedure, telehealth), provider and location filtering, waitlist management with automatic notification when slots open, and appointment reminders via SMS, email, and push notifications
- Develop a HIPAA-compliant video consultation feature with virtual waiting room, provider controls for admitting patients, screen sharing for reviewing test results, session recording with consent, automatic session notes generation, and fallback to phone call if video quality degrades
- Build an e-prescribing module integrated with pharmacy networks, supporting new prescriptions, refill requests, medication interaction checking, patient medication history, pharmacy selection, and controlled substance prescribing with required validations and DEA compliance
- Create a patient-facing medical records viewer displaying visit summaries, lab results with reference ranges and trend charts, imaging reports, immunization records, and the ability to download records in standard formats (CCDA, PDF) or share with other providers via secure health information exchange
- Implement an encrypted messaging system between patients and care teams with message categorization (medical question, appointment request, prescription refill), auto-routing based on message type, response time tracking, attachment support for photos and documents, and audit logging for compliance
- Develop billing functionality including insurance eligibility verification, co-pay calculation and collection at booking, claim generation with proper coding, payment plan options, and integration with clearinghouses for claim submission and status tracking
- Build comprehensive dashboards for practice administrators showing appointment utilization rates, no-show patterns with prediction, revenue metrics, patient satisfaction scores, provider productivity, and population health metrics with the ability to generate compliance reports

## Metadata
- Programming Languages: TypeScript
- Frameworks: React, React Query
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
