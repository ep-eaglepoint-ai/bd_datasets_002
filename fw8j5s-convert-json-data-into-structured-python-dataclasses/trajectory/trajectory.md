# Trajectory: JSON to Dataclass Converter

## Problem Statement

Python applications consuming JSON from APIs or config files often work with raw dictionaries, leading to:

- Weak typing and runtime errors
- Poor IDE support (no autocomplete)
- Harder debugging and maintenance
- No validation of data structure

Need a lightweight, reusable solution to convert JSON into strongly-typed Python dataclasses using only standard library.

## Solution Approach

Implement a generic `from_dict()` function that:

1. Takes a dataclass type and dictionary as input
2. Recursively converts nested dictionaries to nested dataclasses
3. Handles lists of primitives and lists of dataclasses
4. Uses type introspection to determine field types

## Implementation

### Core Function: `from_dict(cls, data)`

**Type Introspection Strategy:**

```python
from typing import get_origin, get_args
from dataclasses import is_dataclass, fields

# Check if field is a dataclass → recursive conversion
if is_dataclass(field_type):
    field_values[name] = from_dict(field_type, value)

# Check if field is a list → inspect element type
elif get_origin(field_type) is list:
    item_type = get_args(field_type)[0]
    if is_dataclass(item_type):
        # List of dataclasses
        field_values[name] = [from_dict(item_type, item) for item in value]
    else:
        # List of primitives
        field_values[name] = value
```

### Example Dataclass Structure

**Nested hierarchy demonstrating all features:**

```
Company
├── name: str
├── founded: int
└── employees: list[Person]
    ├── name: str
    ├── age: int
    ├── address: Address (nested dataclass)
    │   ├── street: str
    │   ├── city: str
    │   └── zipcode: str
    ├── contact: Contact (nested dataclass)
    │   ├── email: str
    │   └── phone: str
    └── hobbies: list[str] (list of primitives)
```

### Key Design Decisions

1. **Generic with TypeVar**: `Type[T] -> T` preserves type information
2. **Recursive parsing**: Handles arbitrary nesting depth
3. **Type hints**: Uses `list[str]` not `List[str]` (Python 3.9+)
4. **Graceful field handling**: Skips missing fields instead of erroring
5. **Validation**: Raises ValueError for non-dataclass types

## Testing Strategy

### Test Coverage

1. **test_simple_dataclass**: Basic dict → dataclass conversion
2. **test_nested_dataclass**: Multiple levels of nesting
3. **test_list_of_dataclasses**: Lists containing complex objects
4. **test_list_of_primitives**: Lists of strings/numbers
5. **test_invalid_input**: Error handling for non-dataclass types

### Test Results

**repository_after:**

- 5/5 tests passed
- All tests complete in < 0.1 seconds
- Handles complex nested structures correctly

## Usage Example

```python
import json
from main import from_dict, Company

# Load JSON from API/file
json_data = '{"name": "TechCorp", "founded": 2010, "employees": [...]}'
data = json.loads(json_data)

# Convert to strongly-typed dataclass
company = from_dict(Company, data)

# Type-safe access with IDE support
print(company.name)  # IDE knows this is str
print(company.employees[0].address.city)  # Full autocomplete
```

## Lessons Learned

**What Worked:**

- Type introspection (`get_origin`, `get_args`) enables generic handling
- Recursion naturally handles arbitrary nesting depth
- Dataclass `fields()` provides clean iteration over class structure
- Simple validation prevents misuse

**Key Insight:**
Python's typing module provides runtime introspection of type hints, enabling generic conversion logic that works with any dataclass structure without code generation or metaclasses.

**Reusable Pattern:**
For any dict-to-object conversion:

1. Use `is_dataclass()` to detect complex types
2. Use `get_origin()` to detect containers (list, dict, etc.)
3. Use `get_args()` to extract container element types
4. Recurse for nested structures

## Production Considerations

**Advantages:**

- Zero dependencies (standard library only)
- Type-safe with full IDE support
- Minimal code (~30 lines core logic)
- Easy to understand and maintain
