const axios = require("axios");
const { io } = require("socket.io-client");
const FormData = require("form-data");
const { Pool } = require("pg");
const { setTimeout } = require("timers/promises");

const API_URL = "http://server:3001";
const SOCKET_URL = "http://server:3001";

const pool = new Pool({
  host: "db",
  port: 5432,
  database: "csv_importer",
  user: "postgres",
  password: "postgres",
});

describe("CSV Importer Integration Tests", () => {
  let socket;
  let jobId;

  beforeAll(async () => {
    let retries = 10;
    while (retries > 0) {
      try {
        await axios.get(`${API_URL}/health`);
        break;
      } catch (err) {
        retries--;
        await setTimeout(1000);
      }
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(() => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await pool.query("TRUNCATE customers, failed_imports RESTART IDENTITY");
  });

  test("should process a valid CSV file correctly", async () => {
    const csvContent = `email,first_name,last_name,company
test1@example.com,Test,One,CompanyA
test2@example.com,Test,Two,CompanyB
test3@example.com,Test,Three,CompanyC`;

    const formData = new FormData();
    formData.append("file", Buffer.from(csvContent), "test.csv");

    let progressUpdates = [];
    let completed = false;

    socket = io(SOCKET_URL);

    const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
      headers: formData.getHeaders(),
    });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.data.jobId).toBeDefined();
    jobId = uploadRes.data.jobId;

    socket.emit("subscribe", jobId);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(10000).then(() => {
        if (!completed) reject(new Error("Timeout waiting for completion"));
      });

      socket.on("progress", (data) => {
        progressUpdates.push(data);
        if (data.status === "completed" || data.status === "failed") {
          completed = true;
          resolve();
        }
      });
    });

    expect(completed).toBe(true);

    const finalUpdate = progressUpdates[progressUpdates.length - 1];
    expect(finalUpdate.status).toBe("completed");
    expect(finalUpdate.processed).toBe(3);

    const result = await pool.query("SELECT * FROM customers ORDER BY id");
    expect(result.rowCount).toBe(3);
    expect(result.rows[0].email).toBe("test1@example.com");
  });

  test("should handle backpressure with larger batch", async () => {
    let csvContent = "email,first_name,last_name,company\n";
    for (let i = 0; i < 1500; i++) {
      csvContent += `user${i}@example.com,User,${i},Corp${i}\n`;
    }

    const formData = new FormData();
    formData.append("file", Buffer.from(csvContent), "large.csv");

    socket = io(SOCKET_URL);

    const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
      headers: formData.getHeaders(),
    });

    jobId = uploadRes.data.jobId;
    socket.emit("subscribe", jobId);

    await new Promise((resolve, reject) => {
      // Simple timeout promise
      const timer = setTimeout(20000, "timeout");

      socket.on("progress", (data) => {
        if (data.status === "completed") {
          resolve();
        }
      });
    });

    const result = await pool.query("SELECT count(*) FROM customers");
    expect(parseInt(result.rows[0].count)).toBe(1500);
  });
});
