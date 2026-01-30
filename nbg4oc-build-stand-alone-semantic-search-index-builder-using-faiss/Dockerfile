FROM python:3.11-slim

WORKDIR /app



COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

CMD ["pytest", "-v", "tests/test_build_index.py"]
