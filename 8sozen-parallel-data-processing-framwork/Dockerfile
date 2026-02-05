FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

# Copy project files
COPY pom.xml .
COPY repository_after/ repository_after/
COPY tests/ tests/
COPY evaluation/ evaluation/
COPY instances/ instances/

# Download dependencies
RUN mvn dependency:go-offline -q

# Default command runs tests
CMD ["mvn", "test", "-q"]
