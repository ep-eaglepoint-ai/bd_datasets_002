FROM golang:1.21

WORKDIR /app

# Copy Go module files (vendor mode - no go.sum needed)
COPY go.mod ./
COPY repository_before/go.mod ./repository_before/
COPY repository_after/go.mod ./repository_after/

# Copy the rest of the application
COPY . .

# Build the evaluation runner
RUN go build -mod=vendor -o /usr/local/bin/evaluation ./evaluation/evaluation.go

# Set default command
ENTRYPOINT ["/usr/local/bin/evaluation"]
CMD []
