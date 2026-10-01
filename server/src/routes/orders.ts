import { Router } from 'express';
import { randomInt } from 'node:crypto';
import type { SQLInputValue } from 'node:sqlite';
import { db, toOrder, nextOrderId, logAudit } from '../db.js';
import { requireAuth, optionalUser, samePhone, rateLimit, STAFF } from '../auth.js';
import type { AuthedRequest } from '../auth.js';
import { emit } from '../realtime.js';

const r = Router();

// Server-side fee config (mirrors frontend services/delivery.ts — edit here to change pricing)
const FEE_BANDS = [
  { minKm: 0, maxKm: 2, fee: 8 },
  { minKm: 2, maxKm: 5, fee: 14 },
  { minKm: 5, maxKm: 10, fee: 22 },
  { minKm: 10, maxKm: 999, fee: 35 },
];
const SERVICE_RATE = 0.02;

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['RIDER_ASSIGNED', 'PICKED_UP', 'CANCELLED'],
  RIDER_ASSIGNED: ['ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'CANCELLED'],
  ARRIVED_AT_RESTAURANT: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['ARRIVED_AT_CUSTOMER', 'DELIVERED'],
  ARRIVED_AT_CUSTOMER: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

function feeForKm(km: number): number {
  return (FEE_BANDS.find((b) => km >= b.minKm && km < b.maxKm) ?? FEE_BANDS[FEE_BANDS.length - 1]).fee;
}

// POST /api/orders — public (guest checkout), rate-limited. Server recomputes all money.
r.post('/', rateLimit(60, 60_000), (req, res) => {
  const b = req.body as {
    customerName?: string; customerPhone?: string; customerId?: string;
    items?: Array<{ itemId: string; qty: number; modifiers?: Array<{ id: string; name: string; price: number }>; instructions?: string }>;
    orderType?: 'PICKUP' | 'DELIVERY'; paymentMethod?: string; paymentStatus?: string;
    deliveryAddress?: Record<string, unknown>; pickupTime?: string; pickupMode?: string;
    distanceKm?: number; promoCode?: string;
  };
  if (!b.items?.length || (b.orderType !== 'PICKUP' && b.orderType !== 'DELIVERY')) {
    res.status(400).json({ error: 'items and orderType required' });
    return;
  }
  const getItem = db.prepare('SELECT * FROM menu_items WHERE id = ?');
  let subtotal = 0;
  const items = [];
  for (const it of b.items) {
    const m = getItem.get(it.itemId) as { id: string; name: string; price: number; available: number } | undefined;
    if (!m || !m.available) {
      res.status(400).json({ error: `Item ${it.itemId} unavailable` });
      return;
    }
    const qty = Math.min(20, Math.max(1, Number(it.qty) || 1));
    const mods = Array.isArray(it.modifiers) ? it.modifiers : [];
    const unit = m.price + mods.reduce((s, x) => s + (Number(x.price) || 0), 0);
    subtotal += unit * qty;
    items.push({ itemId: m.id, name: m.name, qty, unitPrice: +unit.toFixed(2), modifiers: mods, instructions: it.instructions });
  }
  subtotal = +subtotal.toFixed(2);
  let deliveryFee = 0;
  if (b.orderType === 'DELIVERY') {
    if (!b.deliveryAddress) {
      res.status(400).json({ error: 'deliveryAddress required' });
      return;
    }
    deliveryFee = feeForKm(Math.max(0.6, Number(b.distanceKm) || 3));
  }
  const serviceFee = +(subtotal * SERVICE_RATE).toFixed(2);
  let discount = 0;
  if (b.promoCode) {
    const p = db.prepare('SELECT * FROM promos WHERE upper(code) = upper(?) AND active = 1').get(b.promoCode) as
      { type: string; value: number } | undefined;
    if (p?.type === 'PERCENT') discount = +(subtotal * (p.value / 100)).toFixed(2);
    else if (p?.type === 'FIXED') discount = Math.min(p.value, subtotal);
    else if (p?.type === 'FREE_DELIVERY') deliveryFee = 0;
  }
  const total = Math.max(0, +(subtotal + deliveryFee + serviceFee - discount).toFixed(2));
  const id = nextOrderId();
  const at = new Date().toISOString();
  const code = String(randomInt(1000, 10000));
  const timeline = JSON.stringify([{ status: 'PENDING', at }]);
  db.prepare(
    `INSERT INTO orders (id, customer_id, customer_name, customer_phone, items, order_type, status,
     payment_status, payment_method, subtotal, delivery_fee, service_fee, discount, total,
     pickup_time, pickup_mode, delivery_address, delivery_code, timeline, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, b.customerId ?? 'guest', b.customerName ?? 'Guest', b.customerPhone ?? '',
    JSON.stringify(items), b.orderType, b.paymentStatus ?? 'PENDING', b.paymentMethod ?? 'CASH_ON_DELIVERY',
    subtotal, deliveryFee, serviceFee, discount, total,
    b.pickupTime ?? null, b.pickupMode ?? null,
    b.deliveryAddress ? JSON.stringify(b.deliveryAddress) : null, code, timeline, at, at);
  const order = toOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown>);
  emit('ORDER_CREATED', { order });
  emit('NOTIFY', { notification: { id: `n${Date.now()}`, title: 'Order received', body: `Order ${id} placed.`, at, read: false, orderId: id } });
  res.status(201).json(order);
});

// GET /api/orders — staff only (use ?customerId= for customer scope)
r.get('/', requireAuth([...STAFF, 'RIDER']), (req: AuthedRequest, res) => {
  const { customerId, status } = req.query as { customerId?: string; status?: string };
  let sql = 'SELECT * FROM orders';
  const conds: string[] = [];
  const vals: SQLInputValue[] = [];
  if (customerId) {
    conds.push('customer_id = ?');
    vals.push(customerId);
  }
  if (status) {
    conds.push('status = ?');
    vals.push(status);
  }
  if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
  if (req.user?.role === 'RIDER') {
    sql += (conds.length > 0 ? ' AND ' : ' WHERE ') + "(rider_id = ? OR (rider_id IS NULL AND status = 'READY_FOR_PICKUP'))";
    vals.push(req.user.id);
  }
  sql += ' ORDER BY created_at DESC LIMIT 300';
  const rows = db.prepare(sql).all(...vals) as Record<string, unknown>[];
  res.json(rows.map(toOrder));
});

// GET /api/orders/:id — staff/rider token, or the order's phone number.
// Tracking links are safe to share: without the phone, no customer data leaks.
r.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const me = optionalUser(req);
  const staffOrRider = me && (STAFF.includes(me.role) || me.role === 'RIDER');
  if (!staffOrRider) {
    const phone = String(req.query.phone ?? '');
    const customerPhone = String((row as { customer_phone?: string }).customer_phone ?? '');
    if (!samePhone(customerPhone, phone)) {
      res.status(403).json({ error: 'Enter the phone number used for this order' });
      return;
    }
  }
  res.json(toOrder(row));
});

// PATCH /api/orders/:id/status — staff, transition-validated
r.patch('/:id/status', requireAuth(STAFF), (req: AuthedRequest, res) => {
  const { status, by } = req.body as { status?: string; by?: string };
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const cur = row.status as string;
  if (!status || !(TRANSITIONS[cur] ?? []).includes(status)) {
    res.status(400).json({ error: `Illegal transition ${cur} -> ${status}` });
    return;
  }
  const at = new Date().toISOString();
  const timeline = [...JSON.parse((row.timeline as string) || '[]'), { status, at, by: by ?? req.user?.name }];
  db.prepare('UPDATE orders SET status = ?, timeline = ?, updated_at = ? WHERE id = ?').run(status, JSON.stringify(timeline), at, req.params.id);
  logAudit(by ?? req.user?.name ?? 'staff', `Marked ${req.params.id} as ${status}`, 'orders', cur, status);
  emit('ORDER_STATUS', { orderId: req.params.id, status });
  res.json({ id: req.params.id, status });
});

// PATCH /api/orders/:id/assign — assign / reassign rider
r.patch('/:id/assign', requireAuth([...STAFF, 'DELIVERY_MANAGER']), (req: AuthedRequest, res) => {
  const { riderId } = req.body as { riderId?: string };
  const rider = riderId ? (db.prepare("SELECT * FROM users WHERE id = ? AND role = 'RIDER'").get(riderId) as Record<string, unknown> | undefined) : null;
  if (riderId && !rider) {
    res.status(400).json({ error: 'Unknown rider' });
    return;
  }
  db.prepare('UPDATE orders SET rider_id = ?, updated_at = ? WHERE id = ?').run(riderId ?? null, new Date().toISOString(), req.params.id);
  const at = new Date().toISOString();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  // Rider declined / released: back to READY so the kitchen can hand it over again.
  if (!riderId && (row.status as string) === 'RIDER_ASSIGNED') {
    const timeline = [...JSON.parse((row.timeline as string) || '[]'), { status: 'READY_FOR_PICKUP', at }];
    db.prepare("UPDATE orders SET status = 'READY_FOR_PICKUP', timeline = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(timeline), at, req.params.id);
    emit('ORDER_STATUS', { orderId: req.params.id, status: 'READY_FOR_PICKUP' });
  }
  if (riderId) {
    db.prepare('UPDATE users SET busy = 1 WHERE id = ?').run(riderId);
    emit('RIDER_ASSIGNED', { orderId: req.params.id, riderId });
    if ((row.status as string) === 'READY_FOR_PICKUP') {
      const timeline = [...JSON.parse((row.timeline as string) || '[]'), { status: 'RIDER_ASSIGNED', at }];
      db.prepare("UPDATE orders SET status = 'RIDER_ASSIGNED', timeline = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(timeline), at, req.params.id);
      emit('ORDER_STATUS', { orderId: req.params.id, status: 'RIDER_ASSIGNED' });
    }
  }
  res.json({ id: req.params.id, riderId: riderId ?? null });
});

// DELETE /api/orders/:id — kitchen clearing finished/cancelled tickets.
// Only terminal orders may be deleted; live orders must be cancelled first.
r.delete('/:id', requireAuth(STAFF), (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as
    { status: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!['CANCELLED', 'DELIVERED'].includes(row.status)) {
    res.status(400).json({ error: 'Only cancelled or delivered orders can be removed' });
    return;
  }
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  logAudit(req.user?.name ?? 'staff', `Removed order ${req.params.id} from board`, 'orders', row.status, 'DELETED');
  emit('ORDER_DELETED', { orderId: req.params.id });
  res.json({ ok: true });
});

export default r;
