FROM eclipse-temurin:17-jdk-jammy

# Install utilities and git
RUN apt-get update && \
    apt-get install -y git dos2unix && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire project
COPY . .

# Default command (overridden by docker-compose)
CMD ["/bin/bash", "-c", "javac -d evaluation_bin evaluation/Evaluation.java && java -ea -cp evaluation_bin evaluation.Evaluation"]
