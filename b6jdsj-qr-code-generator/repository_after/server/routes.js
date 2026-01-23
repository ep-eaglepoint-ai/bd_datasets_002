const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { validateGenerateInput } = require('./validators');

router.post('/generate', async (req, res) => {
    const { text } = req.body;

    const validationError = validateGenerateInput(text);
    if (validationError) {
        return res.status(400).json(validationError);
    }

    try {
        const qrCode = await QRCode.toDataURL(text);
        res.json({
            qrCode,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('QR Gen Error:', error);
        res.status(500).json({ error: 'Failed to generate QR code', code: 'GENERATION_FAILED' });
    }
});

module.exports = router;
