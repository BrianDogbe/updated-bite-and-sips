// Maps / GPS abstraction.
// ── MOCK vs REAL ─────────────────────────────────────────────
// Today: MOCK coordinates + simulated rider movement (clearly labelled "Mock GPS").
// Later: swap `getCurrentPosition` with navigator.geolocation and
// `subscribeRider` with WebSocket feed; plug Google Maps/Mapbox/OpenStreetMap
// key via backend env: MAPS_API_KEY (never commit the key).
// ─────────────────────────────────────────────────────────────

export const MAPS_PROVIDER: 'MOCK' | 'GOOGLE' | 'MAPBOX' | 'OSM' = 'MOCK';
// TODO(credentials): set MAPS_API_KEY in backend/.env when enabling real maps.

export interface LatLng { lat: number; lng: number }

export async function getCurrentPositionMock(): Promise<LatLng & { mock: true }> {
  // Simulated customer location in Tema (mock, not real GPS)
  return { lat: 5.558 + Math.random() * 0.02, lng: -0.19 + Math.random() * 0.02, mock: true };
}

export function getCurrentPositionReal(): Promise<GeolocationPosition> {
  return new Promise((res, rej) => {
    if (!('geolocation' in navigator)) return rej(new Error('Geolocation unavailable'));
    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true });
  });
}

// Linear interpolation for mock rider animation
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function routePoints(from: LatLng, to: LatLng, steps = 24): LatLng[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    lat: lerp(from.lat, to.lat, i / steps),
    lng: lerp(from.lng, to.lng, i / steps),
  }));
}

// Convert lat/lng to % positions for our SVG mock map
export function toXY(p: LatLng, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - (p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  return { x, y };
}
