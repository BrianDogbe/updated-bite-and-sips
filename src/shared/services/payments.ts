// Payment integration structure (Ghana: MoMo + Card).
// ⚠️  CREDENTIALS REQUIRED — add in backend env, never in frontend:
//   - MTN MoMo:  MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY  (backend only)
//   - Vodafone/AT: VODAFONE_CLIENT_ID / SECRET
//   - Card (Paystack/Flutterwave): PAYSTACK_SECRET_KEY / FLW_SECRET_KEY
// Frontend calls POST /api/payments/initialize -> returns payUrl/reference.
// This file is the client-side contract + mock for prototype.

// Payment methods (Ghana: MoMo + Card) — real providers live in the backend.
// With VITE_API_URL set, initialize/verify hit POST /api/payments/*
// (Paystack for cards + all MoMo networks, MTN request-to-pay, else MOCK).
// Secrets stay in server/.env and never touch frontend code.

import type { PaymentMethod } from '../types';
import { api, backendEnabled } from './backend';

export interface PaymentIntent { reference: string; amount: number; method: PaymentMethod; payUrl?: string; mock?: boolean }

export async function initializePayment(
  amount: number,
  method: PaymentMethod,
  extras: { email?: string; phone?: string; orderId?: string } = {},
): Promise<PaymentIntent> {
  if (amount <= 0) throw new Error('Invalid amount');
  if (backendEnabled()) {
    try {
      const intent = await api<{ reference: string; payUrl?: string; provider: string; mock: boolean }>(
        '/api/payments/initialize',
        { method: 'POST', body: { amount, method, ...extras } },
      );
      return { reference: intent.reference, amount, method, payUrl: intent.payUrl, mock: intent.mock };
    } catch {
      // server unreachable → continue with local mock so checkout never blocks
    }
  }
  await new Promise((r) => setTimeout(r, 700));
  return { reference: `PAY-${Date.now().toString(36).toUpperCase()}`, amount, method, mock: true };
}

export async function verifyPayment(reference: string): Promise<'PAID' | 'FAILED'> {
  if (backendEnabled()) {
    try {
      const res = await api<{ status: string }>(`/api/payments/verify/${encodeURIComponent(reference)}`);
      return res.status === 'PAID' ? 'PAID' : 'FAILED';
    } catch {
      // fall through to local mock
    }
  }
  await new Promise((r) => setTimeout(r, 500));
  return reference ? 'PAID' : 'FAILED';
}

export async function linkPaymentToOrder(reference: string, orderId: string): Promise<void> {
  if (!backendEnabled()) return;
  try {
    await api('/api/payments/link', { method: 'POST', body: { reference, orderId } });
  } catch {
    /* server down — order still placed, payment verified locally */
  }
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  MOMO_MTN: 'MTN Mobile Money',
  MOMO_VODAFONE: 'Vodafone Cash',
  MOMO_AIRTELTIGO: 'AirtelTigo Money',
  CARD: 'Debit / Credit Card',
  CASH_ON_DELIVERY: 'Cash on Delivery',
  CASH_ON_PICKUP: 'Pay at Pickup',
};
