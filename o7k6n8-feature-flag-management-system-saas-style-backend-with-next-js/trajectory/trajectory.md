# Trajectory: Feature Flag Management System (SaaS-Style Backend with Next.js)


## 1. Problem Statement

The prompt says: Modern applications need a safe and flexible way to release features without redeploying code. Enabling a feature for all users at once increases the risk of bugs, outages, and poor user experience. Teams also need the ability to test features with specific users, gradually roll out changes, and instantly disable problematic functionality.

I needed to build a centralized Feature Flag Management System that allows controlled feature releases, user-specific overrides, and percentage-based rollouts through a secure, backend-driven architecture with a minimal administrative interface.

---

## 2. Requirements

The prompt says: The system must meet these criteria:

1. **User authentication with role-based access** - Admin and user roles with different permissions
2. **Admin CRUD operations for feature flags** - Create, update, delete flags with unique keys and descriptions
3. **Global enable/disable toggle** - Each flag must have a global enabled/disabled state
4. **Percentage-based rollout (0-100%)** - Gradual feature rollout to a percentage of users
5. **Per-user overrides** - Admins can enable/disable flags for specific users, taking priority over all other rules
6. **Deterministic flag evaluation** - Same user must consistently receive the same flag result
7. **Single endpoint for evaluated flags** - Return all evaluated flags for the logged-in user in one request
8. **Audit logging** - Track all feature flag changes with who made the change and when

---

## 3. Constraints

I identified these technical constraints:

1. **Technology Stack**: Next.js (App Router) with TypeScript
2. **Database**: Relational database required with clear schema design and indexes
3. **Authentication**: JWT-based with role checking
4. **API Design**: RESTful endpoints with server-side evaluation
5. **Frontend**: Minimal admin-style interface (login, flags list, flag detail/edit, user lookup)

---

## 4. Research and Resources

I researched the following resources to understand feature flag best practices and implementation patterns:

