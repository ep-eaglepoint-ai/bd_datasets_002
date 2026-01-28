# 4MXRX1 - TypeScript Integration Tests for OAuth2 Authentication Flow

**Category:** sft

## Overview
- Task ID: 4MXRX1
- Title: TypeScript Integration Tests for OAuth2 Authentication Flow
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4mxrx1-typescript-integration-tests-for-oauth2-authentication-flow

## Requirements
- Authorization code flow test successfully obtains tokens. Request authorization with valid client_id and redirect_uri, receive authorization code, exchange code for access_token and refresh_token. Both tokens must be present in response and expiresIn must be 3600 seconds.
- PKCE validation rejects mismatched code_verifier. Generate valid code_verifier, create code_challenge, request authorization with challenge, then exchange code with different code_verifier. Response must be 400 with error 'invalid_grant'.
- Token refresh with valid refresh_token returns new tokens. Complete authorization flow to get initial tokens, then call token endpoint with grant_type=refresh_token. Response must contain new access_token and refresh_token different from the original tokens.
- Expired refresh token returns 401 error. Obtain refresh_token, advance time by 7 days plus 1 second, attempt to refresh. Response must be 401 with error 'invalid_grant'. Time manipulation must actually affect the service's Date.now() checks, not just mock Date objects.
- Invalid redirect_uri in authorization request returns 400. Request authorization with redirect_uri that doesn't match registered URI. Response must be 400 with error 'invalid_redirect_uri'.
- Invalid client credentials return 401 on token request. Get valid authorization code, attempt exchange with wrong client_secret. Response must be 401 with error 'invalid_client'.
- Unauthorized scope in authorization request returns 400. Request authorization with scope 'read unknown-scope' where unknown-scope is not in allowed list. Response must be 400 with error 'invalid_scope'.
- Rate limiting blocks 11th request within 60 seconds. Make 10 token requests from same client_id, verify all return non-429 status. Make 11th request, verify response is 429 with error 'rate_limit_exceeded'. Each request must actually hit the rate limiter.
- Revoked token cannot be used for refresh. Obtain tokens, call revoke endpoint with refresh_token, attempt to refresh with revoked token. Response must be 401 with error 'invalid_grant'.
- Concurrent refresh requests on same token only succeed once. Obtain refresh_token, send two simultaneous refresh requests using Promise.all. Exactly one must return 200 with new tokens, the other must return 401 because the token was already consumed.
- Authorization code reuse returns 400 error. Get authorization code, exchange it successfully once, attempt to exchange same code again. Second exchange must return 400 with error 'invalid_grant' because codes are single-use.
- Authorization code older than 10 minutes returns 400. Get authorization code, advance time by 10 minutes plus 1 second, attempt exchange. Response must be 400 with error 'invalid_grant'. Time advancement must affect the service's expiration checks.
- PKCE code_challenge without S256 method returns 400. Request authorization with code_challenge but omit code_challenge_method or use 'plain'. Response must be 400 with error 'invalid_code_challenge_method'.
- Each test must be independent with no shared state. Use beforeEach to create fresh server instance and reset rate limits. Tests must pass when run individually or in any order.
- All tests must complete in under 5 seconds total. Use fake timers or time advancement utilities for expiration tests instead of real setTimeout/sleep. Measure actual test suite execution time and verify it's under 5 seconds.

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
