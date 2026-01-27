# 3SOC62 - Simple Inventory Management System

**Category:** sft

## Overview
- Task ID: 3SOC62
- Title: Simple Inventory Management System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3soc62-simple-inventory-management-system

## Requirements
- 1. Product Listing Display all products with: Name SKU Current quantity Low-stock indicator (quantity below minimum threshold) Products should be sortable and searchable
- 2. Product Details View detailed information for a single product Show: Current stock Minimum stock level Creation date Read-only historical data
- 3. Inventory Updates Increase or decrease stock quantity Only authenticated users can update stock Quantity adjustment must be explicit (+ / −) Prevent stock from going below zero Confirmation message after successful update
- 4. Inventory History Track all stock changes per product Show: Product Change amount User who made the change Timestamp History is read-only
- 5. User Authentication Email and password authentication User registration with name and email JWT-based authentication Users can only modify inventory when logged in

## Metadata
- Programming Languages: Javascript, TypeScript, CSS and sql
- Frameworks: Backend: Node.js with Express, Frontend: React (Vite), Styling: Tailwind CSS
- Libraries: (none)
- Databases: PostgreSQL
- Tools: Containerization: Docker + docker-compose
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
