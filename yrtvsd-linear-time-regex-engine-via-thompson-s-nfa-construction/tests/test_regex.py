import pytest
import sys
import os

# Add repository_after to sys.path to import the implementation
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'repository_after')))

try:
    from repository_after import match, State
except ImportError:
    # Handle this in tests so they can be run even before implementation is ready
    match = None
    State = None

def test_basic_literals():
    assert match("a", "a") is True
    assert match("a", "b") is False
    assert match("abc", "abc") is True
    assert match("abc", "abd") is False

def test_concatenation():
    assert match("ab", "ab") is True
    assert match("abc", "abc") is True
    assert match("ab", "a") is False
    assert match("ab", "b") is False

def test_alternation():
    assert match("a|b", "a") is True
    assert match("a|b", "b") is True
    assert match("a|b", "c") is False
    assert match("a|b|c", "b") is True

def test_kleene_star():
    assert match("a*", "") is True
    assert match("a*", "a") is True
    assert match("a*", "aaaa") is True
    assert match("a*", "b") is False

def test_precedence():
    # ab* should be a(b*)
    assert match("ab*", "a") is True
    assert match("ab*", "ab") is True
    assert match("ab*", "abb") is True
    assert match("ab*", "abab") is False
    
    # (ab)* should be (ab)*
    assert match("(ab)*", "") is True
    assert match("(ab)*", "ab") is True
    assert match("(ab)*", "abab") is True
    assert match("(ab)*", "a") is False

def test_complex_expressions():
    assert match("a(b|c)*d", "ad") is True
    assert match("a(b|c)*d", "abd") is True
    assert match("a(b|c)*d", "acd") is True
    assert match("a(b|c)*d", "abbcd") is True
    assert match("a(b|c)*d", "abccb d") is False # space not allowed unless in pattern

def test_full_match_requirement():
    # match must return True only if the entire input string is consumed
    assert match("a", "ab") is False
    assert match("ab", "a") is False

def test_epsilon_loops():
    # (a*)* contains epsilon cycles, should not hang
    assert match("(a*)*", "") is True
    assert match("(a*)*", "a") is True
    assert match("(a*)*", "aaaa") is True
    
    # a** (if supported/normalized)
    assert match("(a*)*b", "aaaaab") is True

def test_linear_time_complex_pattern():
    # Pattern: (a|a)*b
    # Text: aaaaa...a (no b)
    # Backtracking engines might take long, Thompson's should be linear
    n = 100
    pattern = "(a|a)*b"
    text = "a" * n
    assert match(pattern, text) is False

def test_no_re_import():
    import repository_after
    import inspect
    source = inspect.getsource(repository_after)
    assert "import re" not in source
    assert "from re import" not in source

def test_explicit_state_class():
    assert State is not None
    s = State()
    assert hasattr(s, 'label')
    assert hasattr(s, 'edges')
    assert hasattr(s, 'epsilon_edges')

def test_complex_precedence():
    assert match("(a|b)*c", "c") is True
    assert match("(a|b)*c", "abc") is True
    assert match("(a|b)*c", "aac") is True
    assert match("(a|b)*c", "ab") is False
    
    assert match("a|b*c", "a") is True
    assert match("a|b*c", "c") is True
    assert match("a|b*c", "bc") is True
    assert match("a|b*c", "bbc") is True
    assert match("a|b*c", "ab") is False

def test_empty_pattern_and_string():
    assert match("", "") is True
    assert match("", "a") is False
    assert match("a*", "") is True

def test_no_recursive_match_calls():
    import repository_after
    import inspect
    source = inspect.getsource(repository_after.match)
    lines = source.splitlines()
    match_calls = 0
    for line in lines:
        if "match(" in line and "def match(" not in line:
            match_calls += 1
    assert match_calls == 0

def test_active_states_set_efficiency_refined():
    import repository_after
    import inspect
    source = inspect.getsource(repository_after.match)
    assert "set()" in source or "Set()" in source
    assert "current_states = []" not in source
