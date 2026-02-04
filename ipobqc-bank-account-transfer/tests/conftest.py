def pytest_addoption(parser):
    parser.addoption("--repo", action="store", default="after")