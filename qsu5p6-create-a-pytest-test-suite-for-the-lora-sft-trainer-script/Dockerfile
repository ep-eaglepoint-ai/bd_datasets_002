FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Install CPU-only PyTorch FIRST
# (prevents CUDA / Triton / NVIDIA downloads)
# -----------------------------
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# -----------------------------
# Install remaining test requirements
# (NO bitsandbytes)
# -----------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Ensure tests can locate trainer.py
ENV PYTHONPATH="/app/repository_after/my_lora_project/src/model:/app"

# Default command: run unit tests
CMD ["pytest", "repository_after/my_lora_project/tests/test_lora_sft.py"]
