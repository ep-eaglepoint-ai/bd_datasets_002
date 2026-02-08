import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 240;
const OPERATING_HOUR_START = 9;
const OPERATING_HOUR_END = 18;

function validateBooking(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (start <= now) {
    return { valid: false, error: 'Cannot book in the past' };
  }

  if (end <= start) {
    return { valid: false, error: 'End time must be after start time' };
  }

  const durationMinutes = (end - start) / (1000 * 60);

  if (durationMinutes < MIN_DURATION_MINUTES) {
    return { valid: false, error: `Minimum booking duration is ${MIN_DURATION_MINUTES} minutes` };
  }

  if (durationMinutes > MAX_DURATION_MINUTES) {
    return { valid: false, error: `Maximum booking duration is ${MAX_DURATION_MINUTES} minutes (4 hours)` };
  }

  if (start.toDateString() !== end.toDateString()) {
    return { valid: false, error: 'Bookings cannot cross midnight' };
  }

  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes < OPERATING_HOUR_START * 60) {
    return { valid: false, error: 'Bookings must start at or after 9:00 AM' };
  }

  if (endMinutes > OPERATING_HOUR_END * 60) {
    return { valid: false, error: 'Bookings must end at or before 6:00 PM' };
  }

  return { valid: true };
}

router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { roomId, startTime, endTime } = req.body;

    if (!roomId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Room ID, start time, and end time are required' });
    }

    const validation = validateBooking(startTime, endTime);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const roomCheck = await client.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await client.query('BEGIN');

    try {
      const result = await client.query(`
        INSERT INTO bookings (room_id, user_id, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING *
      `, [roomId, req.user.id, startTime, endTime]);

      await client.query('COMMIT');

      res.status(201).json({ 
        message: 'Booking created successfully',
        booking: result.rows[0] 
      });
      
    } catch (insertError) {
      await client.query('ROLLBACK');
      
      if (insertError.code === '23P01') {
        return res.status(409).json({ 
          error: 'This time slot overlaps with an existing booking' 
        });
      }
      
      throw insertError;
    }
    
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        r.name as room_name,
        r.capacity as room_capacity
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = $1
      ORDER BY b.start_time DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    const bookingResult = await client.query(
      'SELECT user_id, status, start_time FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    if (new Date(booking.start_time) <= new Date()) {
      return res.status(400).json({ error: 'Cannot cancel past bookings' });
    }

    await client.query(
      'UPDATE bookings SET status = $1 WHERE id = $2',
      ['cancelled', id]
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

export default router;

