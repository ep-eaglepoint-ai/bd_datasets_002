FROM python:3.11-slim

WORKDIR /app
COPY . /app
RUN python -m pip install --no-cache-dir -r requirements.txt

CMD ["python", "-m", "pytest", "-q", "tests"]
