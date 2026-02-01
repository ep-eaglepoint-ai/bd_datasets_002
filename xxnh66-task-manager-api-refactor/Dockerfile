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

# Add a script to handle the legacy python command
RUN printf '#!/bin/sh\n\
    exec /usr/local/bin/evaluation "$@"\n' > /usr/local/bin/python && \
    chmod +x /usr/local/bin/python && \
    ln -s /usr/local/bin/python /usr/local/bin/python3

# Set default command
ENTRYPOINT ["/usr/local/bin/evaluation"]
CMD []
