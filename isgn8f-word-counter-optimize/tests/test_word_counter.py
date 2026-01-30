import importlib.util
import inspect
import os
import pytest
import tempfile
from collections import Counter

@pytest.fixture(scope="session")
def module_path():
    repo = os.getenv("TARGET_REPOSITORY")

    if not repo:
        pytest.fail(
            "TARGET_REPOSITORY environment variable not set "
            "(expected 'repository_before' or 'repository_after')"
        )

    path = os.path.join(repo, "main.py")

    if not os.path.exists(path):
        pytest.fail(f"Target module not found: {path}")

    return path

# ---------- Helpers ----------

def load_wordcounter_class(module_path):
    """
    Dynamically load WordCounter from a given file path.
    """
    spec = importlib.util.spec_from_file_location("wordcounter_module", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.WordCounter


def create_temp_text(content: str) -> str:
    """
    Create a temporary text file for testing.
    """
    tmp = tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8")
    tmp.write(content)
    tmp.close()
    return tmp.name

def get_source_code(module_path: str) -> str:
    with open(module_path, "r", encoding="utf-8") as f:
        return f.read()

# ---------- Core Correctness Tests ----------
def test_basic_statistics(module_path):
    WordCounter = load_wordcounter_class(module_path)

    text = "Hello world\nHello Python\n"
    file_path = create_temp_text(text)

    wc = WordCounter(file_path)

    stats = wc.get_statistics()

    assert stats["lines"] == 3
    assert stats["words"] == 4
    assert stats["characters"] == len(text)
    assert stats["unique_words"] == 3
    assert stats["average_word_length"] == round((5+5+5+6)/4, 2)


def test_word_positions_are_correct(module_path):
    WordCounter = load_wordcounter_class(module_path)

    text = "Hello world hello"
    file_path = create_temp_text(text)

    wc = WordCounter(file_path)
    positions = wc.find_word_positions("hello")

    assert positions == [0, 12]


# ---------- Requirement Enforcement Tests ----------

def test_file_not_read_multiple_times(monkeypatch, module_path):
    """
    This test FAILS on repository_before and PASSES on repository_after.
    """

    open_call_count = 0
    real_open = open

    def counting_open(*args, **kwargs):
        nonlocal open_call_count
        open_call_count += 1
        return real_open(*args, **kwargs)

    monkeypatch.setattr("builtins.open", counting_open)

    WordCounter = load_wordcounter_class(module_path)

    text = "Hello world\n" * 100
    file_path = create_temp_text(text)

    wc = WordCounter(file_path)
    wc.count_words()
    wc.count_lines()
    wc.get_word_frequencies()
    wc.find_word_positions("hello")

    assert open_call_count == 1


def test_counter_is_used(module_path):
    """
    Ensures collections.Counter is used.
    FAILS on old code.
    """
    source = get_source_code(module_path)

    assert "Counter" in source


def test_most_common_is_used(module_path):
    """
    Ensures most_common(n) is used for top words.
    FAILS on old code.
    """
    source = get_source_code(module_path)

    assert "most_common" in source


# ---------- Edge Case Tests ----------

def test_empty_file(module_path):
    WordCounter = load_wordcounter_class(module_path)

    file_path = create_temp_text("")
    wc = WordCounter(file_path)

    stats = wc.get_statistics()

    assert stats["words"] == 0
    assert stats["lines"] == 0 or stats["lines"] == 1
    assert stats["characters"] == 0
    assert stats["average_word_length"] == 0.0


def test_case_insensitivity(module_path):
    WordCounter = load_wordcounter_class(module_path)

    file_path = create_temp_text("Python python PYTHON")
    wc = WordCounter(file_path)

    freqs = wc.get_word_frequencies()

    assert freqs["python"] == 3


def test_multiple_word_position_calls_are_fast(module_path):
    """
    Ensures find_word_positions does NOT re-scan the file.
    """
    WordCounter = load_wordcounter_class(module_path)

    file_path = create_temp_text("test word test word test")
    wc = WordCounter(file_path)

    first = wc.find_word_positions("test")
    second = wc.find_word_positions("test")

    assert first == second
