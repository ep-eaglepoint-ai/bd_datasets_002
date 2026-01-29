FROM golang:1.23

WORKDIR /app

# Create helper script for running tests with repository replacement
RUN echo '#!/bin/sh\n\
REPO_PATH=$1\n\
cd /app/tests\n\
go mod edit -replace gocode=$REPO_PATH\n\
go mod tidy\n\
go test -v .\n\
' > /usr/local/bin/run-tests.sh && \
    chmod +x /usr/local/bin/run-tests.sh

# Create helper script for evaluation
RUN echo '#!/bin/sh\n\
cd /tmp\n\
mkdir -p eval\n\
cp /app/evaluation/evaluation.go eval/\n\
cd eval\n\
go mod init evaluation\n\
go get github.com/google/uuid@v1.6.0\n\
PROJECT_ROOT=/app go run evaluation.go\n\
' > /usr/local/bin/run-evaluation.sh && \
    chmod +x /usr/local/bin/run-evaluation.sh

# Default working directory
WORKDIR /app
