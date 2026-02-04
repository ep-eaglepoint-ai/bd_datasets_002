import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple  # [FIX] Tupel → Tuple


class ConfigParserGenerator:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config = self._load_config()  # [FIX] Proper JSON loading

    def _load_config(self) -> Dict[str, Any]:
        """Load and parse the configuration file."""
        with open(self.config_path, "r") as f:
            return json.load(f)  # [FIX] json.loads(f) → json.load(f)

    def _python_type(self, type_name: str) -> str:
        # [REQ-4] Centralized type mapping for type safety
        return {
            "string": "str",
            "integer": "int",
            "float": "float",
            "boolean": "bool",
        }.get(type_name, "Any")

    def _generate_validator(self, prop_name: str, constraints: Dict[str, Any]) -> str:
        """
        Generates a validation method for a property
        """
        prop_type = constraints.get("type", "string")
        py_type = self._python_type(prop_type)

        lines = [
            f"    def _validate_{prop_name}(self, value):",          # [REQ-2] Validation method
            f"        if not isinstance(value, {py_type}):",         # [REQ-2] Type validation
            f"            raise TypeError('must be {py_type}')",
        ]

        # ---------- STRING VALIDATION ----------
        if prop_type == "string":  # [FIX] '=' → '=='
            if "min_length" in constraints:
                lines.append(
                    f"        if len(value) < {constraints['min_length']}:"
                )
                lines.append(
                    f"            raise ValueError('minimum length is {constraints['min_length']}')"
                )

            if "max_length" in constraints:
                lines.append(
                    f"        if len(value) > {constraints['max_length']}:"
                )
                lines.append(
                    f"            raise ValueError('maximum length is {constraints['max_length']}')"
                )

            if "pattern" in constraints:
                pattern = constraints["pattern"].replace('"', '\\"')
                lines.append(
                    f"        if not re.match(r\"{pattern}\", value):"  # [REQ-2] Regex validation
                )
                lines.append(
                    f"            raise ValueError('invalid format')"
                )

        # ---------- NUMERIC VALIDATION ----------
        if prop_type in ("integer", "float"):
            if "min" in constraints:
                lines.append(
                    f"        if value < {constraints['min']}:"
                )
                lines.append(
                    f"            raise ValueError('minimum value is {constraints['min']}')"
                )

            if "max" in constraints:  # [FIX] constraintz → constraints
                lines.append(
                    f"        if value > {constraints['max']}:"
                )
                lines.append(
                    f"            raise ValueError('maximum value is {constraints['max']}')"
                )

        lines.append("        return value\n")  # [FIX] Ensure validator returns value
        return "\n".join(lines)

    def _generate_class(self, class_name: str, class_config: Dict[str, Any]) -> str:
        """
        Generates a Python class from JSON configuration
        """
        properties = class_config.get("properties", {})  # [REQ-1] Class definition from config

        # ---------- __init__ METHOD ----------
        params = []
        body = []
        for name, cfg in properties.items():
            py_type = self._python_type(cfg.get("type", "string"))
            params.append(f"{name}: {py_type}")               # [REQ-4] Type-safe constructor
            body.append(f"        self.{name} = {name}")      # [REQ-4] Setter enforces validation

        init_method = (
            f"    def __init__(self, {', '.join(params)}):\n"
            + "\n".join(body)
            + "\n"
        )

        # ---------- PROPERTIES ----------
        prop_blocks = []
        validators = []

        for name, cfg in properties.items():
            private = f"_{name}"  # [REQ-4] Private attribute

            prop_blocks.append(
                f"""
    @property
    def {name}(self):
        return self.{private}                       # [REQ-4] Type-safe accessor

    @{name}.setter
    def {name}(self, value):
        value = self._validate_{name}(value)        # [REQ-2] Validation enforced
        self.{private} = value
"""
            )

            validators.append(self._generate_validator(name, cfg))  # [REQ-2]

        # ---------- SERIALIZATION ----------
        to_dict = (
            "    def to_dict(self):\n"
            "        return {\n"
            + "\n".join([f'            "{k}": self.{k},' for k in properties])
            + "\n        }\n"
        )  # [REQ-3] Serialization

        # ---------- DESERIALIZATION ----------
        from_dict = (
            "    @classmethod\n"
            "    def from_dict(cls, data: Dict[str, Any]):\n"
            "        return cls(\n"
            + ",\n".join([f'            {k}=data.get("{k}")' for k in properties])
            + "\n        )\n"
        )  # [REQ-3] Deserialization

        # ---------- STRING REPRESENTATION ----------
        str_method = (
            "    def __str__(self):\n"
            "        values = ', '.join(f\"{k}={v}\" for k, v in self.__dict__.items())\n"
            f"        return f\"{class_name}({{values}})\"\n"
        )

        return (
            f"class {class_name}:\n"     # [REQ-1] Custom class generation
            + init_method
            + "\n".join(prop_blocks)
            + "\n".join(validators)
            + to_dict
            + from_dict
            + str_method
            + "\n"
        )

    def _generate_header(self) -> str:
        return (
            '"""\n'
            "AUTO-GENERATED FILE\n"
            f"Source: {self.config_path}\n"
            f"Generated at: {datetime.utcnow().isoformat()} UTC\n"
            '"""\n\n'
            "import re\n"                     # [FIX] Required for regex validation
            "from typing import Any, Dict\n\n"
        )

    def generate(self, output_path: str) -> None:
        classes = self.config.get("classes", {})  # [REQ-1]

        content = [self._generate_header()]

        for class_name, cfg in classes.items():
            content.append(self._generate_class(class_name, cfg))  # [REQ-1]

        with open(output_path, "w") as f:
            f.write("\n".join(content))  # [FIX] Missing parenthesis fixed

        print(f"Generated {output_path} ({len(classes)} classes)")
