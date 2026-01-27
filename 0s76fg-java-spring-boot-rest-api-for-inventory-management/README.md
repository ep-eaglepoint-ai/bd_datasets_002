# 0S76FG - Java Spring Boot REST API for Inventory Management

**Category:** sft

## Overview
- Task ID: 0S76FG
- Title: Java Spring Boot REST API for Inventory Management
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0s76fg-java-spring-boot-rest-api-for-inventory-management

## Requirements
- Create a Product entity with the following fields: id (auto-generated Long), sku (unique string, must match pattern XXX-000000 where X is uppercase letter and 0 is digit), name (required string), description (optional string), category (required string), unitPrice (BigDecimal with 2 decimal precision, must be positive), active (boolean defaulting to true), createdAt (auto-set timestamp), updatedAt (auto-updated timestamp), version (for optimistic locking).
- Create a Location entity with the following fields: id (auto-generated Long), code (unique string), name (required string), type (enum: WAREHOUSE, STORE, TRANSIT), address (embedded object containing street, city, state, zip, country - all required strings), capacity (positive integer representing maximum total units the location can hold), isActive (boolean defaulting to true).
- Create an Inventory entity with the following fields: id (auto-generated Long), product (foreign key to Product, required), location (foreign key to Location, required), quantity (integer, cannot be negative), reservedQuantity (integer for units committed to pending orders, cannot be negative, cannot exceed quantity), reorderPoint (integer threshold for low stock alerts), lastCountedAt (timestamp of last physical count), version (for optimistic locking). Enforce unique constraint on product+location combination.
- Create a StockMovement entity for audit trail with the following fields: id (auto-generated Long), product (foreign key to Product, required), fromLocation (foreign key to Location, nullable for receipts), toLocation (foreign key to Location, nullable for sales), quantity (positive integer), type (enum: RECEIPT, TRANSFER, ADJUSTMENT, SALE, RETURN), reference (string for PO/SO number, required), notes (optional string), performedBy (required string identifying user), performedAt (auto-set timestamp).
- Implement Product REST endpoints: GET /api/products returns paginated list with optional filtering by category and search by name/sku. GET /api/products/{id} returns single product. POST /api/products creates new product. PUT /api/products/{id} updates existing product. DELETE /api/products/{id} performs soft delete by setting active=false. All responses use DTOs, never expose entities directly.
- Implement Location REST endpoints: GET /api/locations returns all locations. GET /api/locations/{id} returns single location. POST /api/locations creates new location. PUT /api/locations/{id} updates existing location. GET /api/locations/{id}/inventory returns all products stocked at that location with their quantities.
- Implement Inventory REST endpoints: GET /api/inventory returns paginated inventory records. GET /api/inventory/product/{productId} returns stock levels for a product across all locations. GET /api/inventory/location/{locationId} returns all products at a specific location. GET /api/inventory/low-stock returns all inventory records where quantity is at or below reorderPoint.
- Implement POST /api/inventory/receive endpoint for bulk shipment receipt. Request body contains locationId, list of products (each with productId, quantity, reorderPoint), reference number, notes, and performedBy. For each product: create or update inventory record at location, increment quantity, create StockMovement record with type RECEIPT. Entire operation must be atomic - if any product fails, rollback all.
- Implement POST /api/inventory/transfer endpoint for moving stock between locations. Request body contains productId, fromLocationId, toLocationId, quantity, reference, notes, performedBy. Validate: quantity cannot exceed available quantity (quantity minus reservedQuantity) at source. Decrement source inventory, increment destination inventory (create if not exists), create StockMovement record with type TRANSFER.
- Implement POST /api/inventory/adjust endpoint for manual inventory corrections. Request body contains productId, locationId, adjustmentQuantity (positive or negative integer), reference, reason, performedBy. Validate: resulting quantity cannot be negative. Update inventory quantity, create StockMovement record with type ADJUSTMENT.
- Implement optimistic locking on Inventory entity. When two concurrent requests attempt to update the same inventory record, the second request must fail with HTTP 409 Conflict. Response must include message explaining the conflict and suggesting retry.
- Implement validation that quantity can never go negative. Any operation (transfer, adjustment, sale) that would result in negative quantity must be rejected with HTTP 422 Unprocessable Entity and clear error message stating current quantity and requested change.
- Implement validation that transfer quantity cannot exceed available quantity. Available quantity equals quantity minus reservedQuantity. Rejection must return HTTP 422 with message showing available quantity vs requested quantity.
- Implement validation that location capacity cannot be exceeded. Before adding stock to a location, check that total quantity across all products at that location plus new quantity does not exceed location capacity. Rejection must return HTTP 422 with message showing current total, capacity, and attempted addition.
- Implement pagination for all list endpoints. Default page size is 20, maximum page size is 100. Response format must include: content (array of items), totalElements (total count), totalPages (calculated), currentPage (0-indexed), pageSize (actual size used). Support sorting via request parameters.
- Implement global exception handling using @ControllerAdvice. All error responses must follow consistent format: timestamp, status (HTTP code), error (HTTP status phrase), message (human-readable description), path (request URI). Map exceptions: validation errors to 400, not found to 404, optimistic locking to 409, business rule violations to 422, unexpected errors to 500
- Implement StockMovement audit trail. Every inventory change (receive, transfer, adjust) must automatically create a corresponding StockMovement record capturing: what product moved, from where, to where, how much, why (type), reference number, who performed it, when. This is non-negotiable for compliance.
- Implement GET /api/movements endpoint returning stock movement history. Support filtering by date range (startDate, endDate), by productId, by locationId (either from or to), by type. Return paginated results sorted by performedAt descending by default.
- Create sample data that loads on application startup. Include: 10 products with valid SKUs across at least 3 categories, 5 locations (3 warehouses, 2 stores), initial inventory records placing products in warehouses with varying quantities. This enables immediate API testing without manual setup.
- Implement OpenAPI/Swagger documentation accessible at /swagger-ui.html. All endpoints must be documented with: summary describing purpose, description with details, request body schema with field descriptions, response schemas for success and error cases, example values where helpful.
- Write unit tests for service layer achieving minimum 80% code coverage. Test cases must include: successful operations, validation failures (negative quantity, insufficient stock, capacity exceeded), concurrent update handling (optimistic locking), edge cases (zero quantity, exactly at capacity).
- Write integration tests for controller layer using MockMvc. Test cases must include: all CRUD operations returning correct status codes, pagination working correctly, filtering returning correct subsets, validation errors returning 400, not found returning 404, business rule violations returning 422.
- Use Java 17 and Spring Boot 3.2.x. Use Maven for build. Required dependencies: spring-boot-starter-web, spring-boot-starter-data-jpa, spring-boot-starter-validation, h2 (runtime scope), mapstruct, springdoc-openapi-starter-webmvc-ui, spring-boot-starter-test. No Spring Security required.
- Response time must be under 200ms for single-record operations (get by id, create, update). Bulk operations (receive shipment) must complete under 2 seconds for up to 100 items. Use appropriate fetch strategies and batch operations to meet these targets.

## Metadata
- Programming Languages: Java
- Frameworks: Spring  Boot
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
