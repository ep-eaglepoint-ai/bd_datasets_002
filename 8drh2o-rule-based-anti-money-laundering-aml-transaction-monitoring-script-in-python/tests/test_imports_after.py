"""Smoke tests to ensure `repository_after` modules import cleanly.

This test will fail if any import raises an ImportError.
"""
import importlib
import unittest


class ImportSmokeTest(unittest.TestCase):
    def test_import_all_modules(self):
        modules = [
            "repository_after.config",
            "repository_after.io",
            "repository_after.models",
            "repository_after.main",
        ]
        for mod in modules:
            with self.subTest(module=mod):
                loaded = importlib.import_module(mod)
                self.assertIsNotNone(loaded)


if __name__ == "__main__":
    unittest.main()
