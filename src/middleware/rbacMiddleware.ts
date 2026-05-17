import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { ApiError } from '../utils/ApiError';

export const requireAdmin = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Forbidden — Admin access required'));
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden — Insufficient permissions'));
    }
    next();
  };
};
