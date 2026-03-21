import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM app_settings WHERE id = 1');
    if (result.rows.length === 0) {
      res.json({ success: true, data: null, message: 'Settings not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Settings fetched' });
  } catch (err) { next(err); }
});

settingsRouter.patch('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { home_puja_slider_ids, whatsapp_support_number, call_support_number } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (home_puja_slider_ids !== undefined) {
      fields.push(`home_puja_slider_ids = $${idx++}`);
      values.push(home_puja_slider_ids);
    }
    if (whatsapp_support_number !== undefined) {
      fields.push(`whatsapp_support_number = $${idx++}`);
      values.push(whatsapp_support_number);
    }
    if (call_support_number !== undefined) {
      fields.push(`call_support_number = $${idx++}`);
      values.push(call_support_number);
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }

    fields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE app_settings SET ${fields.join(', ')} WHERE id = 1 RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0], message: 'Settings updated' });
  } catch (err) { next(err); }
});
