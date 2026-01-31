# Feature Flag Management System - Trajectory

## 1. Problem Statement

Based on the prompt/requirement, I identified the core problem: **Modern applications need a safe and flexible way to release features without redeploying code**. The requirement stated that enabling a feature for all users at once increases the risk of bugs, outages, and poor user experience. Teams also need the ability to test features with specific users, gradually roll out changes, and instantly disable problematic functionality.

The project required building a centralized Feature Flag Management System that addresses these challenges by providing:
- Controlled feature releases
- User-specific overrides
- Percentage-based rollouts
- A secure, backend-driven architecture with a minimal administrative interface

Based on the prompt/requirement, I identified this as a classic feature flag management problem similar to systems like LaunchDarkly or Split, but requiring a custom implementation suitable for a SaaS backend.

## 2. Requirements

Based on the prompt/requirement, I identified these functional requirements that the system must meet:

1. **User authentication with role-based access** - The system needed to distinguish between admin and regular users
2. **Admin CRUD operations for feature flags** - Create, update, delete functionality
3. **Feature flag attributes** - Each flag must have a unique key, description, global enabled toggle, and percentage-based rollout (0-100)
4. **Per-user overrides** - These must take priority over all other rules
5. **Deterministic flag evaluation** - Same user must consistently receive the same flag result
6. **Single endpoint for evaluated flags** - Return all evaluated flags for the logged-in user in one request
7. **Audit logging** - Track all feature flag changes
8. **Minimal admin interface** - Login, flags list, flag detail/edit, and user lookup pages

## 3. Constraints

Based on the prompt/requirement, I identified these technical constraints:

1. **Technology stack** - Must use Next.js with App Router and TypeScript
2. **Database** - Must use a relational database with clear schema design and indexes
3. **Security** - APIs must be secure with proper authentication and authorization
4. **Clean architecture** - Production-ready patterns suitable for SaaS backend
5. **UI constraints** - Frontend should be intentionally minimal

## 4. Research and Resources

During the design phase, I researched the following concepts and patterns:

### 4.1 Feature Flag Concepts

- **Percentage-based rollouts**: I studied how services like LaunchDarkly implement gradual rollouts using consistent hashing
- **User targeting**: I researched patterns for per-user flag overrides that always take priority
- **Deterministic evaluation**: I investigated hashing algorithms for consistent flag results

### 4.2 Next.js Patterns

- **App Router**: I reviewed Next.js 13+ App Router patterns for server actions and API routes
- **Authentication**: I studied JWT-based authentication with role-based access control
- **Middleware**: I explored Next.js middleware for request authentication

### 4.3 Database Design

- **Prisma ORM**: I researched Prisma schema patterns for relational models
- **Indexes**: I studied optimal indexing strategies for query performance
- **Cascading deletes**: I explored foreign key constraints for data integrity

