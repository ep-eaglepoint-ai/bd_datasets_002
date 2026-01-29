const path = require('path');

module.exports = {
    port: 3000,
    uploadDir: path.join(__dirname, 'uploads'),
    thumbnailDir: path.join(__dirname, 'thumbnails'),
    maxFileSize: 100 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    thumbnailSize: { width: 200, height: 200 },
    database: {
        host: 'localhost',
        port: 5432,
        database: 'uploads_db',
        user: 'postgres',
        password: 'postgres'
    }
};
