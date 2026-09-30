// Riders, inventory, promos, audit — staff endpoints.
import { Router } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { db, logAudit } from '../db.js';
import { requireAuth, STAFF, ADMIN_ONLY } from '../auth.js';
import type { AuthedRequest } from '../auth.js';
import { emit } from '../realtime.js';

const r = Router();

function toRider(u: Record<string, unknown>): Record<string, unknown> {
  return {
    id: u.id, name: u.name, phone: u.phone, role: u.role, active: (u.active as number) === 1,
    vehicle: u.vehicle, plate: u.plate, online: (u.online as number) === 1, busy: (u.busy as number) === 1,
    lat: u.lat, lng: u.lng, rating: u.rating,
    earningsToday: 0, deliveriesToday: 0,
  };
}

r.get('/riders', requireAuth(STAFF), (_req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role = 'RIDER' ORDER BY name").all() as Record<string, unknown>[];
  res.json(rows.map(toRider));
});

r.patch('/riders/:id', requireAuth([...STAFF, 'DELIVERY_MANAGER']), (req: AuthedRequest, res) => {
  const { online, busy, lat, lng } = req.body as { online?: boolean; busy?: boolean; lat?: number; lng?: number };
  const sets: string[] = [];
  const vals: SQLInputValue[] = [];
  if (online !== undefined) {
    sets.push('online = ?');
    vals.push(online ? 1 : 0);
  }
  if (busy !== undefined) {
    sets.push('busy = ?');
    vals.push(busy ? 1 : 0);
  }
  if (lat !== undefined && lng !== undefined) {
    sets.push('lat = ?', 'lng = ?');
    vals.push(lat, lng);
  }
  if (sets.length > 0) db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, req.params.id);
  res.json({ ok: true });
});

// Rider GPS ping -> live tracking event for the customer's map
r.post('/rider/location', requireAuth([...STAFF, 'RIDER']), (req, res) => {
  const { riderId, orderId, lat, lng } = req.body as { riderId?: string; orderId?: string; lat?: number; lng?: number };
  if (!riderId || lat === undefined || lng === undefined) {
    res.status(400).json({ error: 'riderId, lat, lng required' });
    return;
  }
  db.prepare('UPDATE users SET lat = ?, lng = ? WHERE id = ?').run(lat, lng, riderId);
  emit('RIDER_LOCATION', { riderId, orderId: orderId ?? '', lat, lng });
  res.json({ ok: true });
});

r.get('/inventory', requireAuth(STAFF), (_req, res) => {
  const rows = db.prepare('SELECT * FROM inventory ORDER BY name').all() as Record<string, unknown>[];
  res.json(rows.map((i) => ({
    id: i.id, name: i.name, qty: i.qty, unit: i.unit, minQty: i.min_qty, supplier: i.supplier, unitCost: i.unit_cost,
  })));
});

r.patch('/inventory/:id', requireAuth([...ADMIN_ONLY, 'MANAGER']), (req: AuthedRequest, res) => {
  const { delta } = req.body as { delta?: number };
  const row = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id) as { qty: number; name: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const qty = Math.max(0, row.qty + (Number(delta) || 0));
  db.prepare('UPDATE inventory SET qty = ? WHERE id = ?').run(qty, req.params.id);
  logAudit(req.user?.name ?? 'admin', `Adjusted stock ${row.name}`, 'inventory', String(row.qty), String(qty));
  res.json({ id: req.params.id, qty });
});

r.get('/promos', (_req, res) => {
  const rows = db.prepare('SELECT * FROM promos WHERE active = 1').all() as Record<string, unknown>[];
  res.json(rows.map((p) => ({ id: p.code, code: p.code, type: p.type, value: p.value, active: true })));
});

r.get('/audit', requireAuth(STAFF), (_req, res) => {
  const rows = db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all() as Record<string, unknown>[];
  res.json(rows.map((a) => ({
    id: String(a.id), user: a.user, action: a.action, resource: a.resource,
    prev: a.prev ?? undefined, next: a.next ?? undefined, at: a.created_at,
  })));
});

export default r;
