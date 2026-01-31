"""Smoke tests to ensure `repository_after.aml` modules import cleanly.

This test will fail if any import raises an ImportError.
"""
import importlib
import unittest


class ImportSmokeTest(unittest.TestCase):
    def test_import_all_modules(self):
        modules = [
            "repository_after.aml.config",
            "repository_after.aml.io",
            "repository_after.aml.models",
            "repository_after.aml.main",
        ]
        for mod in modules:
            with self.subTest(module=mod):
                loaded = importlib.import_module(mod)
                self.assertIsNotNone(loaded)


if __name__ == "__main__":
    unittest.main()
