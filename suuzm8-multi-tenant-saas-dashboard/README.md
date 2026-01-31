# SUUZM8 - Multi -Tenant SaaS Dashboard

**Category:** sft

## Overview
- Task ID: SUUZM8
- Title: Multi -Tenant SaaS Dashboard
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: suuzm8-multi-tenant-saas-dashboard

## Requirements
- The Organization model must auto-generate URL-safe slugs from organization names, handling duplicates by appending incrementing numbers (e.g., "acme", "acme-1", "acme-2"). Verify by creating three organizations with identical names and confirming each has a unique slug. The slug field must be indexed for fast lookups since all API routes use it as the identifie
- The OrganizationMembership model must link users to organizations with one of four roles: Owner, Admin, Member, Viewer. Each role must have a clear permission hierarchy where Owner > Admin > Member > Viewer. Verify by checking that has_permission(required_role) correctly returns True only when the user's role meets or exceeds the required level. The relationship must enforce uniqueness per user-organization pair.
- Organizations must be hard-limited to 50 active members. This constraint must be enforced at the application level in the clean() or save() method—not via database constraint since PostgreSQL CheckConstraints cannot reference aggregate counts. Verify by attempting to add a 51st member and confirming it raises a ValidationError before database insertion.
- The Invitation model must generate cryptographically secure tokens (minimum 48 bytes URL-safe) with configurable expiration (default 7 days). The is_valid() method must return False for expired or already-accepted invitations. Verify by creating an invitation, manually backdating expires_at, and confirming is_valid() returns False. The accept() method must create a membership and mark the invitation as used atomically.
- API keys must NEVER be stored in plaintext. The model must store only a SHA-256 hash of the key, with a separate key_prefix field (first 8 characters) for identification in UI. The plaintext key must be returned exactly once during creation and never retrievable afterward. Verify by querying the database directly and confirming the key_hash field contains a 64-character hex string, not the original key.
- API authentication must enforce a sliding-window rate limit of 1000 requests per hour per key. Use Redis or Django cache with hourly expiration keys. When the limit is exceeded, return HTTP 429 with a Retry-After header. Verify by making 1001 requests with the same key within one hour and confirming the 1001st returns 429.
- Create separate permission classes: IsOwner, IsAdmin, IsMember, IsOrganizationMember. Each must check the requesting user's membership and role in the organization determined from the URL (via organization_slug). Verify that a Viewer cannot POST to /organizations/{slug}/projects/ while a Member can. Permissions must not use __init__ with required arguments since DRF instantiates them at import time
- Every ViewSet handling organization-scoped resources (projects, memberships, invitations, API keys) must override get_queryset() to filter by the organization from the URL. Verify by creating two organizations with identically-named projects and confirming a user in Org A cannot see Org B's project via API, even by guessing the project ID.
- The /organizations/{slug}/dashboard/ endpoint must return aggregated metrics (total projects, active users, activity trends) cached for 5 minutes. Metrics must be computed using Django ORM aggregation (Count, TruncDate) without N+1 queries. Verify using Django Debug Toolbar or query logging that the dashboard endpoint executes fewer than 5 database queries regardless of data volume.
- When a user creates an organization via POST /organizations/, the system must automatically create an OrganizationMembership with role=Owner for that user. This must happen atomically within a database transaction. Verify by creating an organization and confirming the membership exists without a separate API call, and that a failed organization creation does not leave orphan memberships.
- Owners must be able to transfer ownership to another existing member via POST /organizations/{slug}/transfer_ownership/. The current owner must be demoted to Admin, and the target user promoted to Owner. Verify that non-owners receive 403, that transferring to a non-member fails, and that the organization always has exactly one Owner after transfer.
- The React dashboard component must render meaningful content within 2 seconds on a standard connection. Use React Query for data fetching with staleTime of 5 minutes matching backend cache. Verify using Lighthouse or browser DevTools that Time to Interactive is under 2 seconds. The dashboard must show a loading skeleton, not a blank screen, during fetch
- All timestamps must be stored in UTC in the database. The frontend must convert timestamps to the user's local timezone (from Intl.DateTimeFormat().resolvedOptions().timeZone or user profile) for display. Verify by setting the browser to a non-UTC timezone, creating a project, and confirming the displayed timestamp matches local time, not UTC.
- The frontend must include a /join/{token} route that validates the invitation token, shows organization details if valid, and allows the logged-in user to accept. If the token is expired or used, display a clear error message. Verify by using an expired token URL and confirming the UI shows "Invitation expired" rather than a generic error or blank page.
- Backend tests must cover: model validations (50-user limit, role hierarchy), permission denials (viewer creating project), invitation expiry, API key rate limiting, and ownership transfer edge cases. Run coverage report and verify the total coverage percentage is at least 80%. Each test file must include at least one test for the happy path and one for an expected failure case.

## Metadata
- Programming Languages: Python , Typescript
- Frameworks: Django , React
- Libraries: (none)
- Databases: PostgreSQL , Redis
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
