import pytest

# Configure pytest-asyncio to automatically detect async tests
pytest_plugins = ('pytest_asyncio',)

def pytest_configure(config):
    config.option.asyncio_mode = "auto"