### 4.4 Key Resources Referenced

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT.io](https://jwt.io/) - For token verification
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - For password hashing

## 5. Choosing Methods and Why

### 5.1 Database Selection: PostgreSQL with Prisma

I chose PostgreSQL as the relational database because:
- It provides ACID compliance essential for audit logging
- It supports complex queries for flag evaluation
- It's production-ready and widely used in SaaS applications

I selected Prisma as the ORM because:
- It provides type-safe database access with TypeScript
- It has excellent migration support
- Its schema definition is clear and declarative

### 5.2 Authentication: JWT with bcrypt

I chose JWT (JSON Web Tokens) for authentication because:
- It's stateless and scales well
- It can include user roles in the token payload
- It's widely supported and secure when properly implemented

I chose bcrypt for password hashing because:
- It's computationally expensive to prevent brute force attacks
- It includes salt automatically to prevent rainbow table attacks
- It's the industry standard for password storage

### 5.3 Rollout Algorithm: SHA-256 Hashing

I chose SHA-256 hashing for deterministic rollouts because:
- It's cryptographically secure and produces uniform distribution
- It can be implemented with Node.js built-in crypto module
- The hash is deterministic: `hash(userId + flagKey)` always produces the same result

The algorithm works by:
1. Concatenating userId and flag key: `${userId}:${flag.key}`
2. Creating a SHA-256 hash
3. Converting the first 8 hex characters to an integer (0-4,294,967,295)
4. Taking modulo 100 to get a percentage (0-99)
5. Adding 1 to get 1-100 range
6. Comparing against the flag's rollout percentage

### 5.4 Priority Order for Flag Evaluation

I chose this evaluation priority order because:
1. **User override first** - Admin decisions for specific users must take precedence
2. **Global disabled check** - If flag is globally off, no one gets it
3. **Rollout 0 check** - Optimization for common case
4. **Rollout 100 check** - Optimization for full enablement
5. **Deterministic rollout** - For gradual rollouts

This order ensures that admin overrides always work, while providing efficient short-circuiting### for common cases.

 5.5 API Design: REST with Bearer Tokens

I chose REST APIs with Bearer token authentication because:
- It's simple and intuitive
- It integrates well with Next.js App Router
- It supports all required operations (CRUD, evaluation)

## 6. Solution Implementation and Explanation

### 6.1 Database Schema Design

Based on the requirements, I designed the Prisma schema with four models:

**User Model**: Stores authentication data and roles
- `id`, `email`, `password`, `role` (ADMIN/USER)
- Relations to overrides and audit logs
- Index on email for fast lookups

**FeatureFlag Model**: Stores flag configuration
- `id`, `key` (unique), `description`, `enabled`, `rolloutPercentage`
- Relations to overrides and audit logs
- Indexes on key (unique lookup) and enabled (filtering)

**UserOverride Model**: Stores per-user flag overrides
- `id`, `userId`, `flagId`, `enabled`
- Unique constraint on `[userId, flagId]` ensures one override per user per flag
- Cascade delete for data integrity

**AuditLog Model**: Tracks all flag changes
- `id`, `userId`, `flagId`, `action`, `oldValue`, `newValue`, `timestamp`
- Stores JSON for flexible old/new value storage
- Indexes on userId, flagId, timestamp, and action for filtering

### 6.2 Authentication Implementation

I implemented authentication in `src/lib/auth.ts`:

**Password hashing**: Used bcrypt with 12 rounds for secure storage

**JWT generation**: Created tokens with user id, email, and role, expiring in 24 hours

**Token verification**: Implemented JWT verification with proper error handling

**User authentication**: Combined password verification with database lookup

### 6.3 Middleware Authentication

I created `src/lib/middleware.ts` with a `withAuth` wrapper:
- Extracts Bearer token from Authorization header
- Verifies token and attaches user to request
- Supports optional role checking for authorization

### 6.4 Feature Flag Evaluation

I implemented the core evaluation logic in `src/lib/featureFlags.ts`:

```typescript
export function evaluateFlagForUser(flag: any, userId: string): boolean {
  // Check for user override first (highest priority)
  const override = flag.overrides?.find((o: any) => o.userId === userId);
  if (override) {
    return override.enabled;
  }

  // If flag is globally disabled, return false
  if (!flag.enabled) {
    return false;
  }

  // If rollout percentage is 0, return false
  if (flag.rolloutPercentage === 0) {
    return false;
  }

  // If rollout percentage is 100, return true
  if (flag.rolloutPercentage === 100) {
    return true;
  }

  // Deterministic rollout based on userId and flag key
  const hash = crypto.createHash('sha256').update(`${userId}:${flag.key}`).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const percentage = (hashInt % 100) + 1; // 1-100

  return percentage <= flag.rolloutPercentage;
}
```

### 6.5 API Routes Implementation

I implemented RESTful API routes for all operations:

**Authentication APIs**:
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/logout` - Token invalidation (client-side)
- `GET /api/auth/me` - Get current user info

**Flag APIs**:
- `GET /api/flags` - List all flags (admin)
- `POST /api/flags` - Create new flag (admin)
- `GET /api/flags/[id]` - Get flag details (admin)
- `PUT /api/flags/[id]` - Update flag (admin)
- `DELETE /api/flags/[id]` - Delete flag (admin)
- `GET /api/flags/evaluate` - Get evaluated flags for current user

**Override APIs**:
- `GET /api/flags/[id]/overrides` - List overrides for a flag (admin)
- `POST /api/flags/[id]/overrides` - Create override (admin)
- `DELETE /api/flags/[id]/overrides/[overrideId]` - Delete override (admin)

**Audit APIs**:
- `GET /api/audit` - List audit logs with filtering (admin)

Each API validates inputs, checks authorization, performs database operations, and logs audit entries.

### 6.6 Frontend Implementation

I built minimal admin pages using Next.js App Router and Tailwind CSS:

- `/login` - Login form
- `/flags` - List of all feature flags
- `/flags/[id]` - Flag detail with edit form
- `/flags/[id]/overrides/new` - Create user override
- `/users` - List of users
- `/users/[id]` - User detail with their overrides
- `/audit` - Audit log viewer

## 7. Handling Requirements, Constraints, and Edge Cases

### 7.1 Requirements Handling

| Requirement | Implementation |
|-------------|----------------|
| User authentication with roles | JWT tokens with ADMIN/USER roles, bcrypt password hashing |
| Admin CRUD for flags | REST APIs with role-based middleware protection |
| Unique key and description | Prisma unique constraint on key, required fields in schema |
| Global enable/disable | `enabled` boolean field on FeatureFlag model |
| Percentage rollout 0-100 | `rolloutPercentage` integer field with 0-100 validation |
| Per-user overrides | UserOverride model with unique constraint, checked first in evaluation |
| Deterministic evaluation | SHA-256 hashing of userId:flagKey for consistent results |
| Single endpoint for flags | `GET /api/flags/evaluate` returns all flags for logged-in user |
| Admin interface | Minimal pages for flag and user management |
| Audit logging | AuditLog model capturing all flag changes with old/new values |

### 7.2 Constraints Handling

| Constraint | Implementation |
|------------|----------------|
| Next.js App Router | All pages and APIs use App Router patterns |
| TypeScript | Full type safety with Prisma generated types |
| PostgreSQL | Configured in docker-compose.yml, Prisma schema uses postgresql provider |
| Clean architecture | Separation of concerns: lib/ for utilities, app/api/ for routes |
| Secure APIs | Authentication middleware on all protected routes |
| Minimal UI | Simple Tailwind-styled pages without complex components |

### 7.3 Edge Cases Handled

**Edge Case 1: Rollout percentage at boundaries**
- If `rolloutPercentage === 0`, immediately return false (optimization)
- If `rolloutPercentage === 100`, immediately return true (optimization)
- This avoids unnecessary hash computation for common cases

**Edge Case 2: User override priority**
- User overrides are checked first in evaluation logic
- This ensures admin can always force a flag state for specific users
- Works regardless of global flag state or rollout percentage

**Edge Case 3: Hash collision handling**
- SHA-256 produces uniform distribution across 0-4 billion values
- Taking only first 8 hex characters gives 32-bit integer (0 to 4,294,967,295)
- Modulo 100 provides percentage distribution with acceptable variance
- No practical collision issues for feature flag use cases

**Edge Case 4: Concurrent flag updates**
- Prisma transactions ensure atomic flag updates
- Audit logs are created within the same request for consistency
- Optimistic locking could be added for high-contention scenarios

**Edge Case 5: Invalid token handling**
- Middleware returns 401 for missing or invalid tokens
- Auth APIs handle expired tokens gracefully
- User lookup failsafe prevents issues with deleted users

**Edge Case 6: Database connection failures**
- Prisma client is instantiated per-request to avoid connection pooling issues
- Error handling returns appropriate 500 responses
- Docker health checks monitor database connectivity

**Edge Case 7: Rollout percentage validation**
- API validates 0-100 range before database operations
- Prisma could add database-level check constraint for additional safety
- Frontend form prevents invalid inputs

**Edge Case 8: Unique key constraint violations**
- Database unique constraint prevents duplicate flag keys
- API returns 400 error with clear message
- User can retry with different key

### 7.4 Production Considerations

The implementation includes several production-ready patterns:

- **Environment variables**: JWT_SECRET and DATABASE_URL from .env
- **Password hashing**: bcrypt with 12 rounds for security
- **Token expiration**: 24-hour token lifetime
- **Error handling**: Consistent error responses across APIs
- **Input validation**: Server-side validation of all inputs
- **Audit logging**: Complete history of flag changes
- **Index optimization**: Database indexes for common query patterns
- **Cascading deletes**: Automatic cleanup of related records
- **Docker support**: docker-compose.yml for easy deployment

The solution is suitable for a SaaS backend as specified in the requirements, with clean architecture, secure APIs, and production-ready patterns.
