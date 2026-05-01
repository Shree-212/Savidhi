import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Postgres foreign-key violation → translate to 409 instead of opaque 500.
  const pgCode = (err as unknown as { code?: string }).code;
  if (pgCode === '23503') {
    console.error('[errorHandler] FK violation:', err);
    res.status(409).json({
      success: false,
      message: 'Cannot delete: this record is still referenced by other data. Remove or reassign the dependents first.',
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  console.error('[errorHandler]', err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
