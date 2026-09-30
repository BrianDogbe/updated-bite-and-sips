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
