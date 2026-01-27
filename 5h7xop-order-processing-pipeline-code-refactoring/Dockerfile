FROM maven:3.9-eclipse-temurin-17

# Install Python 3 and Pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
