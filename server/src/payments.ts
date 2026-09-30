// ── Payments: Paystack (cards + MoMo) + MTN MoMo, with MOCK fallback ──
// Add keys in server/.env (never in frontend code):
//   PAYSTACK_SECRET_KEY / MOMO_SUBSCRIPTION_KEY / MOMO_API_USER / MOMO_API_KEY
// With no keys set, everything runs in MOCK mode — no real money moves.
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

export type PayMethod = 'MOMO_MTN' | 'MOMO_VODAFONE' | 'MOMO_AIRTELTIGO' | 'CARD' | 'CASH_ON_DELIVERY' | 'CASH_ON_PICKUP';

export interface PayIntent {
  reference: string;
  amount: number;
  method: PayMethod;
  provider: 'paystack' | 'mtn' | 'mock';
  payUrl?: string;
  mock: boolean;
}

const PS_KEY = process.env.PAYSTACK_SECRET_KEY ?? '';
const MOMO_SUB = process.env.MOMO_SUBSCRIPTION_KEY ?? '';
const MOMO_USER = process.env.MOMO_API_USER ?? '';
const MOMO_KEY = process.env.MOMO_API_KEY ?? '';
const MOMO_ENV = process.env.MOMO_ENV ?? 'sandbox';

async function paystackInit(amountGhs: number, email: string, reference: string): Promise<string | undefined> {
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PS_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: Math.round(amountGhs * 100), reference, currency: 'GHS' }),
  });
  const data = (await res.json()) as { status: boolean; data?: { authorization_url: string } };
  return data.status ? data.data?.authorization_url : undefined;
}

async function mtnToken(): Promise<string | null> {
  const basic = Buffer.from(`${MOMO_USER}:${MOMO_KEY}`).toString('base64');
  const res = await fetch(
    `https://${MOMO_ENV}.momodeveloper.mtn.com/collection/token/`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Ocp-Apim-Subscription-Key': MOMO_SUB } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function mtnRequestToPay(amountGhs: number, phone: string, reference: string, token: string): Promise<boolean> {
  const res = await fetch(`https://${MOMO_ENV}.momodeveloper.mtn.com/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': reference,
      'X-Target-Environment': MOMO_ENV,
      'Ocp-Apim-Subscription-Key': MOMO_SUB,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(Math.round(amountGhs)),
      currency: 'GHS',
      externalId: reference,
      payer: { partyIdType: 'MSISDN', partyId: phone.replace(/\D/g, '') },
      payerMessage: 'Bite & Sips order',
      payeeNote: 'Bite & Sips order',
    }),
  });
  return res.status === 202;
}

export async function initializePayment(opts: {
  amount: number; method: PayMethod; email?: string; phone?: string; orderId?: string;
}): Promise<PayIntent> {
  const { amount, method } = opts;
  if (!(amount > 0)) throw new Error('Invalid amount');
  if (method === 'CASH_ON_DELIVERY' || method === 'CASH_ON_PICKUP') {
    const reference = `CASH-${Date.now().toString(36).toUpperCase()}`;
    db.prepare("INSERT INTO payments (reference, amount, method, status, order_id, provider, created_at) VALUES (?, ?, ?, 'PENDING', ?, 'mock', ?)").run(
      reference, amount, method, opts.orderId ?? null, new Date().toISOString(),
    );
    return { reference, amount, method, provider: 'mock', mock: true };
  }

  // Real providers first (Paystack covers cards + all MoMo networks)
  if (PS_KEY) {
    const reference = `PS-${randomUUID().slice(0, 12).toUpperCase()}`;
    const payUrl = await paystackInit(amount, opts.email ?? 'customer@biteandsips.com.gh', reference);
    if (payUrl) {
      db.prepare("INSERT INTO payments (reference, amount, method, status, order_id, provider, created_at) VALUES (?, ?, ?, 'PENDING', ?, 'paystack', ?)").run(
        reference, amount, method, opts.orderId ?? null, new Date().toISOString(),
      );
      return { reference, amount, method, provider: 'paystack', payUrl, mock: false };
    }
    // fall through to mock if Paystack errors
  }
  if (method.startsWith('MOMO_') && MOMO_SUB && MOMO_USER && MOMO_KEY && opts.phone) {
    const reference = randomUUID();
    const token = await mtnToken();
    if (token && (await mtnRequestToPay(amount, opts.phone, reference, token))) {
      db.prepare("INSERT INTO payments (reference, amount, method, status, order_id, provider, created_at) VALUES (?, ?, ?, 'PENDING', ?, 'mtn', ?)").run(
        reference, amount, method, opts.orderId ?? null, new Date().toISOString(),
      );
      return { reference, amount, method, provider: 'mtn', mock: false };
    }
  }

  const reference = `PAY-${Date.now().toString(36).toUpperCase()}`;
  db.prepare("INSERT INTO payments (reference, amount, method, status, order_id, provider, created_at) VALUES (?, ?, ?, 'PENDING', ?, 'mock', ?)").run(
    reference, amount, method, opts.orderId ?? null, new Date().toISOString(),
  );
  return { reference, amount, method, provider: 'mock', mock: true };
}

export async function verifyPayment(reference: string): Promise<'PAID' | 'FAILED' | 'PENDING'> {
  const row = db.prepare('SELECT * FROM payments WHERE reference = ?').get(reference) as
    { reference: string; provider: string; status: string } | undefined;
  if (!row) return 'FAILED';

  let status: 'PAID' | 'FAILED' | 'PENDING' = 'PENDING';
  if (row.provider === 'paystack' && PS_KEY) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PS_KEY}` },
    });
    const data = (await res.json()) as { status: boolean; data?: { status: string } };
    status = data.status && data.data?.status === 'success' ? 'PAID' : data.data?.status === 'failed' ? 'FAILED' : 'PENDING';
  } else if (row.provider === 'mtn' && MOMO_SUB && MOMO_USER && MOMO_KEY) {
    const token = await mtnToken();
    if (token) {
      const res = await fetch(
        `https://${MOMO_ENV}.momodeveloper.mtn.com/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Target-Environment': MOMO_ENV, 'Ocp-Apim-Subscription-Key': MOMO_SUB } },
      );
      if (res.ok) {
        const data = (await res.json()) as { status: string };
        status = data.status === 'SUCCESSFUL' ? 'PAID' : data.status === 'FAILED' ? 'FAILED' : 'PENDING';
      }
    }
  } else {
    status = 'PAID'; // mock: verification succeeds
  }
  db.prepare('UPDATE payments SET status = ? WHERE reference = ?').run(status, reference);
  return status;
}
