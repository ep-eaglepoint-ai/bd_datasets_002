import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Pool } from "pg";
import Busboy from "busboy";
import { parse } from "csv-parse";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const BATCH_SIZE = 1000;
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "csv_importer",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
});

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const activeJobs = new Map();

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("subscribe", (jobId) => {
    socket.join(jobId);
    console.log(`Client ${socket.id} subscribed to job ${jobId}`);

    const jobProgress = activeJobs.get(jobId);
    if (jobProgress) {
      socket.emit("progress", jobProgress);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

function emitProgress(jobId, processed, total, status, error = null) {
  const progressData = { jobId, processed, total, status, error };
  activeJobs.set(jobId, progressData);
  io.to(jobId).emit("progress", progressData);
}

// Log failed batch to database
async function logFailedBatch(
  client,
  jobId,
  startRow,
  endRow,
  batchData,
  errorMessage,
) {
  try {
    await client.query(
      `INSERT INTO failed_imports (job_id, batch_start_row, batch_end_row, row_data, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [jobId, startRow, endRow, JSON.stringify(batchData), errorMessage],
    );
  } catch (logError) {
    console.error("Failed to log error to database:", logError);
  }
}

// Bulk insert batch using unnest for parameterized queries
async function insertBatch(client, batch) {
  const emails = batch.map((row) => row.email || "");
  const firstNames = batch.map((row) => row.first_name || row.firstName || "");
  const lastNames = batch.map((row) => row.last_name || row.lastName || "");
  const companies = batch.map((row) => row.company || "");

  await client.query(
    `INSERT INTO customers (email, first_name, last_name, company)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])`,
    [emails, firstNames, lastNames, companies],
  );
}

// Process CSV batch with transaction
async function processBatch(jobId, batch, startRow) {
  const client = await pool.connect();
  const endRow = startRow + batch.length - 1;

  try {
    await client.query("BEGIN");
    await insertBatch(client, batch);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Batch ${startRow}-${endRow} failed:`, error.message);

    // Log the failed batch
    await logFailedBatch(client, jobId, startRow, endRow, batch, error.message);

    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}



// Main upload endpoint with streaming and backpressure
app.post("/upload", async (req, res) => {
  const jobId = uuidv4();

  const busboy = Busboy({
    headers: req.headers,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
  });

  busboy.on("file", (fieldname, file, info) => {
    const { filename, mimeType } = info;
    console.log(
      `Receiving file: ${filename}, type: ${mimeType}, jobId: ${jobId}`,
    );

    // Start streaming processing immediately
    processFile(jobId, file);
  });

  busboy.on("finish", () => {
    // Return job ID immediately so client can subscribe
    res.json({ jobId, message: "Upload started" });
  });

  busboy.on("error", (error) => {
    console.error("Busboy error:", error);
    res.status(500).json({ error: "Upload failed" });
  });

  req.pipe(busboy);
});

// Process file with streaming, backpressure, and batching
async function processFile(jobId, fileStream) {
  let processed = 0;
  let batch = [];
  let batchStartRow = 1;

  try {
    emitProgress(jobId, 0, 0, "processing");

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    // Stream directly with backpressure control
    for await (const row of fileStream.pipe(parser)) {
      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        await processBatch(jobId, batch, batchStartRow);
        processed += batch.length;
        emitProgress(jobId, processed, processed, "processing");
        batchStartRow += batch.length;
        batch = [];
      }
    }

    // Process remaining rows
    if (batch.length > 0) {
      await processBatch(jobId, batch, batchStartRow);
      processed += batch.length;
    }

    emitProgress(jobId, processed, processed, "completed");
    console.log(`Job ${jobId} completed: ${processed} rows`);

    // Clean up job after a delay
    setTimeout(() => activeJobs.delete(jobId), 60000);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    emitProgress(jobId, processed, processed, "failed", error.message);
    activeJobs.delete(jobId);
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get job status endpoint
app.get("/job/:jobId", (req, res) => {
  const { jobId } = req.params;
  const progress = activeJobs.get(jobId);

  if (progress) {
    res.json(progress);
  } else {
    res.status(404).json({ error: "Job not found or completed" });
  }
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS failed_imports (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(36) NOT NULL,
        batch_start_row INTEGER NOT NULL,
        batch_end_row INTEGER NOT NULL,
        row_data JSONB,
        error_message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_imports_job_id ON failed_imports(job_id)
    `);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io ready for connections`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
