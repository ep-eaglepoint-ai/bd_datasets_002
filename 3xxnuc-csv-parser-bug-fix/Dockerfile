FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY . /app
CMD ["bash", "-c", "javac -d /tmp *.java repository_before/*.java tests/*.java && java -cp /tmp ObjectPoolCorrectnessTest"]
