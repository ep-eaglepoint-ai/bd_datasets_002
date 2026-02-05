const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { validateGenerateInput } = require('./validators');

// Helper to generate QR with 2s timeout and error correction level H
function generateQrDataUrlWithTimeout(text, ms = 2000) {
    const gen = QRCode.toDataURL(text, { errorCorrectionLevel: 'H', type: 'image/png' });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('QR generation timeout')), ms));
    return Promise.race([gen, timeout]);
}

router.post('/generate', async (req, res) => {
    const { text } = req.body;

    const validationError = validateGenerateInput(text);
    if (validationError) {
        return res.status(400).json(validationError);
    }

    try {
        const dataUrl = await generateQrDataUrlWithTimeout(text, 2000);
        // strip data URI prefix and return base64-only as required
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        res.json({ qrCode: base64, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('QR Gen Error:', error && error.stack ? error.stack : error);
        if (error && error.message === 'QR generation timeout') {
            return res.status(500).json({ error: 'QR generation timed out', code: 'GENERATION_TIMEOUT' });
        }
        res.status(500).json({ error: 'Failed to generate QR code', code: 'GENERATION_FAILED' });
    }
});

module.exports = router;
