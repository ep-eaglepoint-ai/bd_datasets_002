FROM maven:3.8.6-openjdk-11-slim

WORKDIR /app

# Copy pom.xml first for dependency caching
COPY tests/pom.xml ./pom.xml

# Download dependencies
RUN mvn dependency:go-offline -B

# Create source directory structure
RUN mkdir -p src/main/java/com/example/users
RUN mkdir -p src/main/java/com/example/evaluation
RUN mkdir -p src/test/java/com/example/users
RUN mkdir -p reports

# Copy test files
COPY tests/UserBatchControllerTest.java src/test/java/com/example/users/

# Copy both repository versions
COPY repository_before/UserBatch.java /app/repository_before/UserBatch.java
COPY repository_after/UserBatch.java /app/repository_after/UserBatch.java

# Copy evaluation class
COPY evaluation/evaluation.java src/main/java/com/example/evaluation/Evaluation.java

# Build argument for mode
ARG MODE=evaluation

ENV MODE=${MODE}

# Default command
CMD if [ "$MODE" = "before" ]; then \
        cp /app/repository_before/UserBatch.java src/main/java/com/example/users/UserBatchController.java && \
        mvn clean test -B; \
    elif [ "$MODE" = "after" ]; then \
        cp /app/repository_after/UserBatch.java src/main/java/com/example/users/UserBatchController.java && \
        mvn clean test -B; \
    else \
        mvn clean compile -q && \
        java -cp target/classes:$(mvn dependency:build-classpath -Dmdep.outputFile=/dev/stdout -q) com.example.evaluation.Evaluation; \
    fi