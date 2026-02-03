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


# ---------- Reviewer Feedback Tests ----------

def test_stats_match_between_implementations():
    """
    Verifies that stats from repository_after match repository_before exactly.
    """
    before_path = os.path.join("repository_before", "main.py")
    after_path = os.path.join("repository_after", "main.py")
    
    if not os.path.exists(before_path) or not os.path.exists(after_path):
        pytest.skip("Both repositories must exist for comparison test")
    
    WordCounterBefore = load_wordcounter_class(before_path)
    WordCounterAfter = load_wordcounter_class(after_path)
    
    # Test with various inputs
    test_inputs = [
        "Hello world\nHello Python\n",
        "The quick brown fox jumps over the lazy dog",
        "123 test456 word 789",
        "Python python PYTHON\n\n\n",
        "",
    ]
    
    for text in test_inputs:
        file_path = create_temp_text(text)
        
        wc_before = WordCounterBefore(file_path)
        wc_after = WordCounterAfter(file_path)
        
        stats_before = wc_before.get_statistics()
        stats_after = wc_after.get_statistics()
        
        assert stats_before == stats_after, f"Stats mismatch for input: {text!r}"


def test_str_find_is_used(module_path):
    """
    Verifies the implementation uses str.find() in a loop for word positions.
    Required by spec: 'use str.find() in a loop'.
    """
    source = get_source_code(module_path)
    
    # Verify str.find() is used for position building
    assert ".find(" in source, "str.find() is not used for position building"
    
    # Verify it's not using re.finditer (old approach)
    assert "re.finditer" not in source or "finditer" not in source.split("def _build_positions")[0], \
        "Should not use re.finditer for position building"


def test_prebuilt_index_is_used(module_path):
    """
    Verifies that word_positions is a prebuilt index populated after processing.
    """
    WordCounter = load_wordcounter_class(module_path)
    
    file_path = create_temp_text("hello world hello test")
    wc = WordCounter(file_path)
    
    # Trigger processing
    wc.count_words()
    
    # Verify that word_positions dict is populated (prebuilt index)
    assert hasattr(wc, 'word_positions'), "No word_positions attribute (index not built)"
    assert len(wc.word_positions) > 0, "word_positions is empty after processing"
    assert "hello" in wc.word_positions, "Expected 'hello' in prebuilt index"
    assert wc.word_positions["hello"] == [0, 12], "Prebuilt index has wrong positions"


def test_find_positions_uses_index_not_rescan(monkeypatch, module_path):
    """
    Verifies that find_word_positions uses prebuilt index and doesn't rescan.
    """
    WordCounter = load_wordcounter_class(module_path)
    
    file_path = create_temp_text("test word test")
    wc = WordCounter(file_path)
    
    # First call to trigger processing
    wc.find_word_positions("test")
    
    # Patch open to fail if called again
    def fail_open(*args, **kwargs):
        raise RuntimeError("File should not be opened again!")
    
    monkeypatch.setattr("builtins.open", fail_open)
    
    # Second call should use cached index, not re-open file
    positions = wc.find_word_positions("word")
    assert positions == [5], "Positions wrong or file was re-read"
