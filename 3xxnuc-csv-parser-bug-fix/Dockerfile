FROM eclipse-temurin:17-jdk

WORKDIR /app

# Copy all files
COPY . .

# Default command runs evaluation
CMD ["bash", "-c", "javac -d /tmp evaluation/Evaluation.java repository_after/*.java tests/*.java && java -cp /tmp Evaluation"]
