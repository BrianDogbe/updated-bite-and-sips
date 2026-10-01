// JWT auth. Roles gate every sensitive endpoint.
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '12h' });
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(roles: string[] = []) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }
    try {
      const payload = jwt.verify(token, SECRET) as AuthUser;
      if (roles.length > 0 && !roles.includes(payload.role)) {
        res.status(403).json({ error: 'Forbidden for role ' + payload.role });
        return;
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export const STAFF = ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN_MANAGER', 'KITCHEN_STAFF', 'DELIVERY_MANAGER', 'ACCOUNTANT'];
export const ADMIN_ONLY = ['OWNER', 'ADMIN'];

/** Tiny in-memory rate limiter (per IP + path). Guards login + order/payment spam. */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(max: number, windowMs: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const ip = (_req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || _req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${_req.path}`;
    const nowMs = Date.now();
    const b = buckets.get(key);
    if (!b || nowMs > b.reset) {
      buckets.set(key, { count: 1, reset: nowMs + windowMs });
      next();
      return;
    }
    b.count += 1;
    if (b.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((b.reset - nowMs) / 1000))));
      res.status(429).json({ error: 'Too many attempts — try again later' });
      return;
    }
    next();
  };
}

/** Phone numbers match when their last 9 digits match (tolerates +233 / spaces). */
export function samePhone(a: string, b: string): boolean {
  const x = (a || '').replace(/\D/g, '');
  const y = (b || '').replace(/\D/g, '');
  if (x.length < 7 || y.length < 7) return false;
  return x.slice(-9) === y.slice(-9);
}

/** Optional auth: returns the user for a valid staff/rider token, else null. */
export function optionalUser(req: Request): AuthUser | null {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET) as AuthUser;
  } catch {
    return null;
  }
}
