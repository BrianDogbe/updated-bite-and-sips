import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, STAFF } from '../auth.js';
import type { AuthedRequest } from '../auth.js';
import { initializePayment, verifyPayment } from '../payments.js';
import type { PayMethod } from '../payments.js';

const r = Router();

// POST /api/payments/initialize { amount, method, email?, phone?, orderId? }
r.post('/initialize', async (req, res) => {
  try {
    const { amount, method, email, phone, orderId } = req.body as {
      amount?: number; method?: PayMethod; email?: string; phone?: string; orderId?: string;
    };
    if (!amount || !method) {
      res.status(400).json({ error: 'amount and method required' });
      return;
    }
    const intent = await initializePayment({ amount: Number(amount), method, email, phone, orderId });
    res.json(intent);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment init failed' });
  }
});

// GET /api/payments/verify/:reference -> { status } (+ marks linked order PAID)
r.get('/verify/:reference', async (req, res) => {
  const status = await verifyPayment(req.params.reference);
  const pay = db.prepare('SELECT * FROM payments WHERE reference = ?').get(req.params.reference) as
    { order_id: string | null } | undefined;
  if (status === 'PAID' && pay?.order_id) {
    db.prepare("UPDATE orders SET payment_status = 'PAID', updated_at = ? WHERE id = ?").run(new Date().toISOString(), pay.order_id);
  }
  res.json({ reference: req.params.reference, status });
});

export function paymentRouter(): Router {
  return r;
}

// Link an order to a payment reference (called right after order creation)
r.post('/link', (req, res) => {
  const { reference, orderId } = req.body as { reference?: string; orderId?: string };
  if (!reference || !orderId) {
    res.status(400).json({ error: 'reference and orderId required' });
    return;
  }
  db.prepare('UPDATE payments SET order_id = ? WHERE reference = ?').run(orderId, reference);
  res.json({ ok: true });
});

export default r;
