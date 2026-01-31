const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 10;

const TIER_LIMITS = {
    free: {
        requestsPerHour: 100,
        maxResources: 10
    },
    pro: {
        requestsPerHour: 1000,
        maxResources: 100
    },
    enterprise: {
        requestsPerHour: 10000,
        maxResources: 1000
    }
};

class User {
    static async create(email, password, tier = 'free') {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, tier) VALUES ($1, $2, $3) RETURNING id, email, tier, role, created_at',
            [email, passwordHash, tier]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    static async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async updateTier(id, tier) {
        if (!TIER_LIMITS[tier]) {
            throw new Error('Invalid tier');
        }
        const result = await pool.query(
            'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [tier, id]
        );
        return result.rows[0] || null;
    }

    static async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const result = await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, tier, role',
            [passwordHash, id]
        );
        return result.rows[0] || null;
    }

    static getTierLimits(tier) {
        return TIER_LIMITS[tier] || TIER_LIMITS.free;
    }

    static async delete(id) {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows.length > 0;
    }
}

module.exports = User;
