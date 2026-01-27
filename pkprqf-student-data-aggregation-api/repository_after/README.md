# Student Data Aggregation API

A Spring Boot REST API that aggregates student data including average scores, total count, top scorer, and sorted names.

## Features

- Stateless and thread-safe design
- Input validation with proper error handling
- Optimal O(n) time complexity for aggregation
- Clean separation of concerns
- Comprehensive test coverage

## API Endpoints

### POST /api/students/aggregate

Aggregates student data and returns statistics.

**Request Body:**
```json
[
  {
    "name": "Alice",
    "score": 85
  },
  {
    "name": "Bob", 
    "score": 92
  }
]
```

**Response:**
```json
{
  "count": 2,
  "averageScore": 88.5,
  "topStudent": {
    "name": "Bob",
    "score": 92
  },
  "sortedNames": ["Alice", "Bob"]
}
```

## Running the Application

```bash
mvn spring-boot:run
```

## Running Tests

```bash
mvn test
```