import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  clientId: string;
  clientEmail: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Unauthorized'));
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    (req as AuthRequest).clientId = payload.clientId;
    (req as AuthRequest).clientEmail = payload.email;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

// Alias for backwards compatibility
export const authenticateToken = requireAuth;
