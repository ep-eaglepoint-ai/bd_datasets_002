# Use Maven image for building Java projects
FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

# Copy entire project structure
COPY . .

# Build and run tests
CMD ["mvn", "-f", "repository_after/pom.xml", "test"]
