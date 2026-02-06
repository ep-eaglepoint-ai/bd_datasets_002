import os
import uuid
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parent.parent


def resolve_repo_path(default_repo_name: str) -> Path:
    repo_env = os.environ.get("REPO_PATH")
    if repo_env:
        candidate = Path(repo_env)
        repo_path = candidate if candidate.is_absolute() else (ROOT / repo_env)
    else:
        repo_path = ROOT / default_repo_name
    return repo_path.resolve()


def load_csv_importer(default_repo_name: str):
    repo_path = resolve_repo_path(default_repo_name)
    module_path = repo_path / "csv_importer.py"
    if not module_path.exists():
        raise ImportError(f"csv_importer.py not found in {repo_path}")

    module_name = f"csv_importer_{repo_path.name}_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    for attr in ("CustomerImporter", "CustomerRepository", "ImportStats"):
        if not hasattr(module, attr):
            raise ImportError(f"{attr} not found in {module_path}")

    return module
