const path = require("path");

module.exports = {
  port: 3000,
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, "uploads"),
  tempDir: process.env.TEMP_DIR || path.join(__dirname, "temp"),
  thumbnailDir: process.env.THUMBNAIL_DIR || path.join(__dirname, "thumbnails"),
  maxFileSize: 100 * 1024 * 1024,
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  thumbnailSize: { width: 200, height: 200 },
  requestTimeout: 600000, // 10 minutes
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "uploads_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  diskSpaceMetadata: {
    minFreeSpace: 200 * 1024 * 1024,
  },
  requestTimeout: 600000,
};
