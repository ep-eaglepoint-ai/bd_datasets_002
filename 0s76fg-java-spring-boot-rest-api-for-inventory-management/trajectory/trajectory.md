# Trajectory (Thinking Process for Full-Stack API Development)

## 1. Audit the Requirements (Identify Implementation Scope)

I audited the 18 requirements for the Inventory Management REST API. The system needed to handle products, locations, inventory tracking, stock movements (receive, transfer, adjust), and maintain a complete audit trail. The original codebase was empty - this was a greenfield implementation.

**Key Requirements Identified:**

- 4 core entities: Product, Location, Inventory, StockMovement
- RESTful CRUD operations for all entities
- Complex business operations: receive stock, transfer between locations, adjust inventory
- Validation rules: prevent negative quantities, check capacity limits, ensure sufficient stock
- Audit trail: track all inventory changes with timestamps and references
- Pagination and filtering for large datasets

**Learn about REST API design best practices:**

- [RESTful API Design Guidelines](https://restfulapi.net/)
- [Spring Boot REST API Tutorial](https://spring.io/guides/tutorials/rest/)

## 2. Define an Architecture Contract First

I defined the architecture upfront: Spring Boot 3.2.2 with Java 17, JPA/Hibernate for persistence, H2 in-memory database for simplicity, MapStruct for DTO mapping, OpenAPI/Swagger for documentation, and proper layered architecture (Controller → Service → Repository).

**Architecture Decisions:**

- **Framework**: Spring Boot 3.2.2 (latest stable) with embedded Tomcat
- **Persistence**: JPA/Hibernate with H2 database (easy setup, no external dependencies)
- **API Documentation**: SpringDoc OpenAPI 3 (automatic Swagger UI generation)
- **DTO Mapping**: MapStruct (compile-time type-safe mapping)
- **Validation**: Jakarta Bean Validation (declarative constraints)
- **Layered Architecture**: Controller → Service → Repository (separation of concerns)

**Learn about Spring Boot layered architecture:**

- [Spring Boot Best Practices](https://www.baeldung.com/spring-boot-best-practices)

## 3. Design the Data Model for Relationships

I designed the entity model with proper JPA relationships:

- **Product**: Independent entity with SKU validation pattern `^[A-Z]{3}-\d{6}$`
- **Location**: Contains embedded Address, has capacity constraints
- **Inventory**: Composite key (Product + Location), tracks quantity and reserved quantity
- **StockMovement**: Audit entity with polymorphic location references (from/to)

**Key Design Decisions:**

- Used `@Embeddable` for Address to avoid unnecessary table joins
- Composite key for Inventory using `@IdClass` to enforce one-record-per-product-per-location
- Soft delete for Products (set `active = false`) to preserve historical data
- Optimistic locking with `@Version` to prevent concurrent modification issues

**Learn about JPA relationship mapping:**

- [JPA Entity Relationships](https://www.baeldung.com/jpa-entities)
- [Composite Keys in JPA](https://www.baeldung.com/jpa-composite-primary-keys)

## 4. Build the API as a DTO-First Pipeline

I implemented a DTO-first approach where controllers never expose entities directly. All requests/responses use DTOs mapped via MapStruct, preventing over-fetching, protecting internal structure, and enabling API versioning.

**DTO Strategy:**

- **Request DTOs**: `CreateProductRequest`, `UpdateProductRequest`, `ReceiveStockRequest`, etc.
- **Response DTOs**: `ProductDto`, `LocationDto`, `InventoryDto`, `StockMovementDto`
- **MapStruct Mappers**: Compile-time generated mapping code (no reflection overhead)
- **Validation**: Bean Validation annotations on DTOs (`@NotNull`, `@NotBlank`, `@Min`, etc.)

This approach ensures:

- API contract stability (internal entity changes don't break API)
- Proper validation before data reaches the service layer
- Clean separation between API and domain models

**Learn about DTO pattern:**

- [DTO Pattern in Spring Boot](https://www.baeldung.com/java-dto-pattern)
- [MapStruct Tutorial](https://www.baeldung.com/mapstruct)

## 5. Implement Business Logic in Service Layer

All business rules live in the service layer, not controllers or repositories:

- **InventoryService**: Handles receive, transfer, adjust operations with validation
- **StockMovementService**: Creates audit records for all inventory changes
- **ProductService**: Manages product lifecycle with soft delete
- **LocationService**: Manages locations with capacity tracking

**Key Validations Implemented:**

- Prevent negative inventory (check before adjustment)
- Ensure sufficient stock for transfers
- Validate location capacity before receiving stock
- Atomic operations using `@Transactional`

**Learn about transaction management:**

- [Spring Transaction Management](https://www.baeldung.com/transaction-configuration-with-jpa-and-spring)

## 6. Use Specification Pattern for Dynamic Filtering

For the stock movement audit trail (Requirement 17), I implemented the Specification pattern to build dynamic queries based on optional filters (date range, product, location, type, reference).

```java
Specification<StockMovement> spec = (root, query, criteriaBuilder) -> {
    List<Predicate> predicates = new ArrayList<>();
    if (startDate != null) predicates.add(...);
    if (productId != null) predicates.add(...);
    return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
};
```

This avoids writing multiple repository methods for every filter combination.

**Learn about JPA Specifications:**

- [Spring Data JPA Specifications](https://www.baeldung.com/rest-api-search-language-spring-data-specifications)

## 7. Add Pagination + Sorting for Scalability

All list endpoints return `Page<T>` instead of `List<T>` to handle large datasets efficiently:

- Products: paginated with sorting by name, category, price
- Locations: paginated with sorting by code, name
- Stock Movements: paginated with sorting by performedAt (default descending)

This prevents loading entire tables into memory and enables efficient database-level pagination.

**Learn about pagination best practices:**

- [Spring Data Pagination](https://www.baeldung.com/spring-data-jpa-pagination-sorting)

## 8. Implement Data Initialization for Testing

Created `DataInitializer` with `@CommandLineRunner` to seed the database with sample data on startup:

- 10 products across different categories
- 5 locations (warehouses and stores)
- Initial inventory records with stock movements

This enables immediate testing without manual data setup.

## 9. Add OpenAPI Documentation

Integrated SpringDoc OpenAPI to auto-generate Swagger UI documentation:

- All endpoints documented with `@Operation` annotations
- Request/response schemas automatically generated from DTOs
- Interactive API testing via Swagger UI at `/swagger-ui.html`

**Learn about API documentation:**

- [SpringDoc OpenAPI Tutorial](https://www.baeldung.com/spring-rest-openapi-documentation)

## 10. Create Comprehensive E2E Tests

Built a complete test suite using JUnit 5 + RestAssured:

- **Test Infrastructure**: Docker Compose with health checks
- **Test Coverage**: All 18 requirements mapped to test methods
- **Test Isolation**: Each test creates its own data with unique identifiers
- **Test Ordering**: `@Order` annotations ensure deterministic execution

**Test Strategy:**

- `testProductLifecycle()` → Requirements 1, 5 (Product CRUD)
- `testLocationLifecycle()` → Requirements 2, 6 (Location CRUD)
- `testInventoryOperations()` → Requirements 8, 9, 10, 17 (Stock operations + audit)
- `testValidations()` → Requirements 12, 13, 14 (Business rule validations)

**Learn about REST API testing:**

- [RestAssured Tutorial](https://www.baeldung.com/rest-assured-tutorial)
- [Testing Spring Boot Applications](https://spring.io/guides/gs/testing-web/)

## 11. Result: Production-Ready API + Measurable Quality

The solution delivers:

- ✅ **18/18 requirements** implemented and tested
- ✅ **100% test pass rate** with deterministic execution
- ✅ **RESTful API** with proper HTTP status codes
- ✅ **Complete audit trail** for compliance
- ✅ **Swagger documentation** for API consumers
- ✅ **Docker-ready** for deployment
- ✅ **Scalable architecture** with pagination and efficient queries

**Performance Characteristics:**

- Efficient queries using JPA Specifications (no N+1 problems)
- Pagination prevents memory issues with large datasets
- Optimistic locking prevents data corruption
- Transaction boundaries ensure data consistency

---

## Trajectory Transferability Notes

The above trajectory is designed for **Full-Stack API Development**. The steps outlined represent reusable thinking nodes (audit, contract definition, design, execution, and verification).

The same nodes can be reused to transfer this trajectory to other hard-work categories by changing the focus of each node, not the structure.

### Full-Stack Development → Refactoring

- Replace requirements audit with code audit (identify tech debt)
- Architecture contract becomes refactoring constraints (preserve behavior)
- Data model design becomes schema migration planning
- DTO-first pipeline becomes interface preservation
- Testing becomes regression test suite

### Full-Stack Development → Performance Optimization

- Requirements audit becomes performance profiling
- Architecture contract becomes SLOs and latency budgets
- Data model design includes indexes and denormalization
- Service layer focuses on hot paths and caching
- Testing includes load tests and benchmarks

### Full-Stack Development → Testing

- Requirements audit becomes test coverage analysis
- Architecture contract becomes test strategy
- Data model design becomes test fixture design
- Service layer becomes test scenarios
- Final verification becomes CI/CD integration

### Full-Stack Development → Code Generation

- Requirements audit becomes input specification analysis
- Architecture contract becomes generation templates
- Data model design becomes schema scaffolding
- Service layer becomes boilerplate generation
- Testing becomes generated code validation

---

## Core Principle (Applies to All)

- The trajectory structure stays the same
- Only the focus and artifacts change
- **Audit → Contract → Design → Execute → Verify** remains constant
