import json
from dataclasses import dataclass, fields, is_dataclass
from typing import Any, Type, TypeVar, get_args, get_origin

T = TypeVar('T')


def from_dict(cls: Type[T], data: dict) -> T:
    """Convert a dictionary to a dataclass instance."""
    if not is_dataclass(cls):
        raise ValueError(f"{cls} is not a dataclass")
    
    field_values = {}
    for field in fields(cls):
        if field.name not in data:
            continue
        
        value = data[field.name]
        field_type = field.type
        
        if is_dataclass(field_type):
            field_values[field.name] = from_dict(field_type, value)
        elif get_origin(field_type) is list:
            item_type = get_args(field_type)[0]
            if is_dataclass(item_type):
                field_values[field.name] = [from_dict(item_type, item) for item in value]
            else:
                field_values[field.name] = value
        else:
            field_values[field.name] = value
    
    return cls(**field_values)


@dataclass
class Address:
    street: str
    city: str
    zipcode: str


@dataclass
class Contact:
    email: str
    phone: str


@dataclass
class Person:
    name: str
    age: int
    address: Address
    contact: Contact
    hobbies: list[str]


@dataclass
class Company:
    name: str
    employees: list[Person]
    founded: int


if __name__ == "__main__":
    json_data = """
    {
        "name": "TechCorp",
        "founded": 2010,
        "employees": [
            {
                "name": "Alice",
                "age": 30,
                "address": {
                    "street": "123 Main St",
                    "city": "Boston",
                    "zipcode": "02101"
                },
                "contact": {
                    "email": "alice@example.com",
                    "phone": "555-0001"
                },
                "hobbies": ["reading", "hiking"]
            },
            {
                "name": "Bob",
                "age": 25,
                "address": {
                    "street": "456 Oak Ave",
                    "city": "Seattle",
                    "zipcode": "98101"
                },
                "contact": {
                    "email": "bob@example.com",
                    "phone": "555-0002"
                },
                "hobbies": ["gaming", "cooking"]
            }
        ]
    }
    """
    
    data = json.loads(json_data)
    company = from_dict(Company, data)
    
    print(f"Company: {company.name}")
    print(f"Founded: {company.founded}")
    print(f"Employees: {len(company.employees)}")
    for emp in company.employees:
        print(f"  - {emp.name}, {emp.age}, {emp.address.city}")
