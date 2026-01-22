FROM maven:3.9-eclipse-temurin-11

WORKDIR /app

COPY repository_before/ .

RUN mvn compile -q

CMD ["mvn", "test"]
