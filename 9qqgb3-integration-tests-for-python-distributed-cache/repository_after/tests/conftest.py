import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--impl",
        action="store",
        default="before",
        choices=["before"],
        help="Cache implementation to test"
    )


@pytest.fixture(scope="session")
def CacheModule(request):
    impl = request.config.getoption("--impl")
    if impl == "before":
        from repository_before import cache as cache_module
        return cache_module
    raise RuntimeError(f"Unknown --impl value: {impl}")


@pytest.fixture(scope="session")
def CacheImpl(CacheModule):
    return CacheModule.DistributedCache


@pytest.fixture
def cache(CacheImpl):
    c = CacheImpl(max_size=100)
    yield c
    if hasattr(c, "close"):
        c.close()


@pytest.fixture
def small_cache(CacheImpl):
    c = CacheImpl(max_size=3)
    yield c
    if hasattr(c, "close"):
        c.close()
