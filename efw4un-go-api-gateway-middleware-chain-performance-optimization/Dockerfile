FROM public.ecr.aws/docker/library/golang:1.23-bookworm
WORKDIR /app
ENV GOWORK=off
COPY . .
CMD ["go", "test", "-v", "./tests/..."]
