FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libmicrohttpd-dev \
    libmongoc-dev \
    libbson-dev \
    libssl-dev \
    libsasl2-dev \
    libjansson-dev \
    wget \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Build the application
RUN make    


EXPOSE 8080

CMD ["./server"]
