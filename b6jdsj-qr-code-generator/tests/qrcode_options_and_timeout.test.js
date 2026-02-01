const request = require('supertest');

describe('QR generation options and timeout', () => {
  afterEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('uses errorCorrectionLevel H when generating QR', async () => {
    jest.resetModules();
    jest.mock('qrcode', () => ({
      toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,AAA')),
    }), { virtual: true });

    const app = require('../repository_after/server/index');
    await request(app)
      .post('/api/generate')
      .send({ text: 'hello' })
      .expect(200);

    const qrcode = require('qrcode');
    expect(qrcode.toDataURL).toHaveBeenCalled();
    const opts = qrcode.toDataURL.mock.calls[0][1];
    expect(opts).toBeDefined();
    expect(opts.errorCorrectionLevel).toBe('H');
  });

  test('times out if QR generation exceeds 2 seconds', async () => {
    jest.resetModules();

    // use a slightly longer real timeout (2.5s) in the mock so server 2s timeout fires
    jest.mock('qrcode', () => ({
      toDataURL: jest.fn(() => new Promise((resolve) => setTimeout(() => resolve('data:image/png;base64,AAA'), 2500))),
    }), { virtual: true });

    const app = require('../repository_after/server/index');

    const res = await request(app)
      .post('/api/generate')
      .send({ text: 'slow' });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('code', 'GENERATION_TIMEOUT');
  }, 10000);
});
