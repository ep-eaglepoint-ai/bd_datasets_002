import request from "supertest";
import app from "@server/app";
import * as db from "@server/db";
import bcrypt from "bcrypt";

// Mock the Database Module
jest.mock("@server/db");

describe("Backend Integration: Auth Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {

    it("returns 200 and token on success", async () => {
      const mockUser = {
        id: "uuid-123",
        email: "test@example.com",
        password_hash: await bcrypt.hash("password123", 10),
        role: "user",
      };

      // Setup mocks for the specific sequence of calls:
      // Call 1: User Lookup
      // Call 2: Insert Refresh Token
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "password123" });

      // If this fails with 500, the server crashed (likely JWT signing)
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("returns 401 on bad password", async () => {
      const mockUser = {
        id: "uuid-123",
        email: "test@example.com",
        password_hash: await bcrypt.hash("realpass", 10),
        role: "user",
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockUser],
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "wrongpass" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears cookie and revokes token in DB", async () => {
      // Mock the DB update for revocation
      (db.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      // Create a fake refresh token string: base64(id:secret)
      const fakeTokenId = "token-uuid-123";
      const fakeTokenStr = Buffer.from(`${fakeTokenId}:some-secret`).toString(
        "base64"
      );

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [`refreshToken=${fakeTokenStr}`]);

      expect(res.status).toBe(204);

      // Verify Cookie is cleared (Max-Age=0 or expires in past)
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(JSON.stringify(cookies)).toMatch(/Expires|Max-Age=0/);

      // Verify DB was called to revoke the specific token ID
      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE refresh_tokens/),
        expect.arrayContaining([fakeTokenId])
      );
    });
  });
});
