const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
    res.send('Event Booking API is running');
});

// Routes will be imported here
const routes = require('./routes');
app.use('/api', routes);

// Initialize DB table
const initDb = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database initialized');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initDb();
});
