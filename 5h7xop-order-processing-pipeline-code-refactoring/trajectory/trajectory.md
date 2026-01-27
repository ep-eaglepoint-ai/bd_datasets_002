# Trajectory

## Trajectory (Thinking Process for Refactoring)

### 1. Audit the Original Code (Identify Maintenance Problems)

I audited the original `OrderProcessor` code. It was a monolithic "God Class" (800+ lines) that mixed validation, business logic, data access (JDBC), and external service calls. It suffered from:

- **Duplicated Logic**: Discount calculations were copy-pasted in 4 different places.
- **Hardcoded Dependencies**: SQL queries and payment gateway URLs were hardcoded inside the class.
- **Fragile State Machine**: Order status transitions were handled by a complex web of `if-else` statements, making it prone to invalid state bugs.
- **Untestability**: The tight coupling to `java.sql.Connection` made unit testing impossible without a live database.

### 2. Define a Refactoring Contract First

I defined the refactoring contract:

- **API Compatibility**: The public `processOrder(Order)` method signature must remain unchanged to support legacy callers.
- **Behavioral Integrity**: The system must maintain transactional integrity (e.g., inventory rollback on payment failure).
- **Testability**: The new design must enable unit testing with mock dependencies, removing the need for a DB connection during tests.

### 3. Rework the Data Model for Safety

I introduced strict typing to the data model:

- **OrderState Enum**: Replaced raw string status checks (e.g., "VALIDATED", "PAID") with an `OrderState` enum. This ensures compile-time safety and centralized the definition of valid states.

### 4. Rebuild the Process as a Pipeline

I rebuilt the order processing logic as a linear pipeline of distinct steps. The monolithic `processOrder` method now orchestrates specialized components: `Validator` -> `CustomerVerifier` -> `Pricer` -> `InventoryChecker` -> `PaymentProcessor` -> `Fulfiller`. This reduced the cyclomatic complexity and made the flow easy to follow.

### 5. Decouple Persistence Logic

I moved all direct JDBC SQL calls out of the business layer and into dedicated Repositories (`JdbcOrderRepository`, `JdbcCustomerRepository`, `JdbcCouponRepository`). This implements the **Repository Pattern**, isolating the database schema from the business rules and effectively "moving filters to the database layer" by encapsulating queries.

### 6. Centralize Business Rules

I consolidated scattered and duplicated logic into single sources of truth (DRY Principle):

- **Discounts**: The 4 different discount calculation blocks were merged into a single `DiscountCalculator`.
- **Validation**: Input validation logic was centralized in `OrderValidator`.
  This ensures that changes to business rules (e.g., a new discount tier) only need to happen in one place.

### 7. Deterministic State Transitions

I implemented a specialized `OrderStateMachine` to manage order lifecycles. This replaces the fragile `if-else` checks and strictly enforces valid transitions (e.g., forcing `VALIDATED` before `PRICED`). This ensures the order flow is deterministic and predictable.

### 8. Decouple External Services (Dependency Injection)

I introduced **Dependency Injection (DI)**. The `OrderProcessor` now depends on interfaces (`PaymentGateway`, `InventoryService`) rather than concrete implementations. This allows for:

- **Mocking**: Services can be mocked in unit tests.
- **Swappability**: Different implementations (e.g., `StripePaymentGateway` vs `LegacyPaymentGateway`) can be swapped without changing the core processor logic.

### 9. Normalize Payment Handling

I normalized the handling of various payment methods (Credit Card, PayPal, Crypto) behind a generic `PaymentGateway` interface. This removed the massive `if-else` block responsible for payment specifics in the main processor, complying with the Open/Closed Principle.

### 10. Result: Testability and Extensibility

The refactoring transformed a brittle monolith into a clean, modular system.

- **Testability**: The core logic is now 100% unit testable with mocks.
- **Maintainability**: Components are small (<200 lines) and focused (Single Responsibility Principle).
- **Extensibility**: New features (discount rules, payment methods) can be added as new classes without modifying existing stable code.

## Trajectory Transferability Notes

The above trajectory is designed for **Refactoring**. The steps outlined in it represent reusable thinking nodes (audit, contract definition, structural changes, execution, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories (such as full-stack development, performance optimization, testing, and code generation) by changing the focus of each node, not the structure.

Below are the nodes extracted from this trajectory. These nodes act as a template that can be mapped to other categories by adapting the inputs, constraints, and validation signals specific to each task type.

### Refactoring → Full-Stack Development

- Replace code audit with system & product flow audit
- Performance contract becomes API, UX, and data contracts
- Data model refactor extends to DTOs and frontend state shape
- Query optimization maps to API payload shaping
- Pagination applies to backend + UI (cursor / infinite scroll)
- Add API schemas, frontend data flow, and latency budgets

### Refactoring → Performance Optimization

- Code audit becomes runtime profiling & bottleneck detection
- Performance contract expands to SLOs, SLAs, latency budgets
- Data model changes include indexes, caches, async paths
- Query refactors focus on hot paths
- Verification uses metrics, benchmarks, and load tests
- Add observability tools and before/after measurements

### Refactoring → Testing

- Code audit becomes test coverage & risk audit
- Performance contract becomes test strategy & guarantees
- Data assumptions convert to fixtures and factories
- Stable ordering maps to deterministic tests
- Final verification becomes assertions & invariants
- Add test pyramid placement and edge-case coverage

### Refactoring → Code Generation

- Code audit becomes requirements & input analysis
- Performance contract becomes generation constraints
- Data model refactor becomes domain model scaffolding
- Projection-first thinking becomes minimal, composable output
- Verification ensures style, correctness, and maintainability
- Add input/output specs and post-generation validation

## Core Principle (Applies to All)

- The trajectory structure stays the same
- Only the focus and artifacts change
- Audit → Contract → Design → Execute → Verify remains constant
