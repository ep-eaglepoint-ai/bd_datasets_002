CC = gcc
CFLAGS = -Wall -Wextra -pthread -I./include $(shell pkg-config --cflags libmongoc-1.0 libmicrohttpd jansson)
LDFLAGS = $(shell pkg-config --libs libmongoc-1.0 libmicrohttpd jansson) -pthread

SRC = src/main.c src/server.c src/parser.c src/db.c src/validator.c src/utils.c
OBJ = $(SRC:.c=.o)
TARGET = server

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) $(OBJ) -o $(TARGET) $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJ) $(TARGET)

.PHONY: all clean
