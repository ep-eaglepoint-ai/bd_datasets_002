FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libmicrohttpd-dev \
    libmongoc-1.0-0 \
    libbson-1.0-0 \
    libssl-dev \
    libsasl2-dev \
    wget \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install modern mongo-c-driver if needed, or rely on apt if sufficient.
# Ubuntu 22.04 has libmongoc-dev 1.21 which should be sufficient.
RUN apt-get update && apt-get install -y libmongoc-dev

WORKDIR /app

COPY . .

# Build the application
RUN make

EXPOSE 8080

CMD ["./server"]
