const request = require("supertest");
const fs = require("fs");
const path = require("path");

const routesPath = path.join(__dirname, "../repository_after/server/routes.js");

describe("QR generation options and timeout", () => {
  afterEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("uses errorCorrectionLevel H when generating QR", async () => {
    jest.resetModules();
    jest.mock(
      "qrcode",
      () => ({
        toDataURL: jest.fn(() => Promise.resolve("data:image/png;base64,AAA")),
      }),
      { virtual: true },
    );

    const app = require("../repository_after/server/index");
    await request(app)
      .post("/api/generate")
      .send({ text: "hello" })
      .expect(200);

    const qrcode = require("qrcode");
    expect(qrcode.toDataURL).toHaveBeenCalled();
    const opts = qrcode.toDataURL.mock.calls[0][1];
    expect(opts).toBeDefined();
    expect(opts.errorCorrectionLevel).toBe("H");
  });

  test("times out if QR generation exceeds 2 seconds", async () => {
    jest.resetModules();

    // use a slightly longer real timeout (2.5s) in the mock so server 2s timeout fires
    jest.mock(
      "qrcode",
      () => ({
        toDataURL: jest.fn(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve("data:image/png;base64,AAA"), 2500),
            ),
        ),
      }),
      { virtual: true },
    );

    const app = require("../repository_after/server/index");

    const res = await request(app).post("/api/generate").send({ text: "slow" });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("code", "GENERATION_TIMEOUT");
    expect(res.body).toHaveProperty("error");
  }, 10000);

  test("uses a 2-second timeout in the generator helper", () => {
    const routesSource = fs.readFileSync(routesPath, "utf8");
    expect(routesSource).toMatch(
      /generateQrDataUrlWithTimeout\(text,\s*ms\s*=\s*2000\)/,
    );
    expect(routesSource).toMatch(
      /generateQrDataUrlWithTimeout\(text,\s*2000\)/,
    );
  });

  test("returns structured error when QR generation fails", async () => {
    jest.resetModules();

    jest.mock(
      "qrcode",
      () => ({
        toDataURL: jest.fn(() => Promise.reject(new Error("boom"))),
      }),
      { virtual: true },
    );

    const app = require("../repository_after/server/index");

    const res = await request(app)
      .post("/api/generate")
      .send({ text: "error-case" });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("code", "GENERATION_FAILED");
    expect(res.body).toHaveProperty("error");
  });
});
