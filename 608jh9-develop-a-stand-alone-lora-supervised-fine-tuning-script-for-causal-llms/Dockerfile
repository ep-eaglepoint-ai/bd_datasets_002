FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
	HF_HUB_DISABLE_TELEMETRY=1 \
	WANDB_DISABLED=true \
	TOKENIZERS_PARALLELISM=false
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app
CMD ["pytest", "-v", "tests/sft_lora_test.py"]
