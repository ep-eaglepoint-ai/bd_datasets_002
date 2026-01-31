import { Request, Response } from 'express';
import prisma from '../config/database';
import redis from '../config/redis';

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const services: Record<string, string> = {
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      services.database = 'connected';
    } catch (e) {
      services.database = 'disconnected';
    }
    
    // Check Redis connectivity
    try {
      await redis.ping();
      services.redis = 'connected';
    } catch (e) {
      services.redis = 'disconnected';
    }

    const isHealthy = Object.values(services).every(status => status === 'connected');

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
