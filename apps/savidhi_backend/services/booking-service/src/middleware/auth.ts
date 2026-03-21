import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Reads identity headers set by the API-gateway / auth-service.
 *   x-user-id       – UUID of the authenticated user
 *   x-user-role     – ADMIN | BOOKING_MANAGER | VIEW_ONLY | DEVOTEE
 */

function raise(status: number, msg: string): never {
  const err: AppError = new Error(msg);
  err.statusCode = status;
  err.isOperational = true;
  throw err;
}

/** Require any authenticated user (admin or devotee). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;
    if (!userId || !role) raise(401, 'Authentication required');
    next();
  } catch (err) {
    next(err);
  }
}

/** Require an admin-level role (ADMIN or BOOKING_MANAGER). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;
    if (!userId || !role) raise(401, 'Authentication required');
    if (role !== 'ADMIN' && role !== 'BOOKING_MANAGER') raise(403, 'Admin access required');
    next();
  } catch (err) {
    next(err);
  }
}

/** Require a devotee role. */
export function requireDevotee(req: Request, _res: Response, next: NextFunction): void {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;
    if (!userId || !role) raise(401, 'Authentication required');
    if (role !== 'DEVOTEE') raise(403, 'Devotee access required');
    next();
  } catch (err) {
    next(err);
  }
}
