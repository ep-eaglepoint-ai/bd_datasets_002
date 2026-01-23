# PR6U0E - adonisHierarchicalRbacWithTemporalGrants

**Category:** sft

## Overview
- Task ID: PR6U0E
- Title: adonisHierarchicalRbacWithTemporalGrants
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pr6u0e-adonishierarchicalrbacwithtemporalgrants

## Requirements
- Design and implement a Lucid database schema including tables for `roles`, `permissions`, `role_hierarchy` (self-referencing parent-child relationships), and `user_roles` (with a nullable `expires_at` column).
- Develop a `PermissionResolverService` that performs a recursive traversal of the role hierarchy to return a unique, flattened array of permission strings for a given user.
- Implement a multi-tenant scope: all roles and permission checks must be constrained by a `tenant_id` to ensure absolute data isolation between different client organizations.
- Create an AdonisJS Middleware that intercept requests, resolves the user's active permissions (including checking for expired temporal roles), and attaches them to the HTTP context for use in downstream policies.
- Implement a 'Cleanup' logic: Temporal roles must be treated as inactive immediately upon reaching their `expires_at` time. Resolution logic must explicitly filter out these roles during the permission aggregation phase.
- Authorization API: Extend the AdonisJS Bouncer implementation to allow for granular checks such as `bouncer.with('RolePolicy').allows('can_edit_invoice')` based on the resolved permission set.
- Testing (Temporal): Create a test case where a user is granted a 'Superuser' role with an expiration of 1 second. Verify that the permission check succeeds initially and fails exactly 1.1 seconds later.
- Testing (Unit): Write a test suite that constructs a 3-level deep hierarchy (Guest -> Editor -> Admin) and asserts that the 'Admin' user correctly possesses the permissions of both 'Guest' and 'Editor'. Database can be mocked for testing

## Metadata
- Programming Languages: JavaScript,TypeScript
- Frameworks: AdonisJs
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
