import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/database';
import { JobStatus } from '@prisma/client';

/** Serialize objects for JSON response (BigInt -> string so res.json works) */
function serializeForJson<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))
  ) as T;
}

export const getJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partnerId = req.partner!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as JobStatus | undefined;

    const skip = (page - 1) * limit;

    const where = {
      partnerId,
      ...(status && { status }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          schema: {
            select: { name: true, version: true },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      data: serializeForJson(jobs),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.jobId);
    const partnerId = req.partner!.id;

    const job = await prisma.job.findFirst({
      where: { id: jobId, partnerId },
      include: {
        schema: true,
        partner: {
          select: { id: true, name: true },
        },
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(serializeForJson(job));
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to retrieve job' });
  }
};

export const getJobErrors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.jobId);
    const partnerId = req.partner!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify job belongs to partner
    const job = await prisma.job.findFirst({
      where: { id: jobId, partnerId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const skip = (page - 1) * limit;

    const [errors, total] = await Promise.all([
      prisma.processingError.findMany({
        where: { jobId },
        skip,
        take: limit,
        orderBy: { recordIndex: 'asc' },
      }),
      prisma.processingError.count({ where: { jobId } }),
    ]);

    res.json({
      data: errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get job errors error:', error);
    res.status(500).json({ error: 'Failed to retrieve job errors' });
  }
};

export const cancelJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.jobId);
    const partnerId = req.partner!.id;

    const job = await prisma.job.findFirst({
      where: { id: jobId, partnerId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'PENDING' && job.status !== 'PROCESSING') {
      res.status(400).json({ error: 'Only PENDING or PROCESSING jobs can be cancelled' });
      return;
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    res.json(serializeForJson(updatedJob));
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
};

export const retryJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobId = String(req.params.jobId);
    const partnerId = req.partner!.id;

    const job = await prisma.job.findFirst({
      where: { id: jobId, partnerId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'FAILED') {
      res.status(400).json({ error: 'Only FAILED jobs can be retried' });
      return;
    }

    // Delete existing errors
    await prisma.processingError.deleteMany({
      where: { jobId },
    });

    // Reset job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        progress: 0,
        recordsProcessed: 0,
        recordsFailed: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    // Re-queue the job
    const { processingQueue } = await import('../config/queue');
    await processingQueue.add('process-document', {
      jobId: job.id,
      partnerId: job.partnerId,
      schemaId: job.schemaId,
      filename: job.filename,
      fileType: job.fileType,
    });

    res.json(serializeForJson(updatedJob));
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
};
