import { Router } from 'express';
import { db } from '../db.js';
import { signToken, verifyPassword } from '../auth.js';

const r = Router();

// POST /api/auth/login { email, password } -> { token, user }
r.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const row = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?) AND active = 1').get(email) as
    { id: string; name: string; email: string; phone: string; password_hash: string; role: string } | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  res.json({ token: signToken(user), user: { ...user, phone: row.phone } });
});

export default r;
