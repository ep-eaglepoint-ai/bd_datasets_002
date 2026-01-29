const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../data', 'sensors.db');
  }

  async connect() {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Could not connect to database', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.initSchema().then(resolve).catch(reject);
        }
      });
    });
  }

  async initSchema() {
    const sql = `
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        value REAL NOT NULL,
        type TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sensor_time ON readings(sensor_id, timestamp);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async insertBatch(readings) {
    if (!readings || readings.length === 0) return;

    return new Promise((resolve, reject) => {
      const db = this.db;
      db.serialize(() => {
        db.exec('BEGIN TRANSACTION');
        
        const stmt = db.prepare('INSERT INTO readings (sensor_id, timestamp, value, type) VALUES (?, ?, ?, ?)');
        
        for (const r of readings) {
          stmt.run(r.sensorId, r.timestamp, r.value, r.type);
        }
        
        stmt.finalize((err) => {
          if (err) {
            db.exec('ROLLBACK');
            reject(err);
          } else {
            db.exec('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          }
        });
      });
    });
  }

  async queryRange(sensorId, startMs, endMs) {
    const sql = `
      SELECT timestamp, value, type 
      FROM readings 
      WHERE sensor_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [sensorId, startMs, endMs], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Singleton instance
const db = new Database();

module.exports = db;
