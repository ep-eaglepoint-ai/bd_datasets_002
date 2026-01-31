# Use a Maven/Java image to build and run tests
FROM maven:3.9.4-eclipse-temurin-17
WORKDIR /app
COPY . /app
RUN mvn -B -DskipTests=false test
CMD ["echo", "setup complete"]