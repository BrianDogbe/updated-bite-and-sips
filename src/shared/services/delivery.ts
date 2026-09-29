// Distance-based delivery fee engine.
// Admin-configurable bands (stored in DB later; env/config now).
// Fees in GHS. Never hard-code these in UI — always call this service.

export interface FeeBand { minKm: number; maxKm: number; fee: number }

export const FEE_BANDS: FeeBand[] = [
  { minKm: 0, maxKm: 2, fee: 8 },
  { minKm: 2, maxKm: 5, fee: 14 },
  { minKm: 5, maxKm: 10, fee: 22 },
  { minKm: 10, maxKm: 999, fee: 35 },
];

export const SERVICE_FEE_RATE = 0.02; // 2%

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function deliveryFeeForKm(km: number, bands = FEE_BANDS): { km: number; fee: number; band: FeeBand } {
  const band = bands.find((b) => km >= b.minKm && km < b.maxKm) ?? bands[bands.length - 1];
  return { km, fee: band.fee, band };
}

export function serviceFee(subtotal: number): number {
  return +(subtotal * SERVICE_FEE_RATE).toFixed(2);
}
