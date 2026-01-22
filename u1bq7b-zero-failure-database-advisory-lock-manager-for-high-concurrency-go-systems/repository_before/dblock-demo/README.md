# dblock-demo (Dockerized)

Run the demo locally with Docker and Postgres.

Quick start:

```bash
docker compose up --build
```

This will start a `postgres` service and build+run the Go app. The app reads the database URL from the `DATABASE_URL` environment variable; the compose file sets it to `postgres://user:password@db:5432/postgres?sslmode=disable` by default.

To run only the app against a remote database, set `DATABASE_URL` and run:

```bash
docker run --rm -e DATABASE_URL="your_database_url" dblock-demo_app
```
