const express = require('express');
const config = require('./config');
const uploadRouter = require('./upload');
const storage = require('./storage');

const app = express();

app.use(express.json());

storage.ensureDirectories();

app.use('/uploads', uploadRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/stats', async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    const files = fs.readdirSync(config.uploadDir);
    let totalSize = 0;
    
    for (const file of files) {
        const stats = fs.statSync(path.join(config.uploadDir, file));
        totalSize += stats.size;
    }
    
    res.json({
        fileCount: files.length,
        totalSize: totalSize,
        uploadDir: config.uploadDir
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
