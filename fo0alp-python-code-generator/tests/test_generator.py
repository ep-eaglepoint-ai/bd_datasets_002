import json
import importlib.util
from pathlib import Path
import pytest


ROOT = Path(__file__).resolve().parents[1]

REPOS = {
    "before": ROOT / "repository_before",
    "after": ROOT / "repository_after",
}


def load_module(module_path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "repo_key, should_pass",
    [
        ("before", False),
        ("after", True),
    ],
)
def test_generator_end_to_end(repo_key, should_pass, tmp_path):
    repo = REPOS[repo_key]

    generator_file = repo / "code_generator.py"
    output_file = tmp_path / f"generated_{repo_key}.py"

    config = {
        "classes": {
            "User": {
                "properties": {
                    "name": {"type": "string", "min_length": 2, "max_length": 100},
                    "age": {"type": "integer", "min": 0, "max": 150},
                    "email": {"type": "string", "pattern": r"^[^@]+@[^@]+\.[^@]+$"},
                }
            }
        }
    }
    config_file = tmp_path / "data.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")

    # ---------------------------------------
    # 1️⃣ Import generator
    # ---------------------------------------
    try:
        gen_module = load_module(generator_file, f"gen_{repo_key}")
    except Exception:
        if should_pass:
            pytest.fail("Refactored generator failed to import")
        pytest.fail("Generator failed (expected for before).")

    # ---------------------------------------
    # 2️⃣ Run generator
    # ---------------------------------------
    try:
        generator = gen_module.ConfigParserGenerator(str(config_file))
        generator.generate(str(output_file))
    except Exception:
        if should_pass:
            pytest.fail("Refactored generator failed during generation")
        pytest.fail("Generator failed (expected for before).")

    # ---------------------------------------
    # 3️⃣ Import generated code
    # ---------------------------------------
    try:
        generated = load_module(output_file, f"generated_{repo_key}")
    except Exception:
        if should_pass:
            pytest.fail("Generated module is invalid Python")
        pytest.fail("Generator failed (expected for before).")

    # ---------------------------------------
    # 4️⃣ REQUIREMENT VALIDATION
    # ---------------------------------------

    # Requirement 1: Custom classes
    assert hasattr(generated, "User"), "Missing User class"
    User = generated.User

    # Requirement 4: Type-safe accessors
    user = User(name="Alice", age=30, email="alice@example.com")

    with pytest.raises(TypeError):
        user.age = "thirty"

    # Requirement 2: Input validation
    with pytest.raises(ValueError):
        User(name="A", age=30, email="bad-email")

    # Requirement 3: Serialization
    data = user.to_dict()
    assert isinstance(data, dict)

    # Requirement 3: Deserialization
    user2 = User.from_dict(data)
    assert user2.name == user.name
    assert user2.age == user.age
    assert user2.email == user.email

    if not should_pass:
        pytest.fail("Buggy generator unexpectedly passed all requirements")
