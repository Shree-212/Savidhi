import { Request, Response, NextFunction } from 'express';

/**
 * Identity is set by the gateway (`x-user-id`, `x-user-role`, `x-user-type`)
 * after it verifies the JWT against auth-service. Downstream services trust
 * the gateway and only require these headers to be present.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string | undefined;
  const userRole = req.headers['x-user-role'] as string | undefined;

  if (!userId || !userRole) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  next();
}
