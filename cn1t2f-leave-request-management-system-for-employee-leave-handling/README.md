# CN1T2F - Leave Request Management System for Employee Leave Handling

**Category:** sft

## Overview
- Task ID: CN1T2F
- Title: Leave Request Management System for Employee Leave Handling
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: cn1t2f-leave-request-management-system-for-employee-leave-handling

## Requirements
- Employees should be able to submit leave requests that include a start_date, end_date, leave_type (VACATION, SICK, UNPAID), and an optional reason. New leave requests should have a default status of PENDING upon submission.
- Employees must be able to view their own leave requests along with their remaining leave balance. Managers should be able to view all leave requests for their team or the entire company, depending on their permissions.
- Managers must have the ability to approve or reject a leave request that is in PENDING status. Once approved, the leave dates must be deducted from the employee's leave balance. Rejected requests should not affect the employee’s leave balance.
- A leave request should only reduce an employee’s leave balance if it is approved. Requests that exceed the available leave balance must be rejected, and rejected requests should never affect the leave balance.
- The system should log every state change of a leave request, including the leave_request_id, previous_status, new_status, acting_user, and timestamp. These logs must be append-only and immutable.
- The system must support concurrency, ensuring that when multiple managers attempt to approve or reject the same leave request, only one valid approval or rejection succeeds. Race conditions must be avoided to prevent double approvals or multiple deductions from the leave balance.
- Pre-seeded user roles must be implemented: Employees should have the employee role, and managers should have the manager role. These roles should determine the permissions and actions each user can perform.
- A leave request should be in a PENDING state by default when submitted. Once approved, the request cannot be modified, and once rejected, it cannot be approved again. Employees should not be able to approve or reject their own leave requests.
- The system must ensure that the leave balance of an employee never goes negative. Invalid state transitions (e.g., approving a request that exceeds the available balance) should be blocked server-side.
- The audit trail of every leave request must be complete and immutable. Any change in status (e.g., approval or rejection) must be logged, and the audit history should not allow any modification or deletion of records.
- Leave balance and state updates must be concurrency-safe. Multiple managers may attempt to approve the same leave request at the same time, but only one action should succeed. This should prevent double approvals or conflicting updates to the leave balance.
- The frontend should be built using HTML and JavaScript, while the backend should be built in Python. The database should be relational (SQLite or PostgreSQL) to store leave request data, balances, and audit logs.
- The system must be containerized using Docker to run the application locally. A Dockerfile and optional docker-compose.yml file must be provided to allow easy setup and execution.
- The application should be simple, minimal, and clear, with only the necessary features implemented to meet the business requirements. Avoid extra features or complexities.
- The application must run end-to-end successfully. It must handle edge cases such as two managers approving the same leave request simultaneously, employees attempting to approve their own leave, insufficient leave balances, and invalid state transitions.

## Metadata
- Programming Languages: HTML, Javascript and Python
- Frameworks: (none)
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
