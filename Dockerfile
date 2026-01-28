FROM python:3.11-slim
WORKDIR /app
COPY . /app

# Install Go and Ubuntu packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget curl ca-certificates git build-essential \
    && wget -O go.tar.gz https://go.dev/dl/go1.22.0.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go.tar.gz \
    && rm go.tar.gz \
    && rm -rf /var/lib/apt/lists/*

# Set up Go environment
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/root/go"
ENV GOBIN="/root/go/bin"

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Make Go available system-wide
RUN ln -sf /usr/local/go/bin/go /usr/bin/go

CMD ["python3", "-m", "evaluation.evaluation"]
