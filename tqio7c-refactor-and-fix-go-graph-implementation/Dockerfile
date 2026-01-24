FROM golang:1.21-alpine

WORKDIR /app

COPY repository_after ./repository_after
COPY repository_before ./repository_before
COPY tests ./tests
COPY evaluation ./evaluation

CMD ["/bin/sh"]
