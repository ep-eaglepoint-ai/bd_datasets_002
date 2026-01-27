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
RUN mkdir -p src/main/java/com/example/gamestats
RUN mkdir -p src/test/java/com/example/gamestats

# Copy the Test file into the image
# Adapting to our test file
COPY tests/FootballSeasonStatsTest.java src/test/java/com/example/gamestats/

# Copy the evaluation script
COPY evaluation/evaluation.py evaluation.py

# Default entrypoint
# Copy the source code (repository_before and repository_after will be managed by evaluation.py)
COPY repository_before repository_before
COPY repository_after repository_after

# Default entrypoint
CMD ["python3", "evaluation.py"]
