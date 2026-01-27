FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

ARG MODE=evaluation

ENV MODE=${MODE}

RUN mkdir -p src/main/java src/test/java reports

# Copy pom from tests folder
COPY tests/pom.xml ./pom.xml

# Download dependencies
RUN mvn dependency:go-offline -B || true

# Copy source files - keep originals as-is
COPY repository_before/deepmerge/src/main/java/DeepMerge.java /app/before/DeepMerge.java
COPY repository_after/deepmerge/src/main/java/DeepMerge.java /app/after/DeepMerge.java

# Copy comprehensive tests from tests folder
COPY tests/DeepMergeTest.java /app/tests/DeepMergeTest.java

# Copy evaluation class (lowercase filename to uppercase)
COPY evaluation/evaluation.java /app/evaluation/Evaluation.java

CMD if [ "$MODE" = "before" ]; then \
        cp /app/before/DeepMerge.java src/main/java/ && \
        cp /app/tests/DeepMergeTest.java src/test/java/ && \
        mvn clean test -B; \
        echo ""; \
        echo "=========================================="; \
        echo "  BEFORE VERSION TEST RESULT"; \
        echo "=========================================="; \
        echo "  Status: FAILED (Expected - has compilation bug)"; \
        echo "=========================================="; \
        exit 0; \
    elif [ "$MODE" = "after" ]; then \
        cp /app/after/DeepMerge.java src/main/java/ && \
        cp /app/tests/DeepMergeTest.java src/test/java/ && \
        mvn clean test -B; \
    else \
        cp /app/after/DeepMerge.java src/main/java/ && \
        cp /app/evaluation/Evaluation.java src/main/java/ && \
        mvn clean compile -q && \
        java -cp target/classes Evaluation; \
    fi