import { useEffect, useMemo, useState } from 'react';
import { fetchRoadRoute, routePoints, toXY, type LatLng as MapLatLng, type RoadRoute } from '../../shared/services/maps';

interface LatLng {
  lat: number;
  lng: number;
}

interface MockMapProps {
  restaurant: LatLng;
  customer?: LatLng | null;
  rider?: LatLng | null;
  showRoute?: boolean;
}

export default function MockMap({ restaurant, customer, rider, showRoute = true }: MockMapProps) {
  const bounds = useMemo(() => {
    const pts = [restaurant, customer, rider].filter((p): p is LatLng => !!p);
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = Math.max((maxLat - minLat) * 0.35, 0.004);
    const padLng = Math.max((maxLng - minLng) * 0.35, 0.004);
    return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
  }, [restaurant, customer, rider]);

  const r = toXY(restaurant, bounds);
  const c = customer ? toXY(customer, bounds) : null;
  const d = rider ? toXY(rider, bounds) : null;

  const route = useMemo(() => {
    if (!showRoute || !customer) return '';
    const pts = routePoints(restaurant, customer, 24).map((p) => {
      const { x, y } = toXY(p, bounds);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoute, customer?.lat, customer?.lng, restaurant.lat, restaurant.lng, bounds]);

  // Real road route (OSRM). Falls back to the straight dashed line when offline.
  const [road, setRoad] = useState<RoadRoute | null>(null);
  useEffect(() => {
    if (!showRoute || !customer) {
      setRoad(null);
      return;
    }
    let live = true;
    const from: MapLatLng = { lat: restaurant.lat, lng: restaurant.lng };
    const to: MapLatLng = { lat: customer.lat, lng: customer.lng };
    fetchRoadRoute(from, to).then((r) => {
      if (live) setRoad(r);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoute, customer?.lat, customer?.lng, restaurant.lat, restaurant.lng]);

  const roadLine = useMemo(() => {
    if (!road) return '';
    return road.coords
      .map((p) => {
        const { x, y } = toXY(p, bounds);
        return `${x.toFixed(2)},${(y / 100) * 62}`;
      })
      .join(' ');
  }, [road, bounds]);

  return (
    <figure className="overflow-hidden rounded-2xl border border-coal/10 bg-white shadow-card">
      <svg viewBox="0 0 100 62" className="block h-64 w-full" role="img" aria-label="Mock delivery map">
        <defs>
          <pattern id="mockmap-grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#141210" strokeOpacity="0.08" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="62" fill="#FFF9F1" />
        <rect x="0" y="0" width="100" height="62" fill="url(#mockmap-grid)" />
        {/* decorative roads */}
        <line x1="0" y1="20" x2="100" y2="24" stroke="#141210" strokeOpacity="0.12" strokeWidth="1.6" />
        <line x1="30" y1="0" x2="34" y2="62" stroke="#141210" strokeOpacity="0.12" strokeWidth="1.6" />
        <line x1="0" y1="44" x2="100" y2="40" stroke="#141210" strokeOpacity="0.1" strokeWidth="1.2" />
        <line x1="64" y1="0" x2="60" y2="62" stroke="#141210" strokeOpacity="0.1" strokeWidth="1.2" />

        {roadLine ? (
          <polyline points={roadLine} fill="none" stroke="#EA580C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          route && <polyline points={route} fill="none" stroke="#EA580C" strokeWidth="1.1" strokeDasharray="2.5 1.5" strokeLinecap="round" />
        )}

        {/* restaurant marker */}
        <g transform={`translate(${r.x},${(r.y / 100) * 62})`}>
          <circle r="5.2" fill="#EA580C" opacity="0.2" />
          <circle r="2.6" fill="#EA580C" stroke="#fff" strokeWidth="0.7" />
          <text y="-4.5" textAnchor="middle" fontSize="3.4" fontWeight="800" fill="#141210">
            R · Kitchen
          </text>
        </g>
        {c && (
          <g transform={`translate(${c.x},${(c.y / 100) * 62})`}>
            <circle r="5.2" fill="#1E7A4C" opacity="0.18" />
            <circle r="2.6" fill="#1E7A4C" stroke="#fff" strokeWidth="0.7" />
            <text y="-4.5" textAnchor="middle" fontSize="3.4" fontWeight="800" fill="#141210">
              C · You
            </text>
          </g>
        )}
        {d && (
          <g transform={`translate(${d.x},${(d.y / 100) * 62})`}>
            <circle r="4.4" fill="#C9A227" opacity="0.35">
              <animate attributeName="r" values="3.4;5.2;3.4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="2.2" fill="#141210" stroke="#fff" strokeWidth="0.7" />
            <text y="6.4" textAnchor="middle" fontSize="3" fontWeight="800" fill="#141210">
              rider
            </text>
          </g>
        )}
      </svg>
      <figcaption className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-coal/50">
        <span>{road ? `${road.distanceKm.toFixed(1)} km · ~${Math.max(1, Math.round(road.durationMin))} min by road` : 'Mock GPS — not real tracking'}</span>
        <span>Tema C7</span>
      </figcaption>
    </figure>
  );
}
