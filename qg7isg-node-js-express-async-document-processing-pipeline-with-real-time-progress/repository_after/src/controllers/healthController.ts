import { Request, Response } from 'express';
import prisma from '../config/database';
import redis from '../config/redis';

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connectivity
    await redis.ping();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
