import { Router, Request, Response, NextFunction } from 'express';

export const usersRouter = Router();

/** GET /api/v1/users/me */
usersRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: validate JWT from Authorization header, fetch user from DB
    res.json({ success: true, data: null, message: 'User profile endpoint (stub)' });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/users/:id */
usersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: fetch user by id from DB
    res.json({ success: true, data: { id }, message: 'User fetch endpoint (stub)' });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/v1/users/:id */
usersRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: validate body, update user in DB
    res.json({ success: true, data: { id }, message: 'User update endpoint (stub)' });
  } catch (err) {
    next(err);
  }
});
