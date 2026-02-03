"""Test configuration with dynamic path selection."""

import os
import sys
import importlib
import pytest


def get_target_repository():
    """Get target repository from environment variable."""
    return os.environ.get('TARGET_REPOSITORY', 'repository_after')


def import_module_from_repository(module_name: str):
    """Import a module from the target repository."""
    target_repo = get_target_repository()
    full_module_name = f"{target_repo}.{module_name}"
    
    try:
        return importlib.import_module(full_module_name)
    except ImportError:
        return None


def import_from_repository(item_name: str, module_name: str = None):
    """Import an item from the target repository."""
    target_repo = get_target_repository()
    
    try:
        if module_name:
            full_module_name = f"{target_repo}.{module_name}"
            module = importlib.import_module(full_module_name)
        else:
            module = importlib.import_module(target_repo)
        
        return getattr(module, item_name, None)
    except (ImportError, AttributeError):
        return None


@pytest.fixture
def target_repo():
    """Fixture to get target repository name."""
    return get_target_repository()


@pytest.fixture
def repo_module():
    """Fixture to get the main repository module."""
    target_repo = get_target_repository()
    try:
        return importlib.import_module(target_repo)
    except ImportError:
        pytest.skip(f"Repository {target_repo} not available")


@pytest.fixture
def key_pair_class(repo_module):
    """Fixture to get KeyPair class."""
    KeyPair = getattr(repo_module, 'KeyPair', None)
    if KeyPair is None:
        pytest.skip("KeyPair class not implemented")
    return KeyPair


@pytest.fixture
def multi_sig_wallet_class(repo_module):
    """Fixture to get MultiSigWallet class."""
    MultiSigWallet = getattr(repo_module, 'MultiSigWallet', None)
    if MultiSigWallet is None:
        pytest.skip("MultiSigWallet class not implemented")
    return MultiSigWallet


@pytest.fixture
def signature_coordinator_class(repo_module):
    """Fixture to get SignatureCoordinator class."""
    SignatureCoordinator = getattr(repo_module, 'SignatureCoordinator', None)
    if SignatureCoordinator is None:
        pytest.skip("SignatureCoordinator class not implemented")
    return SignatureCoordinator


@pytest.fixture
def nonce_registry_class(repo_module):
    """Fixture to get NonceRegistry class."""
    NonceRegistry = getattr(repo_module, 'NonceRegistry', None)
    if NonceRegistry is None:
        pytest.skip("NonceRegistry class not implemented")
    return NonceRegistry
