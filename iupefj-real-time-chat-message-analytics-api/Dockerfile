FROM eclipse-temurin:17
WORKDIR /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
COPY pom.xml .
RUN mvn dependency:go-offline
# Create directories first
RUN mkdir -p /app/src/main/java/com/eaglepoint/chat
COPY repository_after/src/main/java/com/eaglepoint/chat/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/
COPY repository_after/src/main/java/com/eaglepoint/chat/TestConfig.java /app/src/main/java/com/eaglepoint/chat/
COPY repository_after/src/main/resources /app/src/main/resources
COPY tests /app/tests
COPY evaluation /app/evaluation

# Inline entrypoint - no external .sh file needed
ENTRYPOINT ["bash", "-c", "\
  EVAL_MODE=false; \
  REPO=after; \
  ARGS=(); \
  for arg in \"$@\"; do \
    if [ \"$arg\" = '--eval' ]; then EVAL_MODE=true; fi; \
    if [[ \"$arg\" == --repo=* ]]; then REPO=\"${arg#--repo=}\"; else ARGS+=(\"$arg\"); fi; \
  done; \
  if [ \"$EVAL_MODE\" = \"true\" ]; then \
    mkdir -p /app/src/main/java/com/eaglepoint/chat; \
    if [ \"$REPO\" = \"before\" ]; then \
      cp /app/repository_before/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/; \
    else \
      cp /app/repository_after/src/main/java/com/eaglepoint/chat/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/; \
    fi; \
    cd /app/evaluation; \
    javac evaluation.java; \
    cd /app; \
    java -cp evaluation evaluation; \
  else \
    mkdir -p /app/src/main/java/com/eaglepoint/chat; \
    if [ \"$REPO\" = \"before\" ]; then \
      cp /app/repository_before/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/; \
    else \
      cp /app/repository_after/src/main/java/com/eaglepoint/chat/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/; \
    fi; \
    # Always copy TestConfig for tests (needed by @WebMvcTest)
    cp /app/repository_after/src/main/java/com/eaglepoint/chat/TestConfig.java /app/src/main/java/com/eaglepoint/chat/; \
    if [ ${#ARGS[@]} -eq 0 ]; then exec mvn test; else exec mvn \"${ARGS[@]}\"; fi; \
  fi"]
CMD ["test"]
