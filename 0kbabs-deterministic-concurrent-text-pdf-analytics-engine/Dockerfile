FROM golang:1.24

WORKDIR /app
COPY . /app

# Initialize module if not present (although go.mod exists)
# RUN go mod download 

# Build binaries for evaluation script
RUN go build -o /usr/local/bin/before-analyzer ./repository_before/main.go 
RUN go build -o /usr/local/bin/after-analyzer ./repository_after/main.go

CMD ["go", "test", "-v", "./tests/..."]
