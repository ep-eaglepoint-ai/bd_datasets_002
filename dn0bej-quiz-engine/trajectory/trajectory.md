# Trajectory: Building a Single-File Python Quiz Engine

## 1. Problem Statement
I started by reading the problem statement: "Build a single-file Python quiz engine that loads multiple-choice questions from a JSON file, presents them interactively in the terminal, and scores user responses while gracefully handling invalid inputs, malformed data, and missing fields. The program must track correct/incorrect answers, provide per-question feedback, and display a final score report with percentages and missed question reviews. The implementation must demonstrate robust file I/O, data validation, and terminal interaction in a fully offline, testable, and extensible format."

I understood this as needing to create a command-line quiz application that reads questions from JSON, interacts with the user, validates everything, and provides feedback, all in one Python file without external dependencies.

## 2. Requirements
I listed out the 9 specific requirements:
1. Load quiz from JSON with prompt, choices (list), answer_index (int)
2. Interactive terminal answers by number
3. Validate input: non-integer, out-of-range, empty → reprompt
4. Final report: total correct, percentage, missed questions with answers
5. Handle JSON errors: malformed, missing keys, empty lists, duplicates
6. Single file with modular functions
7. Allow different JSON files via command line
8. No external libraries
9. Clear, testable code with logical function separation

## 3. Constraints
Key constraints I identified:
- Single Python file (no multi-file project)
- Only Python standard library (no pip installs)
- Fully offline operation
- Interactive terminal interface (no GUI)
- Robust error handling without crashing
- Easy to test and extend
- Command-line argument support for JSON file

## 4. Research
I researched Python best practices for this type of application:

- **JSON handling**: Read Python's json module documentation (https://docs.python.org/3/library/json.html) to understand loading and error handling
- **Input validation**: Studied input() function and exception handling (https://docs.python.org/3/library/functions.html#input)
- **Command-line args**: Reviewed sys.argv usage (https://docs.python.org/3/library/sys.html#sys.argv)
- **Testing**: Looked at pytest documentation for unit testing (https://docs.pytest.org/)
- **File I/O**: Referenced pathlib and open() for robust file operations (https://docs.python.org/3/library/pathlib.html)
- **Code structure**: Read PEP 8 style guide (https://peps.python.org/pep-0008/) and function design principles

I also searched for similar quiz implementations on GitHub to see patterns, but focused on standard library approaches.

## 5. Choosing Methods and Why
I chose a modular function-based approach because:
- Requirement 6 specifies "modular functions for loading, displaying, validating, scoring, and reporting"
- Makes testing easier (requirement 9)
- Single file but logically separated
- Easier to maintain and extend

For JSON validation, I chose to skip invalid questions rather than fail completely, because requirement 5 says "handle gracefully" and "without crashing", allowing partial success.

For input validation, I used a loop with try-except because it's robust and handles all invalid cases (non-int, out-of-range, empty) as required.

I chose sys.exit for fatal errors (no valid questions) because it's appropriate for CLI tools when there's nothing to do.

For duplicate detection, I used a set of prompts because it's efficient and simple.

## 6. Solution Implementation and Explanation
I implemented the solution in `repository_after/quiz_engine.py`:

First, I created `load_quiz()` function that:
- Opens and parses JSON with error handling
- Validates each question's structure
- Skips invalid questions with warnings
- Exits if no valid questions remain
- Returns list of validated questions

Then, `present_question()` to display question and choices numbered 1-N.

Then, `get_user_answer()` with input loop:
- Reads input, strips whitespace
- Checks for empty
- Tries int conversion
- Validates range
- Reprompts on any error

Then, `score_quiz()` orchestrates the quiz:
- For each question: present, get answer, check correctness, give feedback
- Collects results with full data for reporting

Finally, `display_report()` shows summary and missed questions with correct answers.

Main function handles command-line args and calls the flow.

I added type hints and docstrings for clarity.

## 7. How Solution Handles Constraints, Requirements, and Edge Cases
The solution meets all requirements:

**Requirements 1-4,7**: JSON loading with required fields, interactive numbered answers, input validation with reprompting, score report with percentages and missed details, command-line JSON file support.

**Requirement 5**: Handles malformed JSON (JSONDecodeError), missing keys (skips), empty lists (exits), duplicates (skips with warning).

**Requirement 6**: Single file with modular functions: load_quiz, present_question, get_user_answer, score_quiz, display_report, main.

**Requirement 8**: Only uses json, sys, typing - all standard library.

**Requirement 9**: Functions are logical, focused, with clear names and docs for easy testing.

**Edge cases handled**:
- File not found: exits with message
- Malformed JSON: exits with error
- Non-list JSON: exits
- Questions not dict: skips
- Missing prompt/choices/answer_index: skips
- Choices not list or <2 items: skips
- Empty/invalid choice strings: skips question
- answer_index not int or out of range: skips
- Duplicate prompts: skips
- No valid questions after filtering: exits
- User input: empty, non-numeric, out-of-range all reprompt
- EOF during input: handled by input() raising EOFError (though in testing it exits)

The implementation is robust, testable, and follows Python best practices.
