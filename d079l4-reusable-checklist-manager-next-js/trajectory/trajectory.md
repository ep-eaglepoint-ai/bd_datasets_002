# Trajectory

## Trajectory (Thinking Process for Full-Stack Development)

### 1. Audit the System & Product Flow (Identify Requirements)

I audited the requirements for building a production-quality Reusable Checklist Manager. The system needed to support creating reusable templates, generating independent instances from templates, tracking progress with required/optional items, managing status transitions (active, completed, archived), and ensuring template changes don't affect existing instances. The key challenge was implementing proper data isolation between templates and instances while maintaining a clean, type-safe architecture.

**Learn about Next.js App Router and Server Actions:**

- https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- https://www.youtube.com/watch?v=O94ESaJtZtM

**Understanding the snapshot pattern for data independence:**

- When creating instances from templates, we copy (snapshot) the template items rather than referencing them
- This ensures template modifications don't retroactively affect existing instances

### 2. Define API, UX, and Data Contracts

I defined clear contracts for the application:

**API Contract (Server Actions):**

- All mutations use Server Actions with Zod validation
- Each action returns `{ success: true, data }` or `{ error: string }`
- Validation happens server-side before database operations
- Path revalidation ensures UI consistency after mutations

**UX Contract:**

- Clean, accessible UI with proper form validation
- Real-time progress tracking with visual indicators
- Status badges for instance states (Active, Completed, Archived)
- Responsive design with mobile support

**Data Contract:**

- Templates are immutable once instances are created from them
- Instances are independent snapshots of template data
- Required items must be completed before marking instance as complete
- All timestamps are automatically managed by Prisma

**Learn about schema-first development with Zod:**

- https://zod.dev/
- https://www.youtube.com/watch?v=AeQ3f4zmSMs

### 3. Rework the Data Model for Efficiency

I designed a Prisma schema with four core models:

**Template** - Stores reusable checklist definitions

- `id`, `title`, `description`, `createdAt`, `updatedAt`
- One-to-many relationship with `TemplateItem`
- One-to-many relationship with `ChecklistInstance`

**TemplateItem** - Individual items within a template

- `id`, `text`, `description`, `required`, `order`, `templateId`
- Cascade delete when template is deleted

**ChecklistInstance** - Independent checklist created from a template

- `id`, `title`, `notes`, `status`, `templateId`, `createdAt`, `updatedAt`
- References template but stores snapshot of items
- Status enum: ACTIVE, COMPLETED, ARCHIVED

**InstanceItem** - Snapshot of template items with completion tracking

- `id`, `text`, `description`, `required`, `completed`, `order`, `instanceId`
- Cascade delete when instance is deleted

This model prevents N+1 queries by using Prisma's `include` for eager loading and ensures data independence through the snapshot pattern.

**Learn about Prisma schema design:**

- https://www.prisma.io/docs/concepts/components/prisma-schema
- https://www.youtube.com/watch?v=RebA5J-rlwg

### 4. Rebuild as a Projection-First Pipeline

The application follows Next.js App Router conventions with server-first rendering:

**Server Actions (`app/actions.ts`):**

- `createTemplate()` - Validates with Zod, creates template with items in transaction
- `getTemplates()` - Returns templates with instance count projection
- `createInstance()` - Fetches template, creates instance with copied items (snapshot)
- `toggleInstanceItem()` - Updates single item completion status
- `updateInstanceStatus()` - Transitions instance between states
- All actions use `revalidatePath()` for cache invalidation

**Page Components:**

- Server Components fetch data directly from database
- Client Components handle interactivity (forms, toggles)
- Minimal data transfer - only essential fields sent to client

**Learn about Server Components vs Client Components:**

- https://nextjs.org/docs/app/building-your-application/rendering/server-components
- https://www.youtube.com/watch?v=VIwWgV3Lc6s

### 5. Move Business Logic to Server-Side

All critical operations happen server-side:

**Validation:**

- Zod schemas validate all inputs before database operations
- Type-safe validation with automatic TypeScript inference
- Error messages returned to client for display

**Database Operations:**

- Prisma handles all database interactions
- Transactions ensure atomicity (e.g., template creation with items)
- Cascade deletes maintain referential integrity

**Authorization:**

- Server Actions run in secure server context
- No direct database access from client
- Future-ready for adding authentication middleware

**Learn about server-side validation:**

- https://www.youtube.com/watch?v=KXAG9kZ-Bws

### 6. Use Snapshot Pattern Instead of Foreign Key References

Instance creation uses a snapshot pattern to ensure independence:

```typescript
// When creating an instance, we copy template items
const instance = await prisma.checklistInstance.create({
  data: {
    title,
    notes,
    templateId, // Reference for tracking origin
    status: "ACTIVE",
    items: {
      create: template.items.map((item) => ({
        text: item.text, // Copied, not referenced
        description: item.description, // Copied, not referenced
        required: item.required, // Copied, not referenced
        order: item.order, // Copied, not referenced
        completed: false,
      })),
    },
  },
});
```

