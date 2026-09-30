import { Router } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { db, toMenuItem, logAudit } from '../db.js';
import { requireAuth, ADMIN_ONLY } from '../auth.js';
import type { AuthedRequest } from '../auth.js';

const r = Router();

r.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM menu_items ORDER BY name').all() as Record<string, unknown>[];
  res.json(rows.map(toMenuItem));
});

r.post('/', requireAuth([...ADMIN_ONLY, 'MANAGER']), (req: AuthedRequest, res) => {
  const b = req.body as Record<string, unknown>;
  const id = String(b.id ?? `m_${Date.now().toString(36)}`);
  db.prepare(
    'INSERT INTO menu_items (id, name, description, price, category_id, image, available, popular, ingredients, allergens, modifiers, prep_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, String(b.name), String(b.description ?? ''), Number(b.price ?? 0), String(b.categoryId ?? b.category_id ?? 'popular'),
    String(b.image ?? ''), b.available === false ? 0 : 1, b.popular ? 1 : 0,
    JSON.stringify(b.ingredients ?? []), JSON.stringify(b.allergens ?? []),
    JSON.stringify(b.modifiers ?? []), Number(b.prepMinutes ?? b.prep_minutes ?? 15));
  logAudit(req.user?.name ?? 'admin', `Added menu item ${b.name}`, 'menu');
  res.status(201).json({ id });
});

r.patch('/:id', requireAuth([...ADMIN_ONLY, 'MANAGER']), (req: AuthedRequest, res) => {
  const cur = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!cur) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const MAP: Record<string, string> = {
    name: 'name', description: 'description', price: 'price', categoryId: 'category_id',
    image: 'image', prepMinutes: 'prep_minutes',
  };
  const sets: string[] = [];
  const vals: SQLInputValue[] = [];
  for (const [k, col] of Object.entries(MAP)) {
    if (b[k] !== undefined) {
      sets.push(`${col} = ?`);
      const v = b[k];
      vals.push(typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint' || v === null || Buffer.isBuffer(v) ? v : String(v));
    }
  }
  if (b.available !== undefined) {
    sets.push('available = ?');
    vals.push(b.available ? 1 : 0);
  }
  if (b.popular !== undefined) {
    sets.push('popular = ?');
    vals.push(b.popular ? 1 : 0);
  }
  if (b.ingredients !== undefined) {
    sets.push('ingredients = ?');
    vals.push(JSON.stringify(b.ingredients));
  }
  if (b.allergens !== undefined) {
    sets.push('allergens = ?');
    vals.push(JSON.stringify(b.allergens));
  }
  if (b.modifiers !== undefined) {
    sets.push('modifiers = ?');
    vals.push(JSON.stringify(b.modifiers));
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`).run(...vals, req.params.id);
    logAudit(req.user?.name ?? 'admin', `Updated menu item ${req.params.id}`, 'menu');
  }
  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  res.json(toMenuItem(updated));
});

export default r;
