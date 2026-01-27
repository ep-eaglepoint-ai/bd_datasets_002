FROM eclipse-temurin:17
WORKDIR /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
COPY pom.xml .
COPY repository_after/src ./src
COPY tests ./tests
COPY evaluation ./evaluation
RUN mvn dependency:go-offline
ENTRYPOINT ["bash", "-c", "REPO=after; for arg in \"$@\"; do if [[ $arg == --repo=* ]]; then REPO=$(echo $arg | cut -d'=' -f2); fi; done; mkdir -p /app/src/main/java/com/eaglepoint/chat; if [[ $REPO == 'before' ]]; then cp /app/repository_before/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/; else cp /app/repository_after/src/main/java/com/eaglepoint/chat/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/; fi; if [[ $REPO == 'before' ]]; then \"$@\"; exit 0; else exec \"$@\"; fi"]
CMD ["mvn", "test"]
