const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Only allow requests from the frontend running on localhost:3000
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

// Basic rate limiting for all /api routes: max 10 reqs per minute per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' });
    }
});

app.use('/api', apiLimiter, routes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
});

// Export the app for testing; only listen when run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
