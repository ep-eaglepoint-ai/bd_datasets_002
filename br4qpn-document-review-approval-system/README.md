# BR4QPN - Document Review & Approval System

**Category:** sft

## Overview
- Task ID: BR4QPN
- Title: Document Review & Approval System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: br4qpn-document-review-approval-system

## Requirements
- Document Submission: Employees must be able to submit documents, including title, description, document_type (POLICY, REPORT, CONTRACT), and content. Documents should default to the PENDING_REVIEW status upon submission.
- Document Viewing: Employees can view their own submitted documents, while managers can view all documents submitted by employees.
- Approval and Rejection: Managers can approve or reject documents in PENDING_REVIEW status. Approved documents should transition to APPROVED and become read-only, while rejected documents should transition to REJECTED and cannot be re-approved.
- State Transition Control: A document may only be approved or rejected once. Any attempt to approve or reject a document that has already been approved or rejected should be blocked by the system.
- Audit Logging: Each state change (approval or rejection) must be logged with document_id, previous_status, new_status, acting_user, and timestamp. Logs must be immutable and not editable once created.
- Role Restrictions: Employees cannot approve or reject their own documents. Managers must act on documents submitted by employees, but they cannot act on their own submissions.
- Concurrency Control: When multiple managers attempt to approve or reject the same document simultaneously, only one manager’s action should succeed, preventing race conditions and conflicting document states.
- Role-Based Access: The system must support two roles: employee (submit and view their own documents) and manager (approve/reject documents, view all documents). Permissions should be clearly defined for each role.
- Concurrency-Safe State Transitions: State transitions, including approval or rejection, must be concurrency-safe, ensuring that only one valid transition occurs at a time per document.
- Invalid Transition Blocking: Any invalid state transitions, such as trying to approve or reject a document more than once, or modifying an already approved document, must be blocked by the server.

## Metadata
- Programming Languages: HTML, Javascript, Python
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
