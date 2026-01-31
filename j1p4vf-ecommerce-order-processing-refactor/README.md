# E-commerce Order Processing Refactor

## Overview

This project refactors a monolithic `OrderProcessor` into a clean, modular architecture with separated services.

## Requirements Met

1. **Service Decoupling**: TaxService, InventoryService, PaymentService extracted
2. **Pipeline Orchestration**: OrderOrchestrator with step-based processing
3. **Standardized Error Handling**: Custom error classes with specific codes
4. **Transactional Parity**: Inventory reserved only after payment
5. **Tax Rule Externalization**: Configurable tax rates
6. **Data Shape Preservation**: Same return shape as legacy
7. **Isolation Testing**: Payment failure doesn't call inventory
8. **Tax Verification**: California 9.25% rate verified

## Docker Commands

### Run Tests on Repository Before (Expected to Fail)
```bash
docker-compose run test-before
```

### Run Tests on Repository After (Expected to Pass)
```bash
docker-compose run test-after
```

## Project Structure

```
repository_after/
├── OrderProcessor.js          # Refactored main processor
├── infra/
│   ├── db.js                  # Database mock
│   ├── inventory.js           # Inventory mock
│   └── gateway.js             # Payment gateway mock
├── errors/
│   └── OrderProcessingError.js # Custom error classes
└── services/
    ├── TaxService.js          # Tax calculation
    ├── InventoryService.js    # Inventory management
    ├── PaymentService.js      # Payment processing
    ├── FraudCheckService.js   # Fraud detection (extensible)
    └── OrderOrchestrator.js   # Pipeline orchestrator
```

## Testing

Run all tests:
```bash
npm test
```
