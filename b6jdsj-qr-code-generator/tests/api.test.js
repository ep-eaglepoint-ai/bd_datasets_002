const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const routes = require('../repository_after/server/routes');

const app = express();
app.use(bodyParser.json());
app.use('/api', routes);

describe('POST /api/generate', () => {
    it('should generate a QR code for valid input', async () => {
        const res = await request(app)
            .post('/api/generate')
            .send({ text: 'Hello World' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('qrCode');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
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
});
