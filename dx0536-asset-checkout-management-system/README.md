# DX0536 - Asset Checkout Management System

**Category:** sft

## Overview
- Task ID: DX0536
- Title: Asset Checkout Management System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: dx0536-asset-checkout-management-system

## Requirements
- Asset Definition: Pre-seed assets with the following details: name, asset_type (LAPTOP, MONITOR, TOOL), and status (AVAILABLE, CHECKED_OUT).
- Checkout Request Submission: Employees can submit a checkout request for an asset, including asset_id and an optional note. Requests default to PENDING status.
- Asset & Request Viewing: Employees can view available assets and their own checkout requests. Managers can view all assets and all checkout requests across employees.
- Checkout Actions: Managers can approve or reject PENDING checkout requests. Once approved, the asset's status changes to CHECKED_OUT, and it is assigned to the employee who requested it. Invalid actions, like approving a checked-out asset, must be rejected by the server.
- Asset Return: Managers can mark a CHECKED_OUT asset as RETURNED. Returned assets become AVAILABLE again and cannot be returned more than once.
- Concurrency Control: Only one checkout request can be approved for a given asset at a time. The system must prevent conflicting actions, such as multiple approvals for the same asset.
- Audit Logging: Every state change (e.g., asset checkout, asset return, request approval/rejection) must be logged with the following details: entity_type (ASSET or REQUEST), entity_id, previous_status, new_status, acting_user, and timestamp. Logs must be append-only and immutable.
- Invalid Action Handling: Invalid actions, such as trying to approve a request for an asset that is already checked out, should be rejected server-side, ensuring data integrity.
- Role-based Permissions: The system should have two roles: employee (who can submit and view their own requests) and manager (who can approve/reject requests, view all assets and requests).

## Metadata
- Programming Languages: HTML, Javasript , Python
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
