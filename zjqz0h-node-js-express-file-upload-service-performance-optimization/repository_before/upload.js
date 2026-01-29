const express = require('express');
const multer = require('multer');
const path = require('path');
const config = require('./config');
const storage = require('./storage');
const database = require('./database');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxFileSize }
});

function isAllowedType(mimetype) {
    return config.allowedTypes.includes(mimetype);
}

function isImage(mimetype) {
    return mimetype.startsWith('image/');
}

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        if (!isAllowedType(req.file.mimetype)) {
            return res.status(400).json({ error: 'File type not allowed' });
        }
        
        const filename = req.file.originalname;
        const filePath = storage.saveFile(req.file.buffer, filename);
        
        let thumbnailFilename = null;
        if (isImage(req.file.mimetype)) {
            thumbnailFilename = storage.generateThumbnail(filename);
        }
        
        const uploadId = await database.saveUploadRecord({
            filename: filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: filePath
        });
        
        res.json({
            id: uploadId,
            filename: filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            thumbnail: thumbnailFilename
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

router.post('/multiple', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const results = [];
        
        for (const file of req.files) {
            if (!isAllowedType(file.mimetype)) {
                continue;
            }
            
            const filename = file.originalname;
            const filePath = storage.saveFile(file.buffer, filename);
            
            let thumbnailFilename = null;
            if (isImage(file.mimetype)) {
                thumbnailFilename = storage.generateThumbnail(filename);
            }
            
            const uploadId = await database.saveUploadRecord({
                filename: filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                path: filePath
            });
            
            results.push({
                id: uploadId,
                filename: filename,
                size: file.size,
                mimetype: file.mimetype,
                thumbnail: thumbnailFilename
            });
        }
        
        res.json({ uploads: results });
        
    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const upload = await database.getUploadById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ error: 'Upload not found' });
        }
        
        res.json(upload);
        
    } catch (error) {
        console.error('Get upload error:', error);
        res.status(500).json({ error: 'Failed to get upload' });
    }
});

router.get('/:id/download', async (req, res) => {
    try {
        const upload = await database.getUploadById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ error: 'Upload not found' });
        }
        
        const fileBuffer = storage.readFile(upload.filename);
        
        res.setHeader('Content-Type', upload.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${upload.original_name}"`);
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const upload = await database.getUploadById(req.params.id);
        
        if (!upload) {
            return res.status(404).json({ error: 'Upload not found' });
        }
        
        storage.deleteFile(upload.filename);
        await database.deleteUploadRecord(req.params.id);
        
        res.json({ message: 'Upload deleted' });
        
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

router.get('/', async (req, res) => {
    try {
        const uploads = await database.getAllUploads();
        res.json({ uploads });
    } catch (error) {
        console.error('List uploads error:', error);
        res.status(500).json({ error: 'Failed to list uploads' });
    }
});

module.exports = router;
