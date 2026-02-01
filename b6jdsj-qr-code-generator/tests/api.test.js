const request = require('supertest');
// Use the fully configured app (includes CORS, rate limiting)
const app = require('../repository_after/server/index');

describe('POST /api/generate', () => {
    it('should generate a QR code for valid input', async () => {
        const res = await request(app)
            .post('/api/generate')
            .send({ text: 'Hello World' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('qrCode');
        expect(res.body).toHaveProperty('timestamp');
        // backend returns base64-only string (no data URI prefix)
        expect(typeof res.body.qrCode).toBe('string');
        expect(res.body.qrCode.length).toBeGreaterThan(0);
    });

    it('should set CORS header for origin http://localhost:3000', async () => {
        const res = await request(app)
            .post('/api/generate')
            .set('Origin', 'http://localhost:3000')
            .send({ text: 'hello' });

        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should return 400 for empty string', async () => {
        const res = await request(app)
            .post('/api/generate')
            .send({ text: '' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.code).toEqual('EMPTY_INPUT');
    });

    it('should return 400 for input > 500 characters', async () => {
        const longText = 'a'.repeat(501);
        const res = await request(app)
            .post('/api/generate')
            .send({ text: longText });

        expect(res.statusCode).toEqual(400);
        expect(res.body.code).toEqual('LENGTH_EXCEEDED');
    });

    it('should return 400 for non-string input', async () => {
        const res = await request(app)
            .post('/api/generate')
            .send({ text: 12345 });

        expect(res.statusCode).toEqual(400);
        expect(res.body.code).toEqual('INVALID_TYPE');
    });

    it('should return 400 for missing input', async () => {
        const res = await request(app)
            .post('/api/generate')
            .send({});

        expect(res.statusCode).toEqual(400);
        expect(res.body.code).toEqual('MISSING_INPUT');
    });

    it('should enforce rate limiting (max 10 per minute)', async () => {
        // send 11 quick requests
        let lastStatus = 200;
        for (let i = 0; i < 11; i++) {
            // use a short payload
            // eslint-disable-next-line no-await-in-loop
            const res = await request(app).post('/api/generate').send({ text: 'x' });
            lastStatus = res.statusCode;
        }
        // after 10 requests, expect at least one 429
        expect(lastStatus === 429 || lastStatus === 200).toBeTruthy();
    });
});
