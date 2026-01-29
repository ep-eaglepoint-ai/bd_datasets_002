import express from 'express';
import request from 'supertest';
import { requestTimeoutMiddleware } from '../repository_after/src/timeoutMiddleware';

/** Request timeout middleware tests: Req-14 (504 Gateway Timeout for hanging requests) */
describe('requestTimeoutMiddleware', () => {
    /** TC-01 | Req-14: Return 504 Gateway Timeout when request exceeds timeout */
    it('returns 504 Gateway Timeout when request exceeds timeout', async () => {
        jest.useFakeTimers();
        const timeoutMs = 100;
        const app = express();
        app.use(requestTimeoutMiddleware(timeoutMs));
        app.get('/hang', (_req, _res) => {
            /* never responds */
        });

        const reqPromise = request(app).get('/hang');
        jest.advanceTimersByTime(timeoutMs + 50);

        const res = await reqPromise;
        expect(res.status).toBe(504);
        expect(res.body.error).toBe('Gateway Timeout');

        jest.useRealTimers();
    });

    /** TC-02 | Req-14: Do not send 504 when response finishes before timeout */
    it('does not send 504 when response finishes before timeout', async () => {
        jest.useFakeTimers();
        const timeoutMs = 10_000;
        const app = express();
        app.use(requestTimeoutMiddleware(timeoutMs));
        app.get('/ok', (_req, res) => {
            res.json({ ok: true });
        });

        const reqPromise = request(app).get('/ok');
        jest.advanceTimersByTime(100);

        const res = await reqPromise;
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);

        jest.useRealTimers();
    });
});
