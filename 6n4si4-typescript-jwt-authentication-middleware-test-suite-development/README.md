# 6N4SI4 - TypeScript JWT Authentication Middleware - Test Suite Development

**Category:** sft

## Overview
- Task ID: 6N4SI4
- Title: TypeScript JWT Authentication Middleware - Test Suite Development
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6n4si4-typescript-jwt-authentication-middleware-test-suite-development

## Requirements
- Valid tokens must pass through and attach user claims to the request. A properly signed, non-expired token should pass the authenticate middleware, call next(), and populate req.user with userId, email, roles, iat, and exp. Missing or malformed Authorization headers must return 401
- Expired tokens must be rejected with proper clock skew handling. Tokens past their expiration time should return HTTP 401 with "Token expired". However, tokens expired by up to 30 seconds should still be accepted to handle minor server time differences. Tokens expired by 31+ seconds must be rejected.
- Invalid signatures and malformed tokens must be rejected gracefully. Tampering with any JWT part (header, payload, signature) should result in 401 rejection. Invalid formats (wrong number of parts, invalid base64, non-JWT strings) should return 401 "Invalid token" without crashing the serve
- Algorithm confusion attacks (alg:none) must be prevented. Tokens with alg: "none" in the header must be rejected even if the payload is valid. Verification must explicitly whitelist only HS256, HS384, and HS512 algorithms. Tokens with future "not before" (nbf) claims must also be rejected until valid.
- Refresh tokens must be single-use with replay attack prevention. After a refresh token is used in rotateRefreshToken, any subsequent attempt to use the same token must throw "Refresh token has already been used". The token must contain a unique jti claim.
- Concurrent refresh requests must be handled correctly. When multiple requests attempt to use the same refresh token simultaneously, exactly one should succeed and the others should fail. No race condition should allow multiple successful rotations of the same token.
- Revoked tokens must be rejected regardless of expiration status. Tokens added to the blacklist via revokeToken() must fail verification with "Token has been revoked" even if they haven't expired yet. The blacklist must persist across multiple verification attempts.
- Role-based access control must restrict endpoints by required roles. The requireRoles() middleware should return 403 "Insufficient permissions" when the authenticated user lacks required roles, and 401 "Not authenticated" when req.user is undefined. Role matching must be case-sensitive.

## Metadata
- Programming Languages: Javascript
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
