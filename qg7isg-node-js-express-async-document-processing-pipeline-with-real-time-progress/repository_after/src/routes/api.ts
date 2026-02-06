import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload, uploadFile } from '../controllers/uploadController';
import {
  getJobs,
  getJobById,
  getJobErrors,
  cancelJob,
  retryJob,
} from '../controllers/jobController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload endpoint
router.post('/upload', upload.single('file'), uploadFile);

// Job management endpoints
router.get('/jobs', getJobs);
router.get('/jobs/:jobId', getJobById);
router.get('/jobs/:jobId/errors', getJobErrors);
router.post('/jobs/:jobId/cancel', cancelJob);
router.post('/jobs/:jobId/retry', retryJob);

export default router;
