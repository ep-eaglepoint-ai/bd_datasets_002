const express = require("express");
const cors = require("cors");
const db = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get("/", (req, res) => {
  res.send("Event Booking API is running");
});

// Routes will be imported here
const routes = require("./routes");
app.use("/api", routes);

// Initialize DB table
const initDb = async () => {
  try {
    await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                event_name VARCHAR(200) NOT NULL,
                venue_name VARCHAR(200) NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                organizer_name VARCHAR(200) NOT NULL,
                attendee_count INTEGER NOT NULL,
                notes VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_name VARCHAR(200);`,
    );
    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS venue_name VARCHAR(200);`,
    );
    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME;`,
    );
    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME;`,
    );
    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(200);`,
    );
    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendee_count INTEGER;`,
    );
    await db.query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes VARCHAR(500);`,
    );

    console.log("Database initialized");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initDb();
});
