import { Router } from "express";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const OPERATING_HOURS = { start: 9, end: 18 }; // 9 AM - 6 PM
const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_HOURS = 4;
const TIMEZONE_OFFSET = parseInt(process.env.TIMEZONE_OFFSET || '0'); // Hours offset from UTC

function toLocalDate(date) {
  if (TIMEZONE_OFFSET === 0) return date;
  const utcTime = date.getTime();
  const offsetMs = TIMEZONE_OFFSET * 60 * 60 * 1000;
  return new Date(utcTime + offsetMs);
}

function isWeekday(date) {
  const localDate = toLocalDate(date);
  const day = localDate.getUTCDay();
  return day >= 1 && day <= 5;
}

function isWithinOperatingHours(startTime, endTime) {
  const localStart = toLocalDate(startTime);
  const localEnd = toLocalDate(endTime);
  const startHour = localStart.getUTCHours() + localStart.getUTCMinutes() / 60;
  const endHour = localEnd.getUTCHours() + localEnd.getUTCMinutes() / 60;

  if (
    endHour === 0 &&
    localEnd.getUTCMinutes() === 0 &&
    localStart.getUTCDate() !== localEnd.getUTCDate()
  ) {
    return false;
  }

  return startHour >= OPERATING_HOURS.start && endHour <= OPERATING_HOURS.end;
}

function isSameDay(date1, date2) {
  const local1 = toLocalDate(date1);
  const local2 = toLocalDate(date2);
  return (
    local1.getUTCFullYear() === local2.getUTCFullYear() &&
    local1.getUTCMonth() === local2.getUTCMonth() &&
    local1.getUTCDate() === local2.getUTCDate()
  );
}

router.post("/", authenticate, async (req, res) => {
  const client = await pool.connect();

  try {
    const { roomId, startTime, endTime } = req.body;
    const userId = req.user.id;

    if (!roomId || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "roomId, startTime, and endTime are required" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start < now) {
      return res.status(400).json({ error: "Cannot book in the past" });
    }

    if (end <= start) {
      return res
        .status(400)
        .json({ error: "End time must be after start time" });
    }

    if (!isSameDay(start, end)) {
      return res.status(400).json({ error: "Bookings cannot cross midnight" });
    }

    if (!isWeekday(start)) {
      return res
        .status(400)
        .json({ error: "Bookings are only allowed Monday through Friday" });
    }

    if (!isWithinOperatingHours(start, end)) {
      return res.status(400).json({
        error: "Bookings must be within operating hours (9:00 AM - 6:00 PM)",
      });
    }

    // Check duration
    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < MIN_DURATION_MINUTES) {
      return res.status(400).json({
        error: `Minimum booking duration is ${MIN_DURATION_MINUTES} minutes`,
      });
    }

    const durationHours = durationMinutes / 60;
    if (durationHours > MAX_DURATION_HOURS) {
      return res.status(400).json({
        error: `Maximum booking duration is ${MAX_DURATION_HOURS} hours`,
      });
    }

    // Verify room exists
    const roomResult = await client.query(
      "SELECT id, name FROM rooms WHERE id = $1",
      [roomId],
    );
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Start transaction for booking
    await client.query("BEGIN");

    // Check for overlapping bookings (using range overlap: [) means start inclusive, end exclusive)
    // This allows back-to-back bookings like 10:00-11:00 and 11:00-12:00
    const overlapResult = await client.query(
      `
      SELECT id, start_time, end_time 
      FROM bookings 
      WHERE room_id = $1 
        AND status = 'confirmed'
        AND start_time < $3 
        AND end_time > $2
      FOR UPDATE
    `,
      [roomId, start, end],
    );

    if (overlapResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Time slot conflicts with an existing booking",
      });
    }

    // Create the booking
    const bookingResult = await client.query(
      `
      INSERT INTO bookings (room_id, user_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, 'confirmed')
      RETURNING id, room_id, start_time, end_time, status, created_at
    `,
      [roomId, userId, start, end],
    );

    await client.query("COMMIT");

    const booking = bookingResult.rows[0];
    booking.room_name = roomResult.rows[0].name;

    res.status(201).json({
      message: "Booking confirmed successfully",
      booking,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Handle unique constraint violation (race condition catch)
    if (error.code === "23P01") {
      return res.status(409).json({
        error: "Time slot conflicts with an existing booking",
      });
    }

    console.error("Booking error:", error);
    res.status(500).json({ error: "Failed to create booking" });
  } finally {
    client.release();
  }
});

// GET /api/bookings/mine - Get current user's bookings
router.get("/mine", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        b.id,
        b.room_id,
        r.name as room_name,
        b.start_time,
        b.end_time,
        b.status,
        b.created_at
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = $1
      ORDER BY b.start_time DESC
    `,
      [userId],
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// DELETE /api/bookings/:id - Cancel a booking
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get the booking
    const bookingResult = await pool.query(
      "SELECT id, user_id, start_time, status FROM bookings WHERE id = $1",
      [bookingId],
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingResult.rows[0];

    // Check ownership
    if (booking.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "You can only cancel your own bookings" });
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // Cannot cancel past bookings
    if (new Date(booking.start_time) < new Date()) {
      return res.status(400).json({ error: "Cannot cancel past bookings" });
    }

    // Cancel the booking
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [
      bookingId,
    ]);

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
