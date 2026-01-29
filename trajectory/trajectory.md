# Trajectory - Spam Detection Demo (FastAPI + React)

This document outlines the actual path followed during the development of this feature, including design decisions, technical challenges, and implementation sequence.

## 1. Discovery and Planning
- **Initial State**: Started with a bare repository structure. Noted that `repository_after` was empty except for an `__init__.py`.
- **Strategy**: Decided to build a clean, decoupled full-stack architecture. FastAPI for high-performance ML serving and Vite-React for a modern user experience.

## 2. Backend Foundation (FastAPI)
- **Architecture**: Implemented `main.py` in `repository_after/backend`. 
- **ML Choice**: Opted for a `scikit-learn` Pipeline with `TfidfVectorizer` and `MultinomialNB` as it's the standard for "simple yet effective" text classification.
- **In-Memory Logic**: Designed the system to use a global variable for the model, allowing instant training without the overhead of a database.
- **API Design**: Defined four core endpoints (`/health`, `/train`, `/predict`, `/predict_batch`) with strict Pydantic models to ensure the contract was robust.

## 3. Frontend Development (React + TypeScript)
- **Setup**: Initialized a Vite project with TypeScript.
- **Aesthetic Direction**: Moving away from basic HTML, I implemented a premium "Glassmorphism" design using custom Vanilla CSS. Focused on a dark-mode theme to make it look state-of-the-art.
- **Interactivity**: Built the frontend to be "live". Added features like real-time confidence bars and an editable training dataset table to make the "learning" process visible to the user.

## 4. Testing and Environment Challenges
- **Implementation**: Created `tests/test_backend.py` to verify the logic.
- **Pivot**: Encountered several environment-related issues in the terminal (virtual environment activation and `pytest` visibility).
- **Refinement**: Adjusted the `evaluation.py` script to use `sys.executable` and dynamic environment variables (`REPO_NAME`) to ensure high reliability across different execution contexts.

## 5. Standard Evaluation Logic
- **Integration**: Implemented the `evaluation/` directory and `evaluation.py` script to comply with the project's standard reporting requirements.
- **Metrics**: Added repository line-count metrics to verify implementation compactness.

## 6. Final Polish
- **Documentation**: Created clear READMEs and run instructions.
- **Verification**: Ran the build and server processes manually to ensure the "Quick Train" to "Predict" flow was seamless for the end user.
