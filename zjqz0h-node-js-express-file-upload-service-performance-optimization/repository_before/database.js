const { Client } = require('pg');
const config = require('./config');

async function saveUploadRecord(fileData) {
    const client = new Client(config.database);
    await client.connect();
    
    const query = `
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
    
    const result = await client.query(query, values);
    return result.rows[0].id;
}

async function getUploadById(id) {
    const client = new Client(config.database);
    await client.connect();
    
    const query = 'SELECT * FROM uploads WHERE id = $1';
    const result = await client.query(query, [id]);
    
    return result.rows[0];
}

async function getAllUploads() {
    const client = new Client(config.database);
    await client.connect();
    
    const query = 'SELECT * FROM uploads ORDER BY uploaded_at DESC';
    const result = await client.query(query);
    
    return result.rows;
}

async function deleteUploadRecord(id) {
    const client = new Client(config.database);
    await client.connect();
    
    const query = 'DELETE FROM uploads WHERE id = $1';
    await client.query(query, [id]);
}

module.exports = {
    saveUploadRecord,
    getUploadById,
    getAllUploads,
    deleteUploadRecord
};
