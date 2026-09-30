import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, logAudit } from '../db.js';
import { requireAuth, STAFF } from '../auth.js';
import type { AuthedRequest } from '../auth.js';

const r = Router();

// POST /api/messages — public (contact form)
r.post('/', (req, res) => {
  const { name, email, body } = req.body as { name?: string; email?: string; body?: string };
  if (!name?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'name and body required' });
    return;
  }
  const id = `msg_${randomUUID().slice(0, 8)}`;
  const at = new Date().toISOString();
  db.prepare('INSERT INTO messages (id, name, email, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
    id, name.trim(), (email ?? '').trim(), body.trim(), at,
  );
  res.status(201).json({ id, name, email, body, read: false, at });
});

// GET /api/messages — staff
r.get('/', requireAuth(STAFF), (_req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200').all() as Record<string, unknown>[];
  res.json(rows.map((m) => ({
    id: m.id, name: m.name, email: m.email, body: m.body,
    read: (m.read as number) === 1, at: m.created_at,
  })));
});

r.patch('/:id/read', requireAuth(STAFF), (req, res) => {
  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

r.delete('/:id', requireAuth(STAFF), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  logAudit(req.user?.name ?? 'admin', `Deleted message ${req.params.id}`, 'messages');
  res.json({ ok: true });
});

export default r;