### Documentation and Articles
- [Prisma ORM Documentation](https://www.prisma.io/docs) - For database schema design and ORM patterns
- [Next.js App Router Documentation](https://nextjs.org/docs/app) - For server-side API routes and middleware
- [JWT Official Documentation](https://jwt.io/) - For secure token-based authentication
- [Bcrypt Documentation](https://www.npmjs.com/package/bcryptjs) - For password hashing
- [Feature Flag Best Practices (LaunchDarkly Blog)](https://launchdarkly.com/blog/) - For understanding rollout strategies

### Key Concepts Researched
- **Deterministic Hashing**: I researched how to implement consistent user bucketing using SHA-256 hashing of `userId:flagKey` to ensure the same user always gets the same result for a given flag.
- **Priority Order**: I studied how user overrides should take precedence over percentage rollouts, which should take precedence over global enable/disable.
- **Cascading Deletes**: I learned how Prisma handles cascade deletes for maintaining referential integrity when flags or users are deleted.

---

## 5. Choosing Methods and Why

### Database Choice: PostgreSQL with Prisma ORM

I chose PostgreSQL because the prompt requires a relational database, and I needed strong consistency for audit logs and user overrides. I selected Prisma ORM because it provides type-safe database access and clean schema definitions.

I chose this over raw SQL because Prisma's schema syntax makes the database structure self-documenting, and the generated TypeScript types ensure compile-time safety across the entire codebase.

### Authentication: JWT with bcrypt Password Hashing

I implemented JWT-based authentication because it allows stateless session management, which scales well for API-centric applications. I used bcrypt with 12 rounds for password hashing because it provides strong protection against rainbow table attacks while being computationally feasible.

I chose this combination because JWTs can be easily validated on each request without database lookups, while bcrypt ensures passwords are never stored in plain text.

### Rollout Algorithm: SHA-256 Hashing

I implemented deterministic rollout using SHA-256 hashing of `${userId}:${flagKey}`. I chose this approach because:

1. **Consistency**: The same user will always get the same hash value for the same flag, ensuring consistent behavior across requests.
2. **Distribution**: Hash values are uniformly distributed, so a 50% rollout will approximately target half of all users.
3. **Simplicity**: No external dependencies or complex data structures are needed—just a single hash operation.

I chose SHA-256 over MD5 because it's cryptographically secure and widely supported, even though MD5 would also work for this purpose.

### Middleware Pattern: Higher-Order Function

I implemented authentication middleware as a higher-order function (`withAuth`) that wraps route handlers. I chose this pattern because it keeps authentication logic DRY and allows per-route role requirements to be specified declaratively.

This approach works because the wrapper function extracts the JWT from the Authorization header, validates it, checks role requirements, and then calls the original handler with the authenticated user attached to the request.

---

## 6. Solution Implementation and Explanation

### Database Schema Design

I designed the schema with four models: User, FeatureFlag, UserOverride, and AuditLog.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  overrides UserOverride[]
  auditLogs AuditLog[]
}
```

I created the User model first because it serves as the foundation for authentication and authorization. The unique email constraint ensures no duplicate accounts can exist, and the default USER role provides a safe fallback.

```prisma
model FeatureFlag {
  id                String   @id @default(cuid())
  key               String   @unique
  description       String
  enabled           Boolean  @default(false)
  rolloutPercentage Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  overrides UserOverride[]
  auditLogs AuditLog[]
}
```

I created the FeatureFlag model with a unique key constraint because flag keys are the primary identifier used by client applications. The default `enabled: false` and `rolloutPercentage: 0` ensure new flags are off by default until explicitly enabled.

```prisma
model UserOverride {
  id        String      @id @default(cuid())
  userId    String
  flagId    String
  enabled   Boolean
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  flag FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)

  @@unique([userId, flagId])
}
```

I created the UserOverride model with a composite unique constraint because each user should have at most one override per flag. The cascade delete ensures that when a user or flag is deleted, their associated overrides are automatically removed.

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  flagId    String
  action    String   // 'CREATE', 'UPDATE', 'DELETE'
  oldValue  Json?    // Store old flag data as JSON
  newValue  Json?    // Store new flag data as JSON
  timestamp DateTime @default(now())

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  flag FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)
}
```

I created the AuditLog model with JSON fields for oldValue and newValue because flag structures may evolve over time, and JSON preserves the complete state without requiring schema migrations.

### Authentication Implementation

I implemented authentication in `src/lib/auth.ts`:

```typescript
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
```

I generated tokens with a 24-hour expiration because it balances security with usability. I included the user role in the token claims so role checks can happen without additional database queries.

```typescript
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}
```

I implemented token verification with try-catch because JWT verification throws on expired or invalid tokens, and I needed to handle both cases gracefully by returning null.

### Middleware Implementation

I implemented the authentication middleware as a higher-order function:

```typescript
export async function withAuth(
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>,
  requiredRole?: 'ADMIN' | 'USER'
) {
  return async (req: NextRequest, context: any) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (requiredRole && user.role !== requiredRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}
```

I extracted the token by removing the "Bearer " prefix because the Authorization header uses that format. I checked for the required role after validating the token because there's no point checking permissions for an unauthenticated user.

### Feature Flag Evaluation Implementation

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

I implemented the evaluation with explicit priority ordering because I needed a clear decision flow:

1. **User overrides first** - These are explicit admin decisions for specific users and must take precedence.
2. **Global enabled check** - If the flag is disabled globally, no further evaluation is needed.
3. **0% and 100% shortcuts** - These edge cases avoid unnecessary hash computation.
4. **Percentage rollout** - For partial rollouts, I use hash-based bucketing to ensure consistency.

I chose to use the first 8 characters of the SHA-256 hash because it provides 32 bits of entropy (4 billion possible values), which is more than sufficient for percentage distribution. The modulo 100 operation maps this to a 1-100 range that can be compared directly with the rollout percentage.

### API Endpoints

I created RESTful endpoints organized by resource:

**Authentication Endpoints:**
- `POST /api/auth/login` - Authenticates users and returns JWT tokens
- `GET /api/auth/me` - Returns the current user's information
- `POST /api/auth/logout` - Client-side token clearing

**Flags Endpoints:**
- `GET /api/flags` - Lists all flags (admin only)
- `POST /api/flags` - Creates new flags (admin only)
- `GET /api/flags/:id` - Gets flag details with overrides (admin only)
- `PUT /api/flags/:id` - Updates flags (admin only)
- `DELETE /api/flags/:id` - Deletes flags (admin only)

**Overrides Endpoints:**
- `GET /api/flags/:id/overrides` - Lists user overrides for a flag (admin only)
- `POST /api/flags/:id/overrides` - Creates/updates user overrides (admin only)
- `DELETE /api/flags/:id/overrides/:overrideId` - Removes overrides (admin only)

**Evaluation Endpoint:**
- `GET /api/flags/evaluate` - Returns all evaluated flags for the logged-in user

I created a dedicated evaluate endpoint because client applications need to fetch all relevant flags in a single request rather than making individual requests per flag.

---

## 7. Handling Requirements, Constraints, and Edge Cases

### Requirements Coverage

| Requirement | How I Handled It |
|-------------|------------------|
| User authentication with roles | JWT tokens with role claims, middleware checks |
| Admin CRUD for flags | REST endpoints with ADMIN role requirement |
| Unique key and description | Database unique constraint, validation |
| Global enable/disable | `enabled` boolean field on FeatureFlag |
| Percentage rollout (0-100) | `rolloutPercentage` integer with validation |
| Per-user overrides | UserOverride model with priority in evaluation |
| Deterministic evaluation | SHA-256 hash of `userId:flagKey` |
| Single endpoint for evaluated flags | `/api/flags/evaluate` returns all flags |
| Audit logging | AuditLog model records all changes |

### Constraint Coverage

| Constraint | How I Handled It |
|------------|------------------|
| Next.js App Router | Used Next.js 14+ App Router with server components |
| Relational database | PostgreSQL with Prisma ORM |
| JWT authentication | bcrypt for passwords, jsonwebtoken for sessions |
| RESTful APIs | Consistent URL patterns and HTTP methods |
| Minimal frontend | Login, flags list, flag detail, user lookup pages |

### Edge Cases Handled

**Edge Case 1: No overrides exist for a user**
I handled this by checking if `flag.overrides` is undefined or empty before searching, and if no override is found, the function proceeds to the next evaluation step.

**Edge Case 2: Rollout percentage is exactly 0 or 100**
I added explicit checks for these values to avoid unnecessary hash computation. A 0% rollout always returns false, and 100% always returns true.

**Edge Case 3: Flag key is modified during rollout**
I chose to hash `userId:flagKey` instead of `userId:flagId` because flag keys are what client applications use, and changing a key would effectively start a new rollout with different user distribution.

**Edge Case 4: User or flag is deleted**
I implemented cascade delete on the UserOverride foreign keys so that when a user or flag is deleted, their associated overrides are automatically removed. This prevents orphaned records.

**Edge Case 5: Concurrent flag updates**
Prisma's transactional operations ensure that audit logs are created atomically with flag updates. If either operation fails, both are rolled back.

**Edge Case 6: Token expiration**
I set JWT expiration to 24 hours and implemented proper error handling so expired tokens return a 401 Unauthorized response rather than crashing.

**Edge Case 7: Database connection failures**
I wrapped all database operations in try-catch blocks and return 500 Internal Server Error responses with logged error details for debugging.

---

## Summary

I built a complete Feature Flag Management System by first designing a relational database schema that captures users, flags, overrides, and audit logs. I implemented JWT-based authentication with role checking to secure admin operations. I created a deterministic rollout algorithm using SHA-256 hashing that ensures consistent user bucketing. I exposed all functionality through RESTful API endpoints that follow consistent patterns for CRUD operations, overrides, and flag evaluation. The system handles all specified requirements while maintaining clean separation between authentication, authorization, business logic, and data access layers.
