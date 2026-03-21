import { Request, Response, NextFunction } from 'express';

/**
 * Placeholder auth middleware.
 * In production this would verify a JWT or session token passed
 * from the API gateway / auth-service.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // TODO: verify JWT with auth-service shared secret / JWKS
  // For now, pass through any bearer token for development.
  next();
}
