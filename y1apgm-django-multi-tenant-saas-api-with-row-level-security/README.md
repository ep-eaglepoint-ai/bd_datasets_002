# Y1APGM - Django Multi tenant SaaS API with Row Level Security

**Category:** sft

## Overview
- Task ID: Y1APGM
- Title: Django Multi tenant SaaS API with Row Level Security
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: y1apgm-django-multi-tenant-saas-api-with-row-level-security

## Requirements
- Application starts successfully. Run `python manage.py check` and `python manage.py runserver`. The server must start without errors and respond to requests.
- API key authentication allows service-to-service calls. Create an API key for an organization, then make a request with the key in the header. The request must authenticate successfully and return data scoped to that organization.
- Tenant context is isolated per request. Make two concurrent requests from different organizations. Each request must only see its own organization's data, with no cross-contamination between requests.
- Queries automatically filter by current tenant. When authenticated as Org A, calling `Project.objects.all()` must return only Org A projects without any explicit filter in the view code.
- User in Organization A cannot access Organization B resources. Authenticate as Org A user, attempt to GET a project belonging to Org B by ID. Response must be 404 Not Found.
- Deleted records are hidden from normal API responses. Soft-delete a project, then GET the projects list. The deleted project must not appear in results.
- Deleted records can be restored by administrators. Soft-deleted records must remain in database and be recoverable. Admin endpoint or management command must be able to restore them.
- Audit logs cannot be modified or deleted after creation. Attempt to update or delete an audit log record via ORM. The operation must fail with an exception.
- Audit logs record what changed on each update. Update a project's name, check the audit log entry. The log must show both the old value and new value for the changed field.
- Viewer role has read-only access. Authenticate as Viewer, attempt POST to create a project. Request must be rejected with 403 Forbidden.
- Member role can manage tasks but not projects. Authenticate as Member, create a task (should succeed), attempt to create a project (should fail with 403).
- Admin role can manage projects, tasks, and team members. Authenticate as Admin, create a project, invite a new member to organization. Both operations must succeed.
- Owner role has full access including organization settings. Authenticate as Owner, update organization name and billing plan. Both operations must succeed.
- Pagination handles large datasets efficiently. Create 1000 projects, request the list endpoint. Response must include pagination cursors and return results in reasonable time without memory issues.
- Related data loads without N+1 queries. Request a list of projects with their owners. Database query count must be constant (2-3 queries), not proportional to the number of projects.

## Metadata
- Programming Languages: Python
- Frameworks: Django
- Libraries: (none)
- Databases: Postgress
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
