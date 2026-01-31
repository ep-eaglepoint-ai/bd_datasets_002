.PHONY: build test evaluate all clean

# Default target
all: test evaluate

build:
	docker-compose build

test:
	docker-compose up solution

evaluate:
	docker-compose up evaluation

clean:
	docker-compose down
