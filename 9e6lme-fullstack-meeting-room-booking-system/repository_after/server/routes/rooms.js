import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/rooms - List all rooms with current availability
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.capacity,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.room_id = r.id 
              AND b.status = 'confirmed'
              AND b.start_time <= $1 
              AND b.end_time > $1
          ) THEN 'occupied'
          ELSE 'available'
        END as status
      FROM rooms r
      ORDER BY r.id
    `, [now]);

    res.json({ rooms: result.rows });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/rooms/:id/bookings?date=YYYY-MM-DD - Get bookings for a room on a specific date
router.get('/:id/bookings', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Verify room exists
    const roomResult = await pool.query('SELECT id, name, capacity FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get bookings for the specified date
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const bookingsResult = await pool.query(`
      SELECT 
        b.id,
        b.start_time,
        b.end_time,
        b.status,
        u.name as booker_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.room_id = $1
        AND b.status = 'confirmed'
        AND b.start_time >= $2
        AND b.start_time < $3
      ORDER BY b.start_time
    `, [roomId, startOfDay, endOfDay]);

    res.json({
      room: roomResult.rows[0],
      date,
      bookings: bookingsResult.rows
    });
  } catch (error) {
    console.error('Error fetching room bookings:', error);
    res.status(500).json({ error: 'Failed to fetch room bookings' });
  }
});

export default router;
