import request from "supertest";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import fs from "fs";
import pool, { initDb } from "../db.js";
import authRoutes from "../routes/auth.js";
import roomRoutes from "../routes/rooms.js";
import bookingRoutes from "../routes/bookings.js";

let app;
let testUsers = {};

// Helper function to get next weekday in UTC
function getNextWeekday(daysAhead = 1) {
  const now = new Date();
  let date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysAhead,
      0,
      0,
      0,
      0,
    ),
  );

  // If weekend, move to Monday
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  }

  return date;
}

beforeAll(async () => {
  // Initialize app
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/bookings", bookingRoutes);

  // Initialize database
  await initDb();

  // Clear and seed test data
  await pool.query("DELETE FROM bookings");
  await pool.query("DELETE FROM users");
  await pool.query("DELETE FROM rooms");
  await pool.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE rooms_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE bookings_id_seq RESTART WITH 1");

  // Insert rooms
  await pool.query(`
    INSERT INTO rooms (name, capacity) VALUES
      ('Boardroom', 10),
      ('Focus Room', 4),
      ('Phone Booth', 2)
  `);

  // Insert test users
  const passwordHash = await bcrypt.hash("password123", 10);
  const userResult = await pool.query(
    `
    INSERT INTO users (email, password_hash, name) VALUES
      ('alice@test.com', $1, 'Alice Johnson'),
      ('bob@test.com', $1, 'Bob Smith')
    RETURNING id, email
  `,
    [passwordHash],
  );

  const aliceLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "alice@test.com", password: "password123" });

  const bobLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "bob@test.com", password: "password123" });

  testUsers.alice = { id: userResult.rows[0].id, token: aliceLogin.body.token };
  testUsers.bob = { id: userResult.rows[1].id, token: bobLogin.body.token };
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query("DELETE FROM bookings");
});

describe("Requirement 1: Overlapping bookings must be rejected atomically", () => {
  test("30 concurrent booking attempts should result in exactly 1 success", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(9, 0, 0, 0);
    const startTime = tomorrow.toISOString();
    const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();

    fs.writeFileSync(
      "/tmp/test-debug.txt",
      `Test date: ${startTime}, UTC Day: ${tomorrow.getUTCDay()}\n`,
    );

    const promises = Array(30)
      .fill(null)
      .map(() =>
        request(app)
          .post("/api/bookings")
          .set("Authorization", `Bearer ${testUsers.alice.token}`)
          .send({ roomId: 1, startTime, endTime }),
      );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    const errors = results.filter((r) => r.status === 400);

    fs.appendFileSync(
      "/tmp/test-debug.txt",
      `Results - Successes: ${successes.length}, Conflicts: ${conflicts.length}, Errors: ${errors.length}\n`,
    );
    if (errors.length > 0) {
      fs.appendFileSync(
        "/tmp/test-debug.txt",
        `Sample error: ${JSON.stringify(errors[0].body)}\n`,
      );
    }

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(29);

    const dbResult = await pool.query(
      "SELECT COUNT(*) FROM bookings WHERE status = $1",
      ["confirmed"],
    );
    expect(parseInt(dbResult.rows[0].count)).toBe(1);
  });
});

describe("Back-to-back bookings must be allowed", () => {
  test("Booking 10:00-11:00 after 9:00-10:00 should succeed", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    const booking1Start = tomorrow.toISOString();
    const booking1End = new Date(
      tomorrow.getTime() + 60 * 60 * 1000,
    ).toISOString();
    const booking2Start = booking1End;
    const booking2End = new Date(
      tomorrow.getTime() + 2 * 60 * 60 * 1000,
    ).toISOString();

    const res1 = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({ roomId: 1, startTime: booking1Start, endTime: booking1End });

    if (res1.status !== 201) {
      console.log("First booking failed:", res1.status, res1.body);
      console.log(
        "Date:",
        tomorrow.toISOString(),
        "UTC Day:",
        tomorrow.getUTCDay(),
      );
    }

    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.bob.token}`)
      .send({ roomId: 1, startTime: booking2Start, endTime: booking2End });

    expect(res2.status).toBe(201);
  });

  test("Overlapping booking should be rejected", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    const booking1Start = tomorrow.toISOString();
    const booking1End = new Date(
      tomorrow.getTime() + 60 * 60 * 1000,
    ).toISOString();
    const booking2Start = new Date(
      tomorrow.getTime() + 30 * 60 * 1000,
    ).toISOString();
    const booking2End = new Date(
      tomorrow.getTime() + 90 * 60 * 1000,
    ).toISOString();

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({ roomId: 1, startTime: booking1Start, endTime: booking1End });

    const res2 = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.bob.token}`)
      .send({ roomId: 1, startTime: booking2Start, endTime: booking2End });

    expect(res2.status).toBe(409);
  });
});

describe("Boundary bookings must be handled correctly", () => {
  test("Booking starting at exactly 9:00 AM should be accepted", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
  });

  test("Booking ending at exactly 6:00 PM should be accepted", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(17, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
  });

  test("Booking from 5:30 PM to 6:30 PM should be rejected", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(17, 30, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/operating hours/i);
  });
});

