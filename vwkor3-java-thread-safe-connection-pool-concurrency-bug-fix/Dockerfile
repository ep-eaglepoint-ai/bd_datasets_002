FROM maven:3.9-eclipse-temurin-11

WORKDIR /app

# Install Python for evaluation script
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

CMD ["bash"]
