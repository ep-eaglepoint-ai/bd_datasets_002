# Use a base image with Java 17 and Maven
FROM maven:3.9-eclipse-temurin-17

# Install Python 3 for the evaluation script
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the POM file first to cache dependencies
COPY pom.xml .

# Download dependencies (this layer will be cached unless pom.xml changes)
RUN mvn dependency:go-offline

# Create directory structure for code
RUN mkdir -p src/main/java/com/example/textapi
RUN mkdir -p src/test/java/com/example/textapi

# Copy the Test file into the image
COPY tests/TextProcessingControllerTest.java src/test/java/com/example/textapi/

# Copy the evaluation script
COPY evaluation/evaluation.py evaluation.py

# Default entrypoint
CMD ["python3", "evaluation.py"]