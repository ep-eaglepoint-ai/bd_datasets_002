import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.room_id = r.id 
            AND b.status = 'active'
            AND NOW() BETWEEN b.start_time AND b.end_time
          ) THEN 'occupied'
          ELSE 'available'
        END as status
      FROM rooms r
      ORDER BY r.capacity DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/:id/bookings', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const result = await pool.query(`
      SELECT 
        b.id,
        b.start_time,
        b.end_time,
        b.status,
        u.name as booker_name,
        u.id as booker_id
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.room_id = $1
      AND b.status = 'active'
      AND b.start_time >= $2::date
      AND b.start_time < ($2::date + INTERVAL '1 day')
      ORDER BY b.start_time
    `, [id, date]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get room bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

export default router;

