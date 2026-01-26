#!/bin/bash

if [[ $1 == "java" ]]; then
  exec "$@"
fi

REPO="after"
for arg in "$@"; do
  if [[ $arg == --repo=* ]]; then
    REPO=$(echo $arg | cut -d'=' -f2)
  fi
done

mkdir -p /app/src/main/java/com/eaglepoint/chat
if [[ $REPO == "before" ]]; then
  cp /app/repository_before/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/
else
  cp /app/repository_after/src/main/java/com/eaglepoint/chat/ChatAnalyticsController.java /app/src/main/java/com/eaglepoint/chat/
fi

exec mvn test