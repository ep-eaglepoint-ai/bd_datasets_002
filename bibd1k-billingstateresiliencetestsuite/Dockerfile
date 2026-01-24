FROM denoland/deno:alpine-1.41.1

WORKDIR /app

# Copy config first for better layer caching
COPY deno.json deno.lock* ./

# Copy source files
COPY tests/ ./tests/
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/
COPY evaluation/ ./evaluation/

# Cache dependencies during build to avoid downloading on every run
RUN deno cache --reload tests/billing_service_test.ts

# Copy the rest
COPY . /app

CMD ["deno", "test", "-A", "tests/billing_service_test.ts"]
