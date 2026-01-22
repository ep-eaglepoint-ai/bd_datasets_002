import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const roomsResult = await client.query('SELECT * FROM rooms ORDER BY capacity DESC');
    
    const roomsWithStatus = [];
    for (const room of roomsResult.rows) {
      const bookingsResult = await client.query(
        'SELECT * FROM bookings WHERE room_id = $1 AND status = $2',
        [room.id, 'active']
      );
      
      const now = new Date();
      let isOccupied = false;
      for (const booking of bookingsResult.rows) {
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        if (now >= start && now <= end) {
          isOccupied = true;
          break;
        }
      }
      
      roomsWithStatus.push({
        ...room,
        status: isOccupied ? 'occupied' : 'available'
      });
    }

    res.json(roomsWithStatus);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  } finally {
    client.release();
  }
});

router.get('/:id/bookings', authenticate, async (req, res) => {
  const client = await pool.connect();
  
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

    const bookingsResult = await client.query(`
      SELECT * FROM bookings
      WHERE room_id = $1
      AND status = 'active'
      AND DATE(start_time) = $2
      ORDER BY start_time
    `, [id, date]);

    const bookingsWithUsers = [];
    for (const booking of bookingsResult.rows) {
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [booking.user_id]
      );
      
      bookingsWithUsers.push({
        id: booking.id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        booker_name: userResult.rows[0]?.name,
        booker_id: userResult.rows[0]?.id
      });
    }

    res.json(bookingsWithUsers);
  } catch (error) {
    console.error('Get room bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  } finally {
    client.release();
  }
});

export default router;

