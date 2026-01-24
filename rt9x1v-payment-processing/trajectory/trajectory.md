# Trajectory

1.  **Requirements & Input Analysis**
    I started by carefully auditing the task requirements to build a reliable payment processing system in PostgreSQL. I identified the critical need for a function that accepts specific inputs (order ID, amount, method, etc.) and enforces strict business rules like checking order existence and payment status. I recognized that simply checking "not paid" was insufficient and that I needed to strictly enforce a "pending" status to handle edge cases like cancelled orders correctly. I referred to the [PostgreSQL PL/pgSQL Documentation](https://www.postgresql.org/docs/current/plpgsql-structure.html) to structure the function effectively.

2.  **Domain Model Scaffolding**
    Refactoring the data model was the next step. I designed a schema with `orders`, `payments`, and `payment_audit_log` tables to serve as the foundation. I defined strict constraints (e.g., positive amounts, unique request IDs for idempotency) to ensure data integrity at the database level. This scaffolding was crucial for supporting the atomic operations required by the payment logic. I used the [CREATE TABLE documentation](https://www.postgresql.org/docs/current/sql-createtable.html) to ensure correct syntax for foreign keys and check constraints.

3.  **Generation Constraints & Implementation**
    With the model in place, I moved to code generation, adhering to the strict performance contract: "No explanations, comments, or analysis". I implemented the `process_payment` function using explicit `ROW` construction for the `payment_result` composite type to avoid type mismatch errors. I ensured the function was idempotent and thread-safe by using `FOR UPDATE` locking and handling unique violations gracefully. I utilized the [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html) to map logical failures to standard SQL states.

4.  **Verification & Validation**
    Verification was integrated throughout the process. I set up a Dockerized testing environment using `pytest` to validate the implementation against both the "before" (baseline failure) and "after" (success) states. I expanded the test suite to cover critical edge cases I anticipated during analysis, such as attempting to pay for cancelled orders or using negative amounts. This ensured that the system not only worked for the happy path but was robust against invalid inputs. I relied on [Pytest Fixtures documentation](https://docs.pytest.org/en/7.1.x/how-to/fixtures.html) to manage database state consistency between tests.

5.  **Refactoring & Final Polish**
    Finally, I performed a code audit to ensure the style constraints were met perfectly. I removed all comments from the SQL files while ensuring that variable naming (`v_order_record`, `v_existing_payment_id`) remained descriptive enough to convey intent without documentation. I ran the full evaluation script one last time to confirm that the changes regarding strict status checks were correct and that the "clean" code passed all 7 test cases.
