import pytest
from dataclasses import dataclass
from repository_after.main import from_dict, Address, Contact, Person, Company


def test_simple_dataclass():
    data = {"street": "123 Main St", "city": "Boston", "zipcode": "02101"}
    address = from_dict(Address, data)
    assert address.street == "123 Main St"
    assert address.city == "Boston"
    assert address.zipcode == "02101"


def test_nested_dataclass():
    data = {
        "name": "Alice",
        "age": 30,
        "address": {"street": "123 Main St", "city": "Boston", "zipcode": "02101"},
        "contact": {"email": "alice@example.com", "phone": "555-0001"},
        "hobbies": ["reading", "hiking"]
    }
    person = from_dict(Person, data)
    assert person.name == "Alice"
    assert person.age == 30
    assert person.address.city == "Boston"
    assert person.contact.email == "alice@example.com"
    assert person.hobbies == ["reading", "hiking"]


def test_list_of_dataclasses():
    data = {
        "name": "TechCorp",
        "founded": 2010,
        "employees": [
            {
                "name": "Alice",
                "age": 30,
                "address": {"street": "123 Main St", "city": "Boston", "zipcode": "02101"},
                "contact": {"email": "alice@example.com", "phone": "555-0001"},
                "hobbies": ["reading"]
            },
            {
                "name": "Bob",
                "age": 25,
                "address": {"street": "456 Oak Ave", "city": "Seattle", "zipcode": "98101"},
                "contact": {"email": "bob@example.com", "phone": "555-0002"},
                "hobbies": ["gaming"]
            }
        ]
    }
    company = from_dict(Company, data)
    assert company.name == "TechCorp"
    assert company.founded == 2010
    assert len(company.employees) == 2
    assert company.employees[0].name == "Alice"
    assert company.employees[1].name == "Bob"


def test_list_of_primitives():
    data = {
        "name": "Alice",
        "age": 30,
        "address": {"street": "123 Main St", "city": "Boston", "zipcode": "02101"},
        "contact": {"email": "alice@example.com", "phone": "555-0001"},
        "hobbies": ["reading", "hiking", "coding"]
    }
    person = from_dict(Person, data)
    assert len(person.hobbies) == 3
    assert "coding" in person.hobbies


def test_invalid_input():
    @dataclass
    class Simple:
        value: str
    
    with pytest.raises(ValueError):
        from_dict(str, {})
