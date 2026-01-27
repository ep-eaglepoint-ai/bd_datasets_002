FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

COPY . .

RUN cd repository_after && mvn compile -q

RUN mkdir -p tests/src/main/java/com/example/studentapi && \
    mkdir -p tests/src/main/resources && \
    cp -r repository_after/src/main/java/com/example/studentapi/* tests/src/main/java/com/example/studentapi/ && \
    cp repository_after/src/main/resources/*.properties tests/src/main/resources/
RUN cd tests && mvn compile test-compile -q

RUN cd evaluation && mvn compile -q

CMD ["sh", "-c", "cd /app && mvn -f evaluation/pom.xml exec:java -q"]
