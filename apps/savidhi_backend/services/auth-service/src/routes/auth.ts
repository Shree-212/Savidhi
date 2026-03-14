import { Router, Request, Response, NextFunction } from 'express';

export const authRouter = Router();

/** POST /api/v1/auth/register */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: validate body, hash password, save user, return tokens
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/auth/login */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: validate credentials, issue JWT access + refresh tokens
    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/auth/logout */
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('savidhi_admin_token');
  res.json({ success: true, message: 'Logged out' });
});

/** POST /api/v1/auth/refresh */
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: validate refresh token, issue new access token
    res.json({ success: true, message: 'Token refreshed' });
  } catch (err) {
    next(err);
  }
});