This prevents the "shared mutable state" problem where template changes would affect existing instances.

**Learn about the snapshot pattern:**

- https://martinfowler.com/eaaDev/EventSourcing.html

### 7. Implement Stable State Management + Optimistic UI

**Server State:**

- Next.js cache automatically handles server-side data
- `revalidatePath()` invalidates cache after mutations
- Server Components re-fetch on navigation

**Client State:**

- React state for form inputs and UI interactions
- Optimistic updates for instant feedback
- Error boundaries for graceful error handling

**Status Transitions:**

- Clear state machine: ACTIVE → COMPLETED → ARCHIVED
- UI enforces valid transitions
- Server validates all state changes

**Learn about Next.js caching:**

- https://nextjs.org/docs/app/building-your-application/caching
- https://www.youtube.com/watch?v=VBlSe8tvg4U

### 8. Eliminate N+1 Queries with Eager Loading

All data fetching uses Prisma's `include` to prevent N+1 queries:

```typescript
// Single query fetches template with all items
const template = await prisma.template.findUnique({
  where: { id },
  include: { items: { orderBy: { order: "asc" } } },
});

// Single query fetches instance with template and items
const instance = await prisma.checklistInstance.findUnique({
  where: { id },
  include: {
    template: true,
    items: { orderBy: { order: "asc" } },
  },
});
```

This ensures predictable query counts regardless of data size.

**Learn about N+1 query problem:**

- https://www.youtube.com/watch?v=lptxhwzJK1g
- https://michaelkasingye.medium.com/optimizing-database-queries-avoiding-the-n1-query-problem-438476198983

### 9. Implement Type Safety Across the Stack

**End-to-End Type Safety:**

- Zod schemas define runtime validation
- TypeScript types inferred from Zod schemas
- Prisma generates types from database schema
- Server Actions provide type-safe RPC layer

**Benefits:**

- Compile-time error detection
- Autocomplete in IDE
- Refactoring safety
- Self-documenting code

**Learn about type-safe full-stack development:**

- https://www.youtube.com/watch?v=2cB5Fh46Vi4

### 10. Result: Production-Ready Application + Verified Quality

**Measurable Outcomes:**

- ✅ All 6 integration tests passing
- ✅ Type-safe API layer with Zod validation
- ✅ Zero N+1 queries (verified in tests)
- ✅ Template independence verified (snapshot pattern)
- ✅ Clean separation of concerns (Server Actions, Components, DB layer)
- ✅ Docker-ready with automated testing pipeline

**Performance Characteristics:**

- Predictable query count (1-2 queries per page)
- Efficient eager loading with Prisma
- Server-side rendering for fast initial load
- Optimistic updates for instant feedback

**Quality Signals:**

- Integration tests cover all requirements
- Zod validation prevents invalid data
- TypeScript catches type errors at compile time
- Prisma ensures database integrity

---

## Trajectory Transferability Notes

The above trajectory is designed for **Full-Stack Development**. The steps outlined represent reusable thinking nodes (audit, contract definition, data modeling, implementation, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories by changing the focus of each node, not the structure.

### Core Thinking Nodes

1. **Audit** - Understand requirements, constraints, and existing patterns
2. **Contract** - Define clear boundaries and guarantees
3. **Design** - Model data and architecture for the problem domain
4. **Execute** - Implement with best practices and patterns
5. **Verify** - Test, measure, and validate outcomes

### Full-Stack Development → Refactoring

- System audit becomes code audit (identify scaling problems)
- API contracts become performance contracts (SLOs, query limits)
- Data model design becomes data model optimization (indexes, caching)
- Snapshot pattern becomes projection-first pipeline
- Integration tests become performance benchmarks
- Add profiling, query analysis, and optimization metrics

### Full-Stack Development → Performance Optimization

- Requirements audit becomes bottleneck detection
- UX contracts become latency budgets and SLAs
- Data model includes indexes, materialized views, caching layers
- Server Actions become optimized hot paths
- Eager loading extends to prefetching and lazy loading strategies
- Add observability, APM tools, and load testing

### Full-Stack Development → Testing

- System audit becomes test coverage audit
- API contracts become test contracts (fixtures, mocks)
- Data model becomes test data factories
- Server Actions become testable units with clear boundaries
- Snapshot pattern becomes deterministic test data
- Add test pyramid, edge cases, and property-based testing

### Full-Stack Development → Code Generation

- Requirements audit becomes input specification analysis
- Contracts become generation constraints and templates
- Data model becomes domain model scaffolding
- Server Actions become generated CRUD operations
- Type safety becomes generated types and validators
- Add code templates, AST manipulation, and post-generation validation

---

## Core Principle (Applies to All)

- **The trajectory structure stays the same**
- **Only the focus and artifacts change**
- **Audit → Contract → Design → Execute → Verify remains constant**

This trajectory demonstrates how to build production-quality full-stack applications with Next.js, Prisma, and TypeScript while maintaining clean architecture, type safety, and testability.
