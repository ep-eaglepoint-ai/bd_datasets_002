const express = require('express');
const config = require('./config');
const uploadRouter = require('./upload');
const storage = require('./storage');

const app = express();

app.use(express.json());

storage.init();

app.use('/uploads', uploadRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/stats', async (req, res) => {
    try {
        const stats = await storage.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (require.main === module) {
    const database = require('./database');

    database.init().then(() => {
        const server = app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
        });

        server.timeout = config.requestTimeout;
        server.keepAliveTimeout = config.requestTimeout;
        server.headersTimeout = config.requestTimeout + 1000;
    }).catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
}
