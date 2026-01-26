const express = require('express');
const router = express.Router();
const db = require('./db');

// GET all bookings
router.get('/bookings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bookings ORDER BY date, time');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST a new booking
router.post('/bookings', async (req, res) => {
    const { title, date, time, description } = req.body;

    // Simple validation (can be enhanced)
    if (!title || !date || !time) {
        return res.status(400).json({ error: 'Title, date, and time are required' });
    }

    try {
        // Prevent simple database errors by validating types/content if needed, relies on DB for now
        const result = await db.query(
            'INSERT INTO bookings (title, date, time, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, date, time, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT (update) a booking
router.put('/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { title, date, time, description } = req.body;

    if (!title || !date || !time) {
        return res.status(400).json({ error: 'Title, date, and time are required' });
    }

    try {
        const result = await db.query(
            'UPDATE bookings SET title = $1, date = $2, time = $3, description = $4 WHERE id = $5 RETURNING *',
            [title, date, time, description, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE a booking
router.delete('/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
