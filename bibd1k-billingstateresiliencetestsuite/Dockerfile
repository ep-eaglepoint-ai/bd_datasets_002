FROM denoland/deno:alpine-1.41.1

WORKDIR /app

# Copy config first for better layer caching
COPY deno.json deno.lock* ./

# Copy source files
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Cache dependencies during build
RUN deno cache --reload repository_after/tests/billing_service_test.ts || true

# Copy the rest
COPY . /app

CMD ["deno", "test", "-A", "repository_after/tests/billing_service_test.ts"]
