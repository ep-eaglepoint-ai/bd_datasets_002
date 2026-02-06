import sys
import os

# Add repository_after to sys.path to import the implementation
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "repository_after"))
)

try:
    from repository_after import (
        SafeRegex,
        State,
        get_epsilon_closure,
        preprocess_regex,
        shunting_yard,
    )
except ImportError:
    # Handle this in tests so they can be run even before implementation is ready
    SafeRegex = None
    State = None
    get_epsilon_closure = None
    shunting_yard = None
    preprocess_regex = None
    match = None


def test_basic_literals():
    assert SafeRegex("a").match("a") is True
    assert SafeRegex("a").match("b") is False
    assert SafeRegex("abc").match("abc") is True
    assert SafeRegex("abc").match("abd") is False


def test_concatenation():
    assert SafeRegex("ab").match("ab") is True
    assert SafeRegex("abc").match("abc") is True
    assert SafeRegex("ab").match("a") is False
    assert SafeRegex("ab").match("b") is False


def test_alternation():
    assert SafeRegex("a|b").match("a") is True
    assert SafeRegex("a|b").match("b") is True
    assert SafeRegex("a|b").match("c") is False
    assert SafeRegex("a|b|c").match("b") is True


def test_kleene_star():
    assert SafeRegex("a*").match("") is True
    assert SafeRegex("a*").match("a") is True
    assert SafeRegex("a*").match("aaaa") is True
    assert SafeRegex("a*").match("b") is False


def test_precedence():
    # ab* should be a(b*)
    assert SafeRegex("ab*").match("a") is True
    assert SafeRegex("ab*").match("ab") is True
    assert SafeRegex("ab*").match("abb") is True
    assert SafeRegex("ab*").match("abab") is False

    # (ab)* should be (ab)*
    assert SafeRegex("(ab)*").match("") is True
    assert SafeRegex("(ab)*").match("ab") is True
    assert SafeRegex("(ab)*").match("abab") is True
    assert SafeRegex("(ab)*").match("a") is False


def test_complex_expressions():
    assert SafeRegex("a(b|c)*d").match("ad") is True
    assert SafeRegex("a(b|c)*d").match("abd") is True
    assert SafeRegex("a(b|c)*d").match("acd") is True
    assert SafeRegex("a(b|c)*d").match("abbcd") is True
    assert SafeRegex("a(b|c)*d").match("abccb d") is False


def test_full_match_requirement():
    # match must return True only if the entire input string is consumed
    assert SafeRegex("a").match("ab") is False
    assert SafeRegex("ab").match("a") is False


def test_epsilon_loops():
    # (a*)* contains epsilon cycles, should not hang
    assert SafeRegex("(a*)*").match("") is True
    assert SafeRegex("(a*)*").match("a") is True
    assert SafeRegex("(a*)*").match("aaaa") is True

    # a** (if supported/normalized)
    assert SafeRegex("(a*)*b").match("aaaaab") is True


def test_linear_time_complex_pattern():
    # Pattern: (a|a)*b
    # Text: aaaaa...a (no b)
    # Backtracking engines might take long, Thompson's should be linear
    n = 100
    pattern = "(a|a)*b"
    text = "a" * n
    assert SafeRegex(pattern).match(text) is False


def test_no_re_import():
    import repository_after
    import inspect

    source = inspect.getsource(repository_after)
    assert "import re" not in source
    assert "from re import" not in source


def test_explicit_state_class():
    assert State is not None
    s = State()
    assert hasattr(s, "label")
    assert hasattr(s, "edges")
    assert hasattr(s, "epsilon_edges")


def test_complex_precedence():
    assert SafeRegex("(a|b)*c").match("c") is True
    assert SafeRegex("(a|b)*c").match("abc") is True
    assert SafeRegex("(a|b)*c").match("aac") is True
    assert SafeRegex("(a|b)*c").match("ab") is False

    assert SafeRegex("a|b*c").match("a") is True
    assert SafeRegex("a|b*c").match("c") is True
    assert SafeRegex("a|b*c").match("bc") is True
    assert SafeRegex("a|b*c").match("bbc") is True
    assert SafeRegex("a|b*c").match("ab") is False


def test_empty_pattern_and_string():
    assert SafeRegex("").match("") is True
    assert SafeRegex("").match("a") is False
    assert SafeRegex("a*").match("") is True


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


def test_shunting_yard_ir():
    # Requirement: a|b* -> a, b, *, |
    # Preprocessing ab -> a.b
    pattern = preprocess_regex("a|b*")
    postfix = shunting_yard(pattern)
    assert "".join(postfix) == "ab*|"

    pattern2 = preprocess_regex("(ab)*")
    postfix2 = shunting_yard(pattern2)
    assert "".join(postfix2) == "ab.*"


def test_epsilon_closure_implementation():
    # Requirement: Specific helper function to find reachable states via None transitions
    assert get_epsilon_closure is not None

    # Requirement: Maintain a visited set to avoid loops
    import repository_after
    import inspect

    source = inspect.getsource(repository_after.get_epsilon_closure)
    assert "visited" in source
    assert "set()" in source

    # Functional check for epsilon reachable states
    s1 = State()
    s2 = State()
    s3 = State()
    s1.epsilon_edges.append(s2)
    s2.epsilon_edges.append(s3)
    s3.epsilon_edges.append(s1)  # Cycle

    closure = get_epsilon_closure([s1])
    assert s1 in closure
    assert s2 in closure
    assert s3 in closure
    assert len(closure) == 3
