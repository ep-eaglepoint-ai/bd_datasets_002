FROM maven:3.9.6-eclipse-temurin-17

WORKDIR /app

COPY pom.xml /app/pom.xml
COPY repository_after /app/repository_after
COPY tests /app/tests
COPY evaluation /app/evaluation
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN mvn -q -DskipTests package

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["test"]
