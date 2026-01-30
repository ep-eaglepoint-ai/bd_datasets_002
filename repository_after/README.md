# Spam Detection Demo

## Overview
A minimal full-stack application to demonstrate spam detection using a Naive Bayes classifier.
- **Backend**: FastAPI
- **Frontend**: React
- **Model**: Scikit-learn (In-memory)

## Run Instructions

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
The UI will be available at `http://localhost:5173` (or similar Vite port).

## API Endpoints
- `GET /health`: Health check
- `POST /train`: Train model with data
- `POST /predict`: Predict single message
- `POST /predict_batch`: Predict multiple messages
