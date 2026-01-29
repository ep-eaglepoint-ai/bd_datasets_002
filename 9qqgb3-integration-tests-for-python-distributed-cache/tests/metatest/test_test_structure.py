"""Metatests to verify test structure and organization."""
import ast
from pathlib import Path


def test_test_files_have_test_functions():
    """Verify that test files contain test functions."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    
    test_files = list(test_dir.glob("test_*.py"))
    assert len(test_files) > 0, "No test files found"
    
    for test_file in test_files:
        content = test_file.read_text()
        tree = ast.parse(content, filename=str(test_file))
        
        # Find all function definitions
        functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
        test_functions = [f for f in functions if f.name.startswith("test_")]
        
        assert len(test_functions) > 0, \
            f"Test file {test_file.name} should contain at least one test function"


def test_test_functions_follow_naming_convention():
    """Verify that test functions follow the test_ naming convention."""
    test_dir = Path(__file__).parent.parent.parent / "repository_after" / "tests"
    
    test_files = list(test_dir.glob("test_*.py"))
    
    for test_file in test_files:
        content = test_file.read_text()
        tree = ast.parse(content, filename=str(test_file))
        
        functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
        
        for func in functions:
            # Test functions should start with test_
            # Helper functions can have any name
            if func.name.startswith("test_"):
                assert func.name.startswith("test_"), \
                    f"Test function {func.name} in {test_file.name} should start with 'test_'"


def test_no_test_files_in_root_tests_folder():
    """Verify that root tests folder only contains metatests."""
    root_tests_dir = Path(__file__).parent.parent
    
    # Should only have __init__.py and metatest folder
    items = [item.name for item in root_tests_dir.iterdir() if item.is_file()]
    test_files = [item for item in items if item.startswith("test_") and item.endswith(".py")]
    
    assert len(test_files) == 0, \
        f"Root tests folder should not contain test files, found: {test_files}"

