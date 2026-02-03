import json
import tempfile
import os
import sys
import pytest
from pathlib import Path

# Add repository_after to path
sys.path.insert(0, str(Path(__file__).parent.parent / "repository_after"))

from quiz_engine import load_quiz


def test_load_quiz_valid():
    """Test loading a valid quiz JSON."""
    quiz_data = [
        {
            "prompt": "What is 2+2?",
            "choices": ["3", "4", "5"],
            "answer_index": 1
        }
    ]
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(quiz_data, f)
        f.flush()
        questions = load_quiz(f.name)
    os.unlink(f.name)

    assert len(questions) == 1
    assert questions[0]['prompt'] == "What is 2+2?"
    assert questions[0]['choices'] == ["3", "4", "5"]
    assert questions[0]['answer_index'] == 1


def test_load_quiz_missing_file():
    """Test loading from non-existent file."""
    try:
        load_quiz("nonexistent.json")
        assert False, "Should have exited"
    except SystemExit:
        pass


def test_load_quiz_malformed_json():
    """Test loading malformed JSON."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write("{ invalid json")
        f.flush()
        try:
            load_quiz(f.name)
            assert False, "Should have exited"
        except SystemExit:
            pass
    os.unlink(f.name)


def test_load_quiz_not_list():
    """Test loading JSON that is not a list."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"key": "value"}, f)
        f.flush()
        try:
            load_quiz(f.name)
            assert False, "Should have exited"
        except SystemExit:
            pass
    os.unlink(f.name)


def test_load_quiz_empty_list():
    """Test loading empty question list."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump([], f)
        f.flush()
        try:
            load_quiz(f.name)
            assert False, "Should have exited"
        except SystemExit:
            pass
    os.unlink(f.name)


def test_load_quiz_invalid_question():
    """Test loading with invalid question (missing fields)."""
    quiz_data = [
        {
            "prompt": "Question?",
            "choices": ["A", "B"],
            "answer_index": 0
        },
        {
            "choices": ["A", "B"],  # missing prompt
            "answer_index": 0
        }
    ]
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(quiz_data, f)
        f.flush()
        questions = load_quiz(f.name)
    os.unlink(f.name)

    assert len(questions) == 1  # only valid one loaded


def test_load_quiz_duplicate_prompt():
    """Test loading with duplicate prompts."""
    quiz_data = [
        {
            "prompt": "Same question?",
            "choices": ["A", "B"],
            "answer_index": 0
        },
        {
            "prompt": "Same question?",  # duplicate
            "choices": ["C", "D"],
            "answer_index": 1
        }
    ]
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(quiz_data, f)
        f.flush()
        questions = load_quiz(f.name)
    os.unlink(f.name)

    assert len(questions) == 1  # only first loaded


def test_load_quiz_invalid_choices():
    """Test loading with invalid choices."""
    quiz_data = [
        {
            "prompt": "Question?",
            "choices": ["A"],  # too few
            "answer_index": 0
        },
        {
            "prompt": "Question2?",
            "choices": ["A", ""],  # empty choice
            "answer_index": 0
        }
    ]
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(quiz_data, f)
        f.flush()
        with pytest.raises(SystemExit):
            load_quiz(f.name)
    os.unlink(f.name)


def test_load_quiz_invalid_answer_index():
    """Test loading with invalid answer_index."""
    quiz_data = [
        {
            "prompt": "Question?",
            "choices": ["A", "B", "C"],
            "answer_index": 3  # out of range
        }
    ]
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(quiz_data, f)
        f.flush()
        with pytest.raises(SystemExit):
            load_quiz(f.name)
    os.unlink(f.name)