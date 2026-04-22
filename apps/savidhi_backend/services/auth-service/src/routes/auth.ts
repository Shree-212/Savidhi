import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import pool from '../lib/db';
import redisClient, { connectRedis } from '../lib/redis';
import * as twilioHelper from '../lib/twilio';

export const authRouter = Router();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'changeme_access';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'changeme_refresh';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES ?? '1h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES ?? '7d';

// ─── Validation Schemas ─────────────────────────────────────────────────────

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const otpSendSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
});

const otpVerifySchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  otp: Joi.string().length(6).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(255).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('ADMIN', 'BOOKING_MANAGER', 'VIEW_ONLY').required(),
});

// ─── Helper: generate tokens ────────────────────────────────────────────────

function generateTokens(userId: string, userType: 'ADMIN' | 'DEVOTEE', role?: string) {
  const payload = { sub: userId, type: userType, role: role ?? '' };
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES as any });
  const refreshToken = jwt.sign({ sub: userId, type: userType }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES as any });
  return { accessToken, refreshToken };
}

// ─── POST /login (Admin email/password) ─────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { email, password } = value;
    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(admin.id, 'ADMIN', admin.role);

    // Store refresh token hash in DB
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, user_type, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
      [admin.id, 'ADMIN', tokenHash]
    );

    // Set httpOnly cookie for admin
    res.cookie('savidhi_admin_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hour
      path: '/',
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /register (Admin only can create admins) ──────────────────────────

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { email, name, password, role } = value;

    // Check if email exists
    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admin_users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email, name, passwordHash, role]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Admin user created' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /logout ──────────────────────────────────────────────────────────

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('savidhi_admin_token', { path: '/' });
  res.json({ success: true, message: 'Logged out' });
});

// ─── POST /refresh ──────────────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Find matching non-revoked refresh token
    const tokens = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND user_type = $2 AND revoked = false ORDER BY created_at DESC LIMIT 5',
      [decoded.sub, decoded.type]
    );

    let validToken = false;
    for (const t of tokens.rows) {
      if (await bcrypt.compare(refreshToken, t.token_hash)) {
        validToken = true;
        // Revoke old token
        await pool.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [t.id]);
        break;
      }
    }

    if (!validToken) return res.status(401).json({ success: false, message: 'Refresh token not found or revoked' });

    // Fetch user to get current role
    let role = '';
    if (decoded.type === 'ADMIN') {
      const admin = await pool.query('SELECT role FROM admin_users WHERE id = $1 AND is_active = true', [decoded.sub]);
      if (admin.rows.length === 0) return res.status(401).json({ success: false, message: 'User not found' });
      role = admin.rows[0].role;
    }

    const newTokens = generateTokens(decoded.sub, decoded.type, role);

    // Store new refresh token
    const tokenHash = await bcrypt.hash(newTokens.refreshToken, 10);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, user_type, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
      [decoded.sub, decoded.type, tokenHash]
    );

    if (decoded.type === 'ADMIN') {
      res.cookie('savidhi_admin_token', newTokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600000,
        path: '/',
      });
    }

    res.json({ success: true, data: newTokens, message: 'Token refreshed' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /otp/send (Devotee phone login) ──────────────────────────────────
// Strategy:
//   1. If Twilio credentials present, use Twilio Verify (real SMS).
//   2. Otherwise, fall back to a local 6-digit OTP stashed in Redis + logged
//      to console for local dev.
// In either case the client sees the same API.

authRouter.post('/otp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = otpSendSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { phone } = value;

    // Dev/test phone numbers (9000000000-9000000099) always use the Redis stub so
    // automated end-to-end tests can read the OTP without hitting Twilio (which
    // won't SMS unverified numbers on a trial account).
    const isTestPhone = /^90000000\d{2}$/.test(phone);

    if (twilioHelper.isConfigured() && !isTestPhone) {
      try {
        await twilioHelper.sendOtp(phone);
        return res.json({ success: true, message: 'OTP sent via SMS', channel: 'twilio' });
      } catch (err: any) {
        console.error('[twilio] sendOtp failed, falling back to Redis stub:', err.message ?? err);
      }
    }

    // Redis stub — dev fallback
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redis = await connectRedis();
    await redis.set(`otp:${phone}`, otp, { EX: 300 });
    console.log(`[auth] OTP for ${phone}: ${otp}`);
    res.json({ success: true, message: 'OTP sent successfully', channel: 'stub' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /otp/verify ──────────────────────────────────────────────────────

authRouter.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = otpVerifySchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { phone, otp } = value;
    let verified = false;

    const isTestPhone = /^90000000\d{2}$/.test(phone);

    if (twilioHelper.isConfigured() && !isTestPhone) {
      try {
        verified = await twilioHelper.checkOtp(phone, otp);
      } catch (err: any) {
        console.error('[twilio] checkOtp failed, falling back to Redis stub:', err.message ?? err);
      }
    }

    if (!verified) {
      // Redis stub fallback (also handles the case where we sent via stub above)
      const redis = await connectRedis();
      const storedOtp = await redis.get(`otp:${phone}`);
      if (storedOtp && storedOtp === otp) {
        verified = true;
        await redis.del(`otp:${phone}`);
      }
    }

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Find or create devotee
    let devotee = (await pool.query('SELECT * FROM devotees WHERE phone = $1', [phone])).rows[0];
    if (!devotee) {
      const result = await pool.query(
        'INSERT INTO devotees (name, phone) VALUES ($1, $2) RETURNING *',
        [`Devotee_${phone.slice(-4)}`, phone]
      );
      devotee = result.rows[0];
    }

    const { accessToken, refreshToken } = generateTokens(devotee.id, 'DEVOTEE');

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, user_type, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
      [devotee.id, 'DEVOTEE', tokenHash]
    );

    res.json({
      success: true,
      message: 'OTP verified',
      data: {
        user: { id: devotee.id, name: devotee.name, phone: devotee.phone, level: devotee.level, gems: devotee.gems },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /me (Get current user from token) ──────────────────────────────────

authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Token comes from cookie (admin) or Authorization header (devotee/mobile)
    const token = req.cookies?.savidhi_admin_token
      || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (decoded.type === 'ADMIN') {
      const result = await pool.query(
        'SELECT id, email, name, role, created_at FROM admin_users WHERE id = $1 AND is_active = true',
        [decoded.sub]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { ...result.rows[0], type: 'ADMIN' }, message: 'Current user' });
    } else {
      const result = await pool.query(
        'SELECT id, name, phone, gotra, image_url, level, gems, created_at FROM devotees WHERE id = $1 AND is_active = true',
        [decoded.sub]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { ...result.rows[0], type: 'DEVOTEE' }, message: 'Current user' });
    }
  } catch (err) {
    next(err);
  }
});

// ─── GET /verify (Gateway calls this to verify tokens) ──────────────────────

authRouter.get('/verify', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const cookieToken = req.cookies?.savidhi_admin_token;
  const tokenToVerify = token || cookieToken;

  if (!tokenToVerify) return res.status(401).json({ success: false, message: 'No token' });

  try {
    const decoded: any = jwt.verify(tokenToVerify, JWT_ACCESS_SECRET);
    // Devotees don't have a role in the JWT payload; fall back to the user type so
    // downstream services' requireAuth middleware (which checks both user-id AND role)
    // accepts devotees correctly.
    const userRole = decoded.role && decoded.role.length > 0 ? decoded.role : decoded.type;
    res.json({
      success: true,
      data: { userId: decoded.sub, userType: decoded.type, userRole },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});
