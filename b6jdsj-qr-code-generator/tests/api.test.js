const request = require("supertest");
const fs = require("fs");
const path = require("path");
// Use the fully configured app (includes CORS, rate limiting)
const app = require("../repository_after/server/index");

const routesPath = path.join(__dirname, "../repository_after/server/routes.js");
const indexPath = path.join(__dirname, "../repository_after/server/index.js");
const validatorsPath = path.join(
  __dirname,
  "../repository_after/server/validators.js",
);

describe("POST /api/generate", () => {
  it("should generate a QR code for valid input", async () => {
    const res = await request(app)
      .post("/api/generate")
      .send({ text: "Hello World" });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("qrCode");
    expect(res.body).toHaveProperty("timestamp");
    // backend returns base64-only string (no data URI prefix)
    expect(typeof res.body.qrCode).toBe("string");
    expect(res.body.qrCode.length).toBeGreaterThan(0);
    expect(res.body.qrCode).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(res.body.qrCode).not.toMatch(/^data:image/);
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it("should set CORS header for origin http://localhost:3000", async () => {
    const res = await request(app)
      .post("/api/generate")
      .set("Origin", "http://localhost:3000")
      .send({ text: "hello" });

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("should return 400 for empty string", async () => {
    const res = await request(app).post("/api/generate").send({ text: "" });

    expect(res.statusCode).toEqual(400);
    expect(res.body.code).toEqual("EMPTY_INPUT");
    expect(res.body.error).toMatch(/empty/i);
  });

  it("should return 400 for input > 500 characters", async () => {
    const longText = "a".repeat(501);
    const res = await request(app)
      .post("/api/generate")
      .send({ text: longText });

    expect(res.statusCode).toEqual(400);
    expect(res.body.code).toEqual("LENGTH_EXCEEDED");
    expect(res.body.error).toMatch(/500/i);
  });

  it("should return 400 for non-string input", async () => {
    const res = await request(app).post("/api/generate").send({ text: 12345 });

    expect(res.statusCode).toEqual(400);
    expect(res.body.code).toEqual("INVALID_TYPE");
    expect(res.body.error).toMatch(/string/i);
  });

  it("should return 400 for missing input", async () => {
    const res = await request(app).post("/api/generate").send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body.code).toEqual("MISSING_INPUT");
    expect(res.body.error).toMatch(/required/i);
  });
});

describe("CORS and API contract", () => {
  it("should include CORS headers for preflight requests", async () => {
    const res = await request(app)
      .options("/api/generate")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });
});

describe("Server constraints", () => {
  it("should not use filesystem or database storage", () => {
    const routesSource = fs.readFileSync(routesPath, "utf8");
    const indexSource = fs.readFileSync(indexPath, "utf8");
    const validatorsSource = fs.readFileSync(validatorsPath, "utf8");

    const combined = `${routesSource}\n${indexSource}\n${validatorsSource}`;
    expect(combined).not.toMatch(/require\(['"]fs['"]\)/);
    expect(combined).not.toMatch(/fs\./);
    expect(combined).not.toMatch(
      /mongoose|sequelize|typeorm|knex|pg|mysql|sqlite/i,
    );
  });
});
