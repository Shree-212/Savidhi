import { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  id: string;
  role: string;
  type: 'ADMIN' | 'DEVOTEE';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userType = req.headers['x-user-type'] as string;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  req.user = { id: userId, role: userRole, type: userType as 'ADMIN' | 'DEVOTEE' };
  next();
}

export function requireAdmin(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.type !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireDevotee(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.type !== 'DEVOTEE') {
    res.status(403).json({ success: false, message: 'Devotee access required' });
    return;
  }
  next();
}