describe("Past bookings must be rejected", () => {
  test("Booking in the past should return 400", async () => {
    const past = new Date();
    past.setUTCHours(past.getUTCHours() - 2);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: past.toISOString(),
        endTime: new Date(past.getTime() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/past/i);
  });
});

describe("Duration constraints must be enforced", () => {
  test("Booking shorter than 15 minutes should be rejected", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 10 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/15 minutes/i);
  });

  test("Booking longer than 4 hours should be rejected", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(
          tomorrow.getTime() + 5 * 60 * 60 * 1000,
        ).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/4 hours/i);
  });

  test("Booking of exactly 15 minutes should be accepted", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 15 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
  });
});

describe("Midnight crossing must be prevented", () => {
  test("Booking crossing midnight should be rejected", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(23, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(
          tomorrow.getTime() + 2 * 60 * 60 * 1000,
        ).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/midnight/i);
  });
});

describe("User ownership must be enforced for cancellation", () => {
  test("User B cannot cancel User A booking", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const createRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    const bookingId = createRes.body.booking.id;

    const deleteRes = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${testUsers.bob.token}`);

    expect(deleteRes.status).toBe(403);
  });

  test("User A can cancel their own booking", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const createRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    const bookingId = createRes.body.booking.id;

    const deleteRes = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${testUsers.alice.token}`);

    expect(deleteRes.status).toBe(200);
  });
});

describe("Past booking cancellation must be prevented", () => {
  test("Cannot cancel booking that has already started", async () => {
    // Create a booking that starts in the past
    const past = new Date();
    past.setUTCHours(past.getUTCHours() - 1);

    const bookingResult = await pool.query(
      `
      INSERT INTO bookings (room_id, user_id, start_time, end_time, status)
      VALUES (1, $1, $2, $3, 'confirmed')
      RETURNING id
    `,
      [
        testUsers.alice.id,
        past.toISOString(),
        new Date(past.getTime() + 60 * 60 * 1000).toISOString(),
      ],
    );

    const bookingId = bookingResult.rows[0].id;

    const deleteRes = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${testUsers.alice.token}`);

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error).toMatch(/past/i);
  });
});

describe("Double cancellation must be handled safely", () => {
  test("Second cancellation should return 400", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const createRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    const bookingId = createRes.body.booking.id;

    // First cancellation
    const deleteRes1 = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${testUsers.alice.token}`);

    expect(deleteRes1.status).toBe(200);

    // Second cancellation
    const deleteRes2 = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${testUsers.alice.token}`);

    expect(deleteRes2.status).toBe(400);
    expect(deleteRes2.body.error).toMatch(/already cancelled/i);
  });
});

describe("Invalid room booking must be rejected", () => {
  test("Booking non-existent room should return 404", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${testUsers.alice.token}`)
      .send({
        roomId: 999,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/room not found/i);

    const dbResult = await pool.query("SELECT COUNT(*) FROM bookings");
    expect(parseInt(dbResult.rows[0].count)).toBe(0);
  });
});

describe("Authentication must be required", () => {
  test("POST /api/bookings without token should return 401", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);

    const res = await request(app)
      .post("/api/bookings")
      .send({
        roomId: 1,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(401);
  });

  test("GET /api/bookings/mine without token should return 401", async () => {
    const res = await request(app).get("/api/bookings/mine");
    expect(res.status).toBe(401);
  });

  test("DELETE /api/bookings/:id without token should return 401", async () => {
    const res = await request(app).delete("/api/bookings/1");
    expect(res.status).toBe(401);
  });
});

describe("Database seeding", () => {
  test("3 rooms should exist", async () => {
    const res = await request(app).get("/api/rooms");
    expect(res.status).toBe(200);
    expect(res.body.rooms).toHaveLength(3);
    expect(res.body.rooms[0].name).toBe("Boardroom");
    expect(res.body.rooms[0].capacity).toBe(10);
    expect(res.body.rooms[1].name).toBe("Focus Room");
    expect(res.body.rooms[1].capacity).toBe(4);
    expect(res.body.rooms[2].name).toBe("Phone Booth");
    expect(res.body.rooms[2].capacity).toBe(2);
  });

  test("Test users should be able to login", async () => {
    const aliceRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "password123" });

    expect(aliceRes.status).toBe(200);
    expect(aliceRes.body.token).toBeDefined();

    const bobRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@test.com", password: "password123" });

    expect(bobRes.status).toBe(200);
    expect(bobRes.body.token).toBeDefined();
  });
});

describe("Concurrent booking stress test", () => {
  test("10 simultaneous requests should result in exactly 1 booking", async () => {
    const tomorrow = getNextWeekday(1);
    tomorrow.setUTCHours(14, 0, 0, 0);
    const startTime = tomorrow.toISOString();
    const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();

    const promises = Array(10)
      .fill(null)
      .map(() =>
        request(app)
          .post("/api/bookings")
          .set("Authorization", `Bearer ${testUsers.alice.token}`)
          .send({ roomId: 1, startTime, endTime }),
      );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(9);

    // Verify database has exactly 1 booking
    const dbResult = await pool.query(
      "SELECT COUNT(*) FROM bookings WHERE status = $1",
      ["confirmed"],
    );
    expect(parseInt(dbResult.rows[0].count)).toBe(1);
  });
});
