// Payment integration structure (Ghana: MoMo + Card).
// ⚠️  CREDENTIALS REQUIRED — add in backend env, never in frontend:
//   - MTN MoMo:  MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY  (backend only)
//   - Vodafone/AT: VODAFONE_CLIENT_ID / SECRET
//   - Card (Paystack/Flutterwave): PAYSTACK_SECRET_KEY / FLW_SECRET_KEY
// Frontend calls POST /api/payments/initialize -> returns payUrl/reference.
// This file is the client-side contract + mock for prototype.

import type { PaymentMethod } from '../types';

export interface PaymentIntent { reference: string; amount: number; method: PaymentMethod; payUrl?: string }

export async function initializePayment(amount: number, method: PaymentMethod): Promise<PaymentIntent> {
  // TODO(backend): replace mock with fetch('/api/payments/initialize', ...)
  await new Promise((r) => setTimeout(r, 700));
  if (amount <= 0) throw new Error('Invalid amount');
  return { reference: `PAY-${Date.now().toString(36).toUpperCase()}`, amount, method };
}

export async function verifyPayment(reference: string): Promise<'PAID' | 'FAILED'> {
  await new Promise((r) => setTimeout(r, 500));
  return reference ? 'PAID' : 'FAILED';
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  MOMO_MTN: 'MTN Mobile Money',
  MOMO_VODAFONE: 'Vodafone Cash',
  MOMO_AIRTELTIGO: 'AirtelTigo Money',
  CARD: 'Debit / Credit Card',
  CASH_ON_DELIVERY: 'Cash on Delivery',
  CASH_ON_PICKUP: 'Pay at Pickup',
};
