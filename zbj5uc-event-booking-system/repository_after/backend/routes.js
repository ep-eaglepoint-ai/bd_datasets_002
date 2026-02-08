const express = require("express");
const router = express.Router();
const db = require("./db");

const isValidDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const isValidTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const toMinutes = (value) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const validateBooking = (payload) => {
  const errors = {};
  const eventName =
    typeof payload.eventName === "string" ? payload.eventName.trim() : "";
  const venueName =
    typeof payload.venueName === "string" ? payload.venueName.trim() : "";
  const organizerName =
    typeof payload.organizerName === "string"
      ? payload.organizerName.trim()
      : "";
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  const startTime =
    typeof payload.startTime === "string" ? payload.startTime.trim() : "";
  const endTime =
    typeof payload.endTime === "string" ? payload.endTime.trim() : "";
  const attendeeCount = Number(payload.attendeeCount);
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";

  if (!eventName) {
    errors.eventName = "Event name is required.";
  } else if (eventName.length > 200) {
    errors.eventName = "Event name must be 1-200 characters.";
  }

  if (!venueName) {
    errors.venueName = "Venue/room name is required.";
  }

  if (!organizerName) {
    errors.organizerName = "Organizer name is required.";
  }

  if (!date) {
    errors.date = "Date is required.";
  } else if (!isValidDate(date)) {
    errors.date = "Date must be a valid date (YYYY-MM-DD).";
  }

  if (!startTime) {
    errors.startTime = "Start time is required.";
  } else if (!isValidTime(startTime)) {
    errors.startTime = "Start time must be a valid time (HH:MM).";
  }

  if (!endTime) {
    errors.endTime = "End time is required.";
  } else if (!isValidTime(endTime)) {
    errors.endTime = "End time must be a valid time (HH:MM).";
  }

  if (isValidTime(startTime) && isValidTime(endTime)) {
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      errors.endTime = "End time must be after start time.";
    }
  }

  if (!Number.isInteger(attendeeCount) || attendeeCount <= 0) {
    errors.attendeeCount = "Attendee count must be a positive integer.";
  }

  if (notes && notes.length > 500) {
    errors.notes = "Notes must be 500 characters or less.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      eventName,
      venueName,
      organizerName,
      date,
      startTime,
      endTime,
      attendeeCount,
      notes: notes || null,
    },
  };
};

// GET all bookings
router.get("/bookings", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM bookings ORDER BY date, start_time",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET a single booking
router.get("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM bookings WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST a new booking
router.post("/bookings", async (req, res) => {
  const { isValid, errors, normalized } = validateBooking(req.body);

  if (!isValid) {
    return res.status(400).json({ error: "Validation failed", fields: errors });
  }

  try {
    const result = await db.query(
      `INSERT INTO bookings
                (event_name, venue_name, date, start_time, end_time, organizer_name, attendee_count, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
      [
        normalized.eventName,
        normalized.venueName,
        normalized.date,
        normalized.startTime,
        normalized.endTime,
        normalized.organizerName,
        normalized.attendeeCount,
        normalized.notes,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT (update) a booking
router.put("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { isValid, errors, normalized } = validateBooking(req.body);

  if (!isValid) {
    return res.status(400).json({ error: "Validation failed", fields: errors });
  }

  try {
    const result = await db.query(
      `UPDATE bookings
             SET event_name = $1,
                 venue_name = $2,
                 date = $3,
                 start_time = $4,
                 end_time = $5,
                 organizer_name = $6,
                 attendee_count = $7,
                 notes = $8
             WHERE id = $9
             RETURNING *`,
      [
        normalized.eventName,
        normalized.venueName,
        normalized.date,
        normalized.startTime,
        normalized.endTime,
        normalized.organizerName,
        normalized.attendeeCount,
        normalized.notes,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE a booking
router.delete("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM bookings WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
