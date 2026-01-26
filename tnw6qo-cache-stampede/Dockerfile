# Dockerfile for Cache Stampede Prevention evaluation
FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

# Copy all project files
COPY . .

# Build the solution
RUN cd repository_after && mvn compile -q

# Build the tests (copy source first)
RUN mkdir -p tests/src/main/java/cache && \
    cp repository_after/src/main/java/cache/*.java tests/src/main/java/cache/
RUN cd tests && mvn compile test-compile -q

# Build the evaluation
RUN cd evaluation && mvn compile -q

# Default command runs evaluation
CMD ["sh", "-c", "cd /app && mvn -f evaluation/pom.xml exec:java -q"]
