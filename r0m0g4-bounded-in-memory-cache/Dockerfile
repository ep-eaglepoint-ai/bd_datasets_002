FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY repository_before /app/repository_before
COPY repository_after /app/repository_after
COPY tests /app/tests
COPY evaluation /app/evaluation

RUN mkdir -p /app/classes && \
    javac -d /app/classes $(find /app/repository_after/src -name "*.java") && \
    javac -cp /app/classes -d /app/classes /app/tests/BoundedCacheTest.java && \
    javac -d /app/classes /app/evaluation/Evaluation.java

CMD ["java", "-cp", "/app/classes", "com.example.cache.BoundedCache"]

