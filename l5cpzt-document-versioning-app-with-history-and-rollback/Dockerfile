# --- Stage 1: Backend Base ---
FROM python:3.12-slim AS backend-base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DJANGO_SETTINGS_MODULE config.settings
ENV PYTHONPATH /app:/app/repository_after/backend
ENV DJANGO_SECRET_KEY dev-secret-key-change-in-production
ENV DJANGO_DEBUG True
ENV DJANGO_ALLOWED_HOSTS localhost,127.0.0.1
ENV CORS_ALLOWED_ORIGINS http://localhost:5173,http://127.0.0.1:5173
ENV PYTHONPATH /app:/app/repository_after/backend

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

# --- Stage 3: Frontend Build ---
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY repository_after/frontend/package*.json ./
RUN npm install
COPY repository_after/frontend/ .
RUN npm run build

# --- Stage 4: Frontend Runtime (Dev) ---
FROM node:20-slim AS frontend
WORKDIR /app
COPY repository_after/frontend/package*.json ./
RUN npm install
COPY repository_after/frontend/ .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- Stage 5: Evaluator / Robust Image ---
FROM backend-base AS evaluator
WORKDIR /app
# Install additional test dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything for full evaluation
COPY . .

# Ensure sqlite DB is initialized for evaluation
RUN python repository_after/backend/manage.py migrate

# Default command runs the evaluation
CMD ["python", "evaluation/evaluation.py"]