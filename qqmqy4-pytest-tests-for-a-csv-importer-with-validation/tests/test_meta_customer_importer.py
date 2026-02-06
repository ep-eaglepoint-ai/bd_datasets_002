import importlib.util
import os
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parent.parent


def _resolve_repo_path():
    repo_env = os.environ.get("REPO_PATH")
    if repo_env:
        candidate = Path(repo_env)
        repo_path = candidate if candidate.is_absolute() else (ROOT / repo_env)
    else:
        repo_path = ROOT / "repository_after"
    return repo_path.resolve()


def _repo_tests_path():
    repo_path = _resolve_repo_path()
    return repo_path / "tests" / "test_customer_importer.py"


def _load_repo_tests_module():
    repo_tests_path = _repo_tests_path()
    spec = importlib.util.spec_from_file_location("repo_after_tests", repo_tests_path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load repository tests from {repo_tests_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _read_repo_tests_source():
    repo_tests_path = _repo_tests_path()
    if not repo_tests_path.exists():
        raise AssertionError(f"Missing repository tests at {repo_tests_path}")
    return repo_tests_path.read_text(encoding="utf-8")


def _assert_test_exists(test_name: str):
    module = _load_repo_tests_module()
    assert hasattr(module, test_name), f"Expected {test_name} in repository_after tests"


def _run_repo_test(module, test_name: str, *args):
    test_func = getattr(module, test_name)
    test_func(*args)


def test_valid_customer_inserted():
    _assert_test_exists("test_valid_customer_inserted")


def test_invalid_row_skipped():
    _assert_test_exists("test_invalid_row_skipped")


def test_duplicates_within_csv_skipped():
    _assert_test_exists("test_duplicates_within_csv_skipped")


def test_existing_emails_skipped_as_duplicate():
    _assert_test_exists("test_existing_emails_skipped_as_duplicate")


def test_importstats_all_fields_exact():
    _assert_test_exists("test_importstats_all_fields_exact")


def test_empty_csv():
    _assert_test_exists("test_empty_csv")


def test_header_only_csv():
    _assert_test_exists("test_header_only_csv")


def test_mixed_valid_invalid_duplicates():
    _assert_test_exists("test_mixed_valid_invalid_duplicates")


def test_repository_tests_use_mocks_and_csv_text():
    source = _read_repo_tests_source()
    assert "Mock" in source and "CustomerRepository" in source
    assert "csv_text" in source
    assert "open(" not in source
    assert ".read_text(" not in source


def test_repository_tests_pass_on_real_importer():
    module = _load_repo_tests_module()

    _run_repo_test(module, "test_valid_customer_inserted", module.repo())
    _run_repo_test(module, "test_invalid_row_skipped", module.repo(), "alice@example.com,,US")
    _run_repo_test(module, "test_duplicates_within_csv_skipped", module.repo())
    _run_repo_test(module, "test_existing_emails_skipped_as_duplicate", module.repo())
    _run_repo_test(module, "test_importstats_all_fields_exact", module.repo())
    _run_repo_test(module, "test_empty_csv", module.repo())
    _run_repo_test(module, "test_header_only_csv", module.repo())
    _run_repo_test(module, "test_mixed_valid_invalid_duplicates", module.repo())


def test_repository_tests_fail_on_broken_importer():
    module = _load_repo_tests_module()
    real_importer = module.CustomerImporter

    class BrokenImporter:
        def __init__(self, repo):
            self.repo = repo

        def import_csv(self, csv_text):
            return module.ImportStats(processed=1, inserted=0, skipped_invalid=0, skipped_duplicate=0)

    try:
        module.CustomerImporter = BrokenImporter
        with pytest.raises(AssertionError):
            _run_repo_test(module, "test_valid_customer_inserted", module.repo())
        with pytest.raises(AssertionError):
            _run_repo_test(module, "test_importstats_all_fields_exact", module.repo())
    finally:
        module.CustomerImporter = real_importer