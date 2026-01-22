FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install pytest
CMD ["python", "-m", "pytest", "-v", "tests/"]
