import { randomUUID } from 'crypto';
import { Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import prisma from '../config/database';
import { processingQueue } from '../config/queue';
import { AuthenticatedRequest } from '../middleware/auth';

// Ensure upload directory exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, JSON, and XML files are allowed.'));
    }
  },
});

export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { schemaId } = req.body;
    const partnerId = req.partner!.id;

    if (!schemaId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'schemaId is required' });
      return;
    }

    // Verify schema exists and belongs to partner
    const schema = await prisma.schema.findFirst({
      where: { id: schemaId, partnerId },
    });

    if (!schema) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: 'Schema not found' });
      return;
    }

    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);

    // Create job record
    const job = await prisma.job.create({
      data: {
        partnerId,
        schemaId,
        filename: req.file.filename,
        fileSize: BigInt(req.file.size),
        fileType,
        status: 'PENDING',
      },
    });

    // Add to queue
    await processingQueue.add('process-document', {
      jobId: job.id,
      partnerId,
      schemaId,
      filename: req.file.filename,
      fileType,
    });

    const responseTime = Date.now() - startTime;

    res.status(201).json({
      job_id: job.id,
      status: job.status,
      filename: req.file.originalname,
      fileSize: req.file.size,
      responseTime: `${responseTime}ms`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  }
};
