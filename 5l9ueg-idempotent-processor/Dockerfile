FROM maven:3.9-eclipse-temurin-11-alpine

# Set the working directory to match the volume mount
WORKDIR /workspace

# Install Python 3, pip, and bash for the evaluation script
RUN apk add --no-cache python3 py3-pip bash

# Default command
CMD ["bash"]