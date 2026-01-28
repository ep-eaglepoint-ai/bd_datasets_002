FROM eclipse-temurin:21-jdk
WORKDIR /app
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
COPY . /app
# Default command placeholder, overridden by docker-compose
CMD ["sh", "-c", "echo 'Use docker compose run test'"]
