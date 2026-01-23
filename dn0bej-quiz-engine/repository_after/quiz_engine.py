import json
import sys
from typing import List, Dict, Any


def load_quiz(json_file: str) -> List[Dict[str, Any]]:
    """
    Load and validate quiz questions from a JSON file.

    Args:
        json_file (str): Path to the JSON file containing quiz questions.

    Returns:
        List[Dict[str, Any]]: List of valid quiz questions.

    Raises:
        SystemExit: If the file cannot be loaded or parsed.
    """
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Quiz file '{json_file}' not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{json_file}': {e}")
        sys.exit(1)

    if not isinstance(data, list):
        print("Error: Quiz data must be a list of questions.")
        sys.exit(1)

    questions = []
    seen_prompts = set()
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            print(f"Warning: Question {i+1} is not a dictionary, skipping.")
            continue

        prompt = item.get('prompt')
        choices = item.get('choices')
        answer_index = item.get('answer_index')

        if not isinstance(prompt, str) or not prompt.strip():
            print(f"Warning: Question {i+1} has invalid or missing prompt, skipping.")
            continue

        if prompt in seen_prompts:
            print(f"Warning: Duplicate question '{prompt}', skipping.")
            continue
        seen_prompts.add(prompt)

        if not isinstance(choices, list) or len(choices) < 2:
            print(f"Warning: Question {i+1} has invalid choices (must be list with at least 2 items), skipping.")
            continue

        for j, choice in enumerate(choices):
            if not isinstance(choice, str) or not choice.strip():
                print(f"Warning: Question {i+1}, choice {j+1} is invalid, skipping question.")
                break
        else:
            if not isinstance(answer_index, int) or not (0 <= answer_index < len(choices)):
                print(f"Warning: Question {i+1} has invalid answer_index, skipping.")
                continue
            questions.append({
                'prompt': prompt.strip(),
                'choices': [c.strip() for c in choices],
                'answer_index': answer_index
            })

    if not questions:
        print("Error: No valid questions found in the quiz file.")
        sys.exit(1)

    return questions


def present_question(question: Dict[str, Any]) -> None:
    """
    Present a quiz question to the user in the terminal.

    Args:
        question (Dict[str, Any]): The question dictionary.
    """
    print(f"\n{question['prompt']}")
    for i, choice in enumerate(question['choices']):
        print(f"{i+1}. {choice}")


def get_user_answer(num_choices: int) -> int:
    """
    Get and validate user input for a question answer.

    Args:
        num_choices (int): Number of choices available.

    Returns:
        int: The 0-based index of the chosen answer.
    """
    while True:
        try:
            answer = input("Your answer (enter number): ").strip()
            if not answer:
                print("Input cannot be empty. Please enter a number.")
                continue
            choice = int(answer) - 1  # Convert to 0-based
            if 0 <= choice < num_choices:
                return choice
            else:
                print(f"Invalid choice. Please enter a number between 1 and {num_choices}.")
        except ValueError:
            print("Invalid input. Please enter a valid number.")


def score_quiz(questions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Administer the quiz, collect answers, and score results.

    Args:
        questions (List[Dict[str, Any]]): List of quiz questions.

    Returns:
        Dict[str, Any]: Results including scores and missed questions.
    """
    results = []
    correct_count = 0

    for question in questions:
        present_question(question)
        user_answer = get_user_answer(len(question['choices']))
        is_correct = (user_answer == question['answer_index'])
        if is_correct:
            print("Correct!")
            correct_count += 1
        else:
            print(f"Incorrect. The correct answer is: {question['choices'][question['answer_index']]}")

        results.append({
            'question': question['prompt'],
            'choices': question['choices'],
            'user_answer': user_answer,
            'correct_answer': question['answer_index'],
            'is_correct': is_correct
        })

    return {
        'total_questions': len(questions),
        'correct_count': correct_count,
        'percentage': round((correct_count / len(questions)) * 100, 2),
        'results': results
    }


def display_report(quiz_results: Dict[str, Any]) -> None:
    """
    Display the final quiz score report.

    Args:
        quiz_results (Dict[str, Any]): The quiz scoring results.
    """
    print("\n" + "="*50)
    print("QUIZ RESULTS")
    print("="*50)
    print(f"Total Questions: {quiz_results['total_questions']}")
    print(f"Correct Answers: {quiz_results['correct_count']}")
    print(f"Percentage: {quiz_results['percentage']}%")

    if quiz_results['correct_count'] < quiz_results['total_questions']:
        print("\nMissed Questions:")
        for result in quiz_results['results']:
            if not result['is_correct']:
                print(f"- {result['question']}")
                print(f"  Your answer: {result['user_answer'] + 1}. {result['choices'][result['user_answer']]}")
                print(f"  Correct answer: {result['correct_answer'] + 1}. {result['choices'][result['correct_answer']]}")
    else:
        print("\nCongratulations! You got all questions correct.")


def main():
    """
    Main function to run the quiz engine.
    """
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
    else:
        json_file = 'quiz.json'  # Default file

    questions = load_quiz(json_file)
    results = score_quiz(questions)
    display_report(results)


if __name__ == "__main__":
    main()