# Spam Detection Demo

A simple, elegant full-stack application for detecting spam messages using a Naive Bayes classifier.

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will be available at `http://localhost:8000`.

## Frontend Setup (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

## Features

- **In-memory Machine Learning**: Uses `scikit-learn` Pipeline with `TfidfVectorizer` and `MultinomialNB`.
- **Real-time Training**: Add/remove training examples and retrain the model instantly.
- **Batch Prediction Support**: Backend supports single and batch predictions.
- **Modern UI**: Clean, responsive interface with probability visualization.
- **Health Monitoring**: Integrated health checks for backend status.
