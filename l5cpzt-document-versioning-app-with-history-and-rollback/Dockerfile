# --- Stage 1: Backend Base ---
FROM python:3.12-slim AS backend-base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY repository_after/backend/requirements.txt ./backend-requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend-requirements.txt

# --- Stage 2: Backend Runtime ---
FROM backend-base AS backend
COPY repository_after/backend/ .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# --- Stage 3: Frontend Runtime ---
FROM node:20-slim AS frontend
WORKDIR /app
COPY repository_after/frontend/package*.json ./
RUN npm install
COPY repository_after/frontend/ .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Stage 4: Evaluator / Test Runner ---
FROM python:3.12-slim AS evaluator
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "evaluation/evaluation.py"]