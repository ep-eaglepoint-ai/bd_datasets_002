FROM openjdk:11-jre-slim
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
RUN mvn clean compile
CMD ["echo", "build complete"]
