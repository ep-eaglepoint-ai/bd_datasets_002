# Trajectory: Python Code Generator (FO0ALP)

## Context

The generator in `repository_before` reads a JSON config and emits Python classes with properties, validation, `to_dict`, and `from_dict`. It fails on import or at runtime due to typos, wrong APIs, and a few logic bugs. We fixed those so it runs and the generated code passes the tests (REQ-1: custom classes, REQ-2: validation, REQ-3: serialization, REQ-4: type-safe accessors).

---

## 1. Import: `Tupel` → `Tuple`

**Problem:** `from typing import Dict, Any, List, Optional, Tupel` — `Tupel` is undefined, so import fails.

**Fix:**
```python
from typing import Dict, Any, List, Optional, Tuple
```

**Ref:** [typing](https://docs.python.org/3/library/typing.html) — `Tuple` is the correct type.

---

## 2. Config loading: `json.loads(f)` → `json.load(f)`

**Problem:** `json.loads(f)` expects a string. `f` is a file object; passing it causes `TypeError` (or similar). Config never loads.

**Before:**
```python
with open(self.config_path, 'r') as f:
    return json.loads(f)
```

**After:**
```python
with open(self.config_path, "r") as f:
    return json.load(f)
```

**Ref:** [json.load](https://docs.python.org/3/library/json.html#json.load) — `json.load(fp)` deserializes from a file-like object; `json.loads(s)` is for a string.

---

## 3. Validator: `if prop_type = "string"` → `==`

**Problem:** `if prop_type = "string":` is an assignment inside `if`; Python rejects it as invalid syntax.

**Before:**
```python
if prop_type = "string":
    if "min_length" in constraints:
        ...
```

**After:**
```python
if prop_type == "string":
    if "min_length" in constraints:
        ...
```

**Ref:** [Comparisons](https://docs.python.org/3/reference/expressions.html#comparisons) — use `==` for equality in conditions.

---

## 4. Validator: `constraintz` → `constraints`

**Problem:** `if "max" in constraintz:` — `constraintz` is not defined; causes `NameError`.

**After:** Use `constraints` (same as the function parameter and the `"min"` check).

---

## 5. Validator: one `_generate_validator` and `_python_type`

**Problem:** `_validate_type` returns string snippets; `_generate_validator` builds a `List[str]` and joins with `'        ' + v`, which is brittle. `_validate_type(prop_type, "value")` ignores the second argument. The generated `_validate_X` also had no `return value`, so `value = self._validate_X(value)` in the setter would get `None`.

**Fix:**
- Add `_python_type(type_name)` that maps `"string"`→`str`, `"integer"`→`int`, etc.
- Replace `_validate_type` + fragmented logic with a single `_generate_validator(prop_name, constraints)` that returns one string.
- Generated method: `isinstance(value, py_type)` then string/numeric/pattern checks, then `return value`.

**Excerpt (after):**
```python
def _python_type(self, type_name: str) -> str:
    return {"string": "str", "integer": "int", "float": "float", "boolean": "bool"}.get(type_name, "Any")

def _generate_validator(self, prop_name: str, constraints: Dict[str, Any]) -> str:
    lines = [
        f"    def _validate_{prop_name}(self, value):",
        f"        if not isinstance(value, {py_type}):",
        f"            raise TypeError('must be {py_type}')",
    ]
    # ... string (min_length, max_length, pattern), numeric (min, max) ...
    lines.append("        return value\n")
    return "\n".join(lines)
```

**Ref:** [isinstance](https://docs.python.org/3/library/functions.html#isinstance), [re.match](https://docs.python.org/3/library/re.html#re.match), [return](https://docs.python.org/3/reference/simple_stmts.html#return).

---

## 6. `__str__`: stop filtering out `_`-prefixed names

**Problem:** The generated `__str__` did:
```python
for attr, value in self.__dict__.items():
    if not attr.startswith('_'):
        props.append(f"{attr}={value}")
```
The real attributes are `_name`, `_age`, `_email` (stored by the setter). All are filtered out, so `props` is empty and the string is useless.

**After:**
```python
values = ', '.join(f"{k}={v}" for k, v in self.__dict__.items())
return f"{class_name}({values})"
```
No filter; the repr shows `_name=..., _age=..., _email=...`. Alternatively we could map `_name` → `name` for display; the important part is to not drop the only keys in `__dict__`.

**Ref:** [object.`__dict__`](https://docs.python.org/3/library/stdtypes.html#object.__dict__).

---

## 7. `generate` and file write

**Problem:** `f.write('\n'.join(generated_content))` — variable name and parentheses can be wrong in some variants. The writer must receive a single string and the call must be complete.

**After:**
```python
content = [self._generate_header()]
for class_name, cfg in classes.items():
    content.append(self._generate_class(class_name, cfg))
with open(output_path, "w") as f:
    f.write("\n".join(content))
```

**Ref:** [TextIO.write](https://docs.python.org/3/library/io.html#io.TextIOWrapper.write), [str.join](https://docs.python.org/3/library/stdtypes.html#str.join).

---

## 8. `main` and `_generate_unit_tests`: remove

**Problem:** `def main()` is missing the colon (`def main():`), so it’s a syntax error. The task and tests only need `ConfigParserGenerator` and `generate()`; `main` and `_generate_unit_tests` are unused and add failure points.

**Fix:** Remove `main`, `_generate_unit_tests`, and the `if __name__ == "__main__"` block. The module exposes only the generator class and `generate()`.

**Ref:** [Function definitions](https://docs.python.org/3/reference/compound_stmts.html#function-definitions) — `def name():` is required.

---

## 9. Property design (keep, fix the rest)

**What we kept:** `@property` getter returning `self._name`, and `@name.setter` that does `value = self._validate_name(value)` then `self._name = value`. `__init__` uses `self.name = name` so it goes through the setter and validation. That gives type-safe accessors (REQ-4).

**What we fixed:** The validator and `return value` so the setter’s `value = self._validate_X(value)` gets the validated value. Also the typos and `json.load` so the generator runs and emits valid code.

**Ref:** [property](https://docs.python.org/3/library/functions.html#property).

---

## 10. What the generator emits

For each class in the config it generates:

- `__init__(self, name: str, age: int, email: str)` with `self.name = name` (and similarly for other props) so the setter runs.
- For each property: `@property` + `@name.setter`, getter `return self._name`, setter `value = self._validate_name(value); self._name = value`.
- `_validate_name(self, value)` with `isinstance`, then `min_length`/`max_length`/`pattern` for strings, `min`/`max` for int/float, and `return value`.
- `to_dict(self)` → `{ "name": self.name, ... }`.
- `from_dict(cls, data)` → `cls(name=data.get("name"), ...)`.
- `__str__(self)` using `self.__dict__.items()`.

The header adds `import re` and `from typing import Any, Dict` for the generated file.

---

## 11. References (quick lookup)

| Fix | Resource |
|-----|----------|
| `Tupel` → `Tuple` | [typing](https://docs.python.org/3/library/typing.html) |
| `json.loads(f)` → `json.load(f)` | [json.load](https://docs.python.org/3/library/json.html#json.load) |
| `=` → `==` in `if` | [Comparisons](https://docs.python.org/3/reference/expressions.html#comparisons) |
| `constraintz` → `constraints` | — |
| `_generate_validator`, `return value`, `isinstance`, `re.match` | [isinstance](https://docs.python.org/3/library/functions.html#isinstance), [re.match](https://docs.python.org/3/library/re.html#re.match), [return](https://docs.python.org/3/reference/simple_stmts.html#return) |
| `__str__` and `__dict__` | [object.`__dict__`](https://docs.python.org/3/library/stdtypes.html#object.__dict__) |
| `f.write("\n".join(content))` | [TextIO.write](https://docs.python.org/3/library/io.html#io.TextIOWrapper.write), [str.join](https://docs.python.org/3/library/stdtypes.html#str.join) |
| Remove `main` / `def main()` | [Function definitions](https://docs.python.org/3/reference/compound_stmts.html#function-definitions) |
| `@property` / `@x.setter` | [property](https://docs.python.org/3/library/functions.html#property) |
