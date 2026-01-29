FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
ENV REPO_TYPE=after
CMD ["pytest", "-v", "--tb=short", "tests/"]
