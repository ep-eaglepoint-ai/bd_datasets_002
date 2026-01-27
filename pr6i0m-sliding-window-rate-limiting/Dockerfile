# Use a base image with Java 17 and Maven
FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

# Copy the POM file first to cache dependencies
COPY pom.xml .

# Download dependencies (this layer will be cached unless pom.xml changes)
RUN mvn dependency:go-offline

# Create directory structure for code
RUN mkdir -p src/main/java/com/example/ratelimiter
RUN mkdir -p src/test/java/com/example/ratelimiter
RUN mkdir -p src/main/java/com/example/evaluation

# Copy the Test file into the image
COPY tests/RateLimiterTest.java src/test/java/com/example/ratelimiter/

# Copy the evaluation class
COPY evaluation/Evaluation.java src/main/java/com/example/evaluation/

# Default entrypoint
CMD ["mvn", "exec:java", "-Dexec.mainClass=com.example.evaluation.Evaluation"]
