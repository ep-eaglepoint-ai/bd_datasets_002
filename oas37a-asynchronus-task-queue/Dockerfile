FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Default command runs tests against repository_after
CMD ["pytest", "-v", "tests", "--repo-path", "repository_after"]
