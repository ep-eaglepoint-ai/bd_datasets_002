import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export interface AuthenticatedRequest extends Request {
  partner?: {
    id: string;
    name: string;
    apiKey: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    const partner = await prisma.partner.findUnique({
      where: { apiKey },
      select: { id: true, name: true, apiKey: true },
    });

    if (!partner) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    req.partner = partner;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
