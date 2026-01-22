FROM golang:1.25

WORKDIR /app

# Copy dependency files first
COPY go.mod go.sum* ./
RUN go mod download

# Copy the rest of the project
COPY . .

# Set default command
CMD ["/bin/bash"]
