# 7KB2PP - offline inventory management web app

**Category:** sft

## Overview
- Task ID: 7KB2PP
- Title: offline inventory management web app
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7kb2pp-offline-inventory-management-web-app

## Requirements
- The system must allow users to create, edit, and manage inventory items, storing structured data such as item name, SKU or identifier, category, storage location, quantity on hand, unit cost, supplier notes, and lifecycle status while validating all fields using Zod to prevent malformed or inconsistent records.
- The application must persist all inventory data locally using IndexedDB or localStorage, ensuring full offline functionality, consistent state across reloads, and safe recovery from interrupted sessions or unexpected shutdowns.
- The system must support inventory stock movement tracking, recording every inbound, outbound, transfer, adjustment, or correction event as an immutable log entry that preserves historical quantity changes for auditing and analytics.
- The application must implement real-time stock quantity calculations, ensuring that current item quantities are derived deterministically from movement history rather than being overwritten in a way that could cause silent drift or corruption.
- The system must provide category and location management, allowing users to group items logically, reassign storage locations, and analyze stock distribution across physical or logical storage zones.
- The application must support reorder threshold configuration, detecting low-stock conditions and visually flagging items that require replenishment while handling edge cases such as zero-stock, negative adjustments, or delayed restocking.
- The system must compute inventory valuation metrics, including total inventory value, per-category value, cost-basis summaries, and historical valuation changes over time, ensuring accurate floating-point handling and consistent aggregation logic.
- The application must generate inventory analytics dashboards, displaying charts for stock turnover rate, slow-moving items, overstock detection, expiration risk, shrinkage indicators, and historical stock trends.
- The system must allow users to filter, search, and sort inventory records, supporting full-text search, compound filters, partial matches, and fast performance even with thousands of items.
- The application must support bulk operations, enabling users to import, export, batch edit, reassign categories, and apply mass adjustments while ensuring atomic updates and rollback-safe behavior in case of partial failures.
- The system must implement item lifecycle tracking, supporting states such as active, reserved, damaged, expired, archived, and disposed, and ensuring that lifecycle changes are logged and reflected consistently in analytics and reporting views.
- The application must maintain historical audit logs, allowing users to review when items were created, updated, moved, restocked, written off, or removed, and ensuring that past records remain immutable and verifiable.
- The system must provide data visualization tools, including charts for stock history, category distribution, valuation over time, reorder risk trends, and warehouse utilization metrics using client-side visualization libraries.
- The application must support inventory health scoring, computing derived metrics such as dead stock ratio, replenishment efficiency, stock aging, and demand consistency using explainable formulas rather than opaque heuristics.
- The system must handle edge cases such as duplicate SKUs, renamed items, deleted categories, inconsistent movement logs, negative stock adjustments, expired inventory, and restored historical data without breaking referential integrity or corrupting derived metrics.
- The application must provide data export and backup capabilities, allowing users to export inventory records, movement logs, valuation summaries, and analytics snapshots in structured formats such as JSON or CSV.
- The system must implement performance optimizations, including memoized selectors, debounced updates, incremental recomputation of aggregates, list virtualization, and optional Web Worker processing to ensure smooth interaction with large datasets.
- The application must ensure deterministic state updates and long-term consistency, preventing silent drift in stock quantities, ensuring repeatable valuation calculations, and maintaining predictable behavior across reloads and long-running sessions.
- The system must provide clear and explainable computation logic for all derived metrics, including stock value, turnover rate, aging calculations, and reorder risk, ensuring that results are auditable and transparent to the user.

## Metadata
- Programming Languages: TypeScript
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
