const path = require('path');

// Set upload dir to tests/test-files before any repository_after code loads (parsers use config.upload.dir)
process.env.UPLOAD_DIR = path.join(__dirname, 'tests', 'test-files');

// Defaults for local test run (no Docker test image): use postgres + redis on localhost (start with: docker compose up -d postgres redis)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:1234@localhost:5432/processing_db';
}
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost';
}
