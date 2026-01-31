const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const redis = new Redis(process.env.REDIS_URL);

const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const user = await User.create(email, password);
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ user: { id: user.id, email: user.email, tier: user.tier }, token });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ user: { id: user.id, email: user.email, tier: user.tier }, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/resources', authenticateJWT, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM resources WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/resources', authenticateJWT, async (req, res) => {
    const { name, data } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO resources (user_id, name, data) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, name, data || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/resources/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { name, data } = req.body;

    try {
        const result = await pool.query(
            'UPDATE resources SET name = COALESCE($1, name), data = COALESCE($2, data), updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
            [name, data, id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/resources/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM resources WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/me', authenticateJWT, async (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        tier: req.user.tier,
        role: req.user.role,
        created_at: req.user.created_at
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
