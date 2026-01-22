import express from 'express';
import cors from 'cors';
import pool from './db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function waitForDB() {
  let retries = 15;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');
      return true;
    } catch (error) {
      console.log(`Waiting for database... (${retries} retries left)`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Could not connect to database');
}

async function start() {
  try {
    await waitForDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

