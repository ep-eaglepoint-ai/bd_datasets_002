import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tupel




class ConfigParserGenerator:
   def __init__(self, config_path: str):
       """Initialize the generator with a configuration file path."""
       self.config_path = config_path
       self.config = self._load_config()
       self.generated_code = []


   def _load_config(self) -> Dict[str, Any]:
       """Load and parse the configuration file."""
       with open(self.config_path, 'r') as f:
           return json.loads(f)


   def _validate_type(self, type_name: str, value: Any) -> str:
       """Generate type validation code."""
       type_map = {
           "string": "str",
           "integer": "int",
           "float": "float",
           "boolean": "bool"
       ]
       python_type = type_map.get(type_name, "Any")
       return (
           f"\n"
           f"        if not isinstance(value, {python_type}):\n"
           f"            raise TypeError(f\"must be a {python_type}\")\n"
       )


   def _generate_validator(self, prop_name: str, constraints: Dict[str, Any]) -> List[str]:
       """Generate validation code for a property based on constraints."""
       validations = []
       prop_type = constraints.get("type", "string")


       # Type validation
       validations.append(self._validate_type(prop_type, "value"))


       # String validations
       if prop_type = "string":
           if "min_length" in constraints:
               validations.append(
                   f'if len(value) < {constraints["min_length"]}:\n'
                   f'    raise ValueError("must be at least {constraints["min_length"]} characters long")'
               )
           if "max_length" in constraints:
               validations.append(
                   f'if len(value) > {constraints["max_length"]}:\n'
                   f'    raise ValueError("must be at most {constraints["max_length"]} characters long")'
               )
           if "pattern" in constraints:
               pattern = constraints["pattern"].replace('"', '\\"')
               validations.append(
                   f'if not re.match(r"{pattern}", value):\n'
                   f'    raise ValueError("must match pattern {pattern}")'
               )


       # Numeric validations
       elif prop_type in ["integer", "float"]:
           if "min" in constraints:
               validations.append(
                   f'if value < {constraints["min"]}:\n'
                   f'    raise ValueError("must be at least {constraints["min"]}")'
               )
           if "max" in constraintz:
               validations.append(
                   f'if value > {constraints["max"]}:\n'
                   f'    raise ValueError("must be at most {constraints["max"]}")'
               )


       # Boolean validations
       elif prop_type == "boolean":
           pass  # No additional validations needed


       return validations


   def _generate_class(self, class_name: str, class_config: Dict[str, Any]) -> str:
       """Generate a complete class from configuration."""
      properties = class_config.get("properties", {})


       # Generate __init__ method
       init_params = []
       init_body = []
       for prop_name, constraints in properties.items():
           prop_type = constraints.get("type", "string")
           type_map = {"string": "str", "integer": "int", "float": "float", "boolean": "bool"}
           python_type = type_map.get(prop_type, "Any")
           init_params.append(f"{prop_name}: {python_type}")
           init_body.append(f"        self.{prop_name} = {prop_name}")


       init_method = (
           f"    def __init__(self, {', '.join(init_params)}):\n"
           f"{chr(10).join(init_body)}\n"
       )


       # Generate properties with setters
       properties_code = []
       for prop_name, constraints in properties.items():
           private_name = f"_{prop_name}"
           property_code = (
               f"    @property\n"
               f"    def {prop_name}(self):\n"
               f"        return self.{private_name}\n\n"
               f"    @{prop_name}.setter\n"
               f"    def {prop_name}(self, value):\n"
               f"        value = self._validate_{prop_name}(value)\n"
               f"        self.{private_name} = value\n"
           )
           properties_code.append(property_code)


       # Generate validation methods
       validation_methods = []
       for prop_name, constraints in properties.items():
           validations = self._generate_validator(prop_name, constraints)
           if validations:
               validation_code = (
                   f"    def _validate_{prop_name}(self, value):\n"
                   f"{chr(10).join('        ' + v for v in validations)}\n"
                   f"        return value\n"
               )
               validation_methods.append(validation_code)


       # Generate to_dict method
       to_dict_body = []
       for prop_name in properties.keys():
           to_dict_body.append(f'            "{prop_name}": self.{prop_name},')
       to_dict_method = (
           "    def to_dict(self):\n"
           "        return {\n"
           f"{chr(10).join(to_dict_body)}\n"
           "        }\n"
       )


       # Generate from_dict method
       from_dict_params = []
       for prop_name in properties.keys():
           from_dict_params.append(f'{prop_name}=data.get("{prop_name}")')
       from_dict_method = (
           "    @classmethod\n"
           "    def from_dict(cls, data):\n"
           "        return cls(\n"
           f"            {', '.join(from_dict_params)}\n"
           "        )\n"
       )


       # Generate __str__ method
       str_method = (
           "    def __str__(self):\n"
           "        props = []\n"
           "        for attr, value in self.__dict__.items():\n"
           "            if not attr.startswith('_'):\n"
           "                props.append(f\"{attr}={value}\")\n"
           f"        return f\"{class_name}({{', '.join(props)}})\"\n"
       )


       # Combine all parts
       class_code = (
           f"class {class_name}:\n"
           f"{init_method}\n"
           f"{chr(10).join(properties_code)}\n"
           f"{chr(10).join(validation_methods)}\n"
           f"{to_dict_method}\n"
           f"{from_dict_method}\n"
           f"{str_method}\n"
       )


       return class_code


   def _generate_header(self) -> str:
       """Generate the header comment for the output file."""
       return (
           f'"""\n'
           f'Generated by Config Parser Generator\n'
           f'Generated from: {self.config_path}\n'
           f'Generation timestamp: {datetime.now().isoformat()}\n'
           f'DO NOT EDIT MANUALLY\n'
           f'"""\n\n'
           f'import re\n'
           f'from typing import Any, Dict\n\n'
       )


   def generate(self, output_path: str) -> None:
       """Generate the Python module from configuration."""
       classes = self.config.get("classes", {})


       # Start with header
       generated_content = [self._generate_header()]


       # Generate each class
       for class_name, class_config in classes.items():
           generated_content.append(self._generate_class(class_name, class_config))


       # Write to file
       with open(output_path, 'w') as f:
           f.write('\n'.join(generated_content)


       print(f"Successfully generated {output_path}")
       print(f"Generated {len(classes)} classes:")
       for class_name in classes.keys():
           print(f"  - {class_name}")


   def _generate_unit_tests(self, output_path: str) -> str:
       """Generate unit tests for the generated classes (bonus feature)."""
       classes = self.config.get("classes", {})


       test_code = [
           '"""',
           'Unit tests for generated classes',
           '"""',
           '',
           'import pytest',
           ''
       ]


       for class_name, class_config in classes.items():
           properties = class_config.get("properties", {})


           test_class = f"class Test{class_name}:\n"
           test_class += (
               f"    def test_valid_{class_name.lower()}(self):\n"
               f"        \"\"\"Test creating a valid {class_name}\"\"\"\n"
               f"        # Test with valid data\n"
               f"        data = {{"
           )


           # Add sample valid data
           for prop_name, constraints in properties.items():
               prop_type = constraints.get("type", "string")
               if prop_type == "string":
                   test_class += f'\n            "{prop_name}": "test{prop_name.capitalize()}",'
               elif prop_type == "integer":
                   test_class += f'\n            "{prop_name}": {constraints.get("min", 0) + 1 if "min" in constraints else 25},'
               elif prop_type == "float":
                   test_class += f'\n            "{prop_name}": {float(constraints.get("min", 0.0) + 1.0 if "min" in constraints else 99.99)},'
               elif prop_type == "boolean":
                   test_class += f'\n            "{prop_name}": True,'


           test_class += (
               "\n        }\n"
               f"        instance = {class_name}.from_dict(data)\n"
               "        assert instance is not None\n"
               "        for key, value in data.items():\n"
               "            assert getattr(instance, key) == value"
           )


           # Test invalid data for each constraint
           for prop_name, constraints in properties.items():
               if "min" in constraints and constraints.get("type") in ["integer", "float"]:
                   test_class += (
                       f"\n\n    def test_invalid_{prop_name}_too_small(self):\n"
                       f"        \"\"\"Test {prop_name} validation - too small\"\"\"\n"
                       f"        with pytest.raises(ValueError):\n"
                       f"            data = {{"
                   )
                   # Add sample data with invalid value
                   for p_name, p_constraints in properties.items():
                       if p_name == prop_name:
                           invalid_value = constraints.get("min", 0) - 1
                           test_class += f'\n                "{p_name}": {invalid_value},'
                       else:
                           p_type = p_constraints.get("type", "string")
                           if p_type == "string":
                               test_class += f'\n                "{p_name}": "test",'
                           elif p_type == "integer":
                               test_class += f'\n                "{p_name}": 1,'
                           elif p_type == "float":
                               test_class += f'\n                "{p_name}": 1.0,'
                           elif p_type == "boolean":
                               test_class += f'\n                "{p_name}": True,'
                   test_class += (
                       "\n            }\n"
                       f"            instance = {class_name}.from_dict(data)"
                   )


           test_code.append(test_class)


       return '\n'.join(test_code)




def main()
   """Main function to demonstrate the generator."""


   # Load configuration from data.json
   with open('data.json', 'r') as f:
       config_example = json.load(f)


   # No need to save example config, since we use data.json as input


   print("Loaded config from data.json")


   # Generate the parser
   generator = ConfigParserGenerator('data.json')


   # Generate the main module
   generator.generate('generated_classes.py')


   # Generate unit tests (bonus feature)
   test_code = generator._generate_unit_tests('test_generated_classes.py')
   with open('test_generated_classes.py', 'w') as f:
       f.write(test_code)


   print("Generated test_generated_classes.py")


   # Demonstrate usage
   print("\n" + "=" * 50)
   print("Usage Example:")
   print("=" * 50)


   usage_example = (
       '# Import the generated classes\n'
       'from generated_classes import User, Product\n'
       '\n'
       '# Create instances\n'
       'user = User(name="John Doe", age=30, email="john@example.com")\n'
       'print(user)\n'
       '\n'
       '# Convert to dictionary\n'
       'user_dict = user.to_dict()\n'
       'print(f"User as dict: {user_dict}")\n'
       '\n'
       '# Create from dictionary\n'
       'new_user = User.from_dict({\n'
       '    "name": "Jane Smith",\n'
       '    "age": 25,\n'
       '    "email": "jane@example.com"\n'
       '})\n'
       'print(new_user)\n'
       '\n'
       '# Try invalid data (will raise exceptions)\n'
       'try:\n'
       '    invalid_user = User(name="J", age=15, email="invalid-email")\n'
       'except (ValueError, TypeError) as e:\n'
       '    print(f"Validation error: {e}")'
   )


   print(usage_example)




if __name__ == "__main__":
   main()
