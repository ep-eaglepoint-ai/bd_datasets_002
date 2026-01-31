# A66VFY - Nested Object Configuration Validator – Test Case Generation

**Category:** sft

## Overview
- Task ID: A66VFY
- Title: Nested Object Configuration Validator – Test Case Generation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: a66vfy-nested-object-configuration-validator-test-case-generation

## Requirements
- Valid Configuration: A valid configuration should have a server object with a numeric port and a services array where each service object has a name string and an optional numeric replicas field. Ensure that the configuration with these attributes passes validation.
- Missing Server: If the server object is missing or the port is not a number, the configuration should fail validation. Implement a test case that checks for missing or incorrect server data.
- Services Not an Array: If the services field is not an array, the configuration should fail validation. Create a test case where services is of an incorrect type (e.g., an object or a string) to ensure it fails.
- Missing Service Name: If any service in the services array does not have a name field or if name is not a string, the configuration should fail validation. Implement tests to check for missing or incorrect name fields within any service.
- Non-Numeric Replicas: If a service has the replicas field and its value is not a number, the configuration should fail. Write tests to check that the validation correctly handles services with non-numeric replicas.
- Empty Services Array: If services is an empty array, the configuration should pass validation (since an empty array is still a valid array). Ensure that this case is handled correctly.
- Test Coverage for Valid Configurations: Ensure that valid configurations with different server and service structures (such as different name and replicas combinations) are tested and pass validation.
- Test Coverage for Invalid Configurations: Include test cases for each invalid scenario mentioned: missing server, incorrect services type, missing name, and non-numeric replicas.

## Metadata
- Programming Languages: Typescript
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
