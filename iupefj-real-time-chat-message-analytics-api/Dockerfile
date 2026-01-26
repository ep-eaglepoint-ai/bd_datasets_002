FROM eclipse-temurin:17
WORKDIR /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
COPY pom.xml .
COPY repository_after/src ./src
COPY tests ./tests
COPY run.sh .
RUN chmod +x run.sh
RUN mvn dependency:go-offline
ENTRYPOINT ["/app/run.sh"]
CMD ["mvn", "test"]
