const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.database);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function query(text, params) {
    return pool.query(text, params);
}

async function saveUploadRecord(fileData) {
    const queryText = `
        INSERT INTO uploads (filename, original_name, size, mimetype, path, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
    `;

    const values = [
        fileData.filename,
        fileData.originalName,
        fileData.size,
        fileData.mimetype,
        fileData.path
    ];

    const result = await pool.query(queryText, values);
    return result.rows[0].id;
}

async function getUploadById(id) {
    const queryText = 'SELECT * FROM uploads WHERE id = $1';
    const result = await pool.query(queryText, [id]);
    return result.rows[0];
}

async function getAllUploads() {
    const queryText = 'SELECT * FROM uploads ORDER BY uploaded_at DESC';
    const result = await pool.query(queryText);
    return result.rows;
}

async function deleteUploadRecord(id) {
    const queryText = 'DELETE FROM uploads WHERE id = $1';
    await pool.query(queryText, [id]);
}

async function end() {
    await pool.end();
}

async function init() {
    const queryText = `
        CREATE TABLE IF NOT EXISTS uploads (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            size BIGINT NOT NULL,
            mimetype TEXT NOT NULL,
            path TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
    `;
    await pool.query(queryText);
}

module.exports = {
    init,
    query,
    saveUploadRecord,
    getUploadById,
    getAllUploads,
    deleteUploadRecord,
    end
};
