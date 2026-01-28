# Use a base image with Java 17 and Maven
FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

# Copy the POM file first to cache dependencies
COPY pom.xml .

# Download dependencies (this layer will be cached unless pom.xml changes)
RUN mvn dependency:go-offline

# Create directory structure for code
RUN mkdir -p src/main/java/com/eaglepoint/iot
RUN mkdir -p src/test/java/com/eaglepoint/iot

# Copy the Test file into the image
COPY tests/SensorMetricsControllerTest.java src/test/java/com/eaglepoint/iot/

# Copy the evaluation script
COPY evaluation/Evaluation.java Evaluation.java