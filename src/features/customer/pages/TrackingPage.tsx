import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bike, Check, KeyRound, Phone, ReceiptText, Star } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { RESTAURANT } from '../../../shared/data';
import { GHS, cn, eta, format12h, formatTime12h } from '../../../lib/utils';
import { haversineKm } from '../../../shared/services/delivery';
import { api, backendEnabled } from '../../../shared/services/backend';
import { publish } from '../../../shared/services/realtime';
import { Card, CardBody, Empty, Input, SectionTitle } from '../../../components/ui/primitives';
import { Button } from '../../../components/ui/button';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import MockMap from '../../../components/common/MockMap';
import type { Order, OrderStatus } from '../../../shared/types';

const DELIVERY_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const PICKUP_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERED'];

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  RIDER_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** Find-your-order page — always reachable from the navbar, even days later. */
export function TrackLookup() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [lastOrder] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bs_last_order');
    } catch {
      return null;
    }
  });
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const id = code.trim().toUpperCase();
    if (id) navigate(`/track/${id}`);
  };
  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Track order' }]} />
      <div className="mx-auto max-w-xl text-center">
        <SectionTitle kicker="Tracking" title="Where's my food?" sub="Enter the order number from your confirmation." />
        <Card className="mt-6 border-0"><CardBody className="p-6">
          <form onSubmit={go} className="flex gap-2">
            <label htmlFor="track-code" className="sr-only">Order number</label>
            <Input
              id="track-code" value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. BS1024" className="uppercase" autoComplete="off"
            />
            <Button type="submit">Track <ArrowRight /></Button>
          </form>
          {lastOrder && (
            <button
              onClick={() => navigate(`/track/${lastOrder}`)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline"
            >
              <ReceiptText size={15} /> Resume your last order ({lastOrder})
            </button>
          )}
        </CardBody></Card>
      </div>
    </main>
  );
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, riders, riderLocations } = useApp();
  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);

  // Order placed on another device? Pull it from the server once, then
  // live socket updates keep it fresh like any local order.
  useEffect(() => {
    if (order || !id || !backendEnabled()) return;
    api<Order>(`/api/orders/${encodeURIComponent(id)}`)
      .then((o) => publish({ type: 'ORDER_CREATED', order: o }))
      .catch(() => {});
  }, [order, id]);

  if (!order) {
    return (
      <main className="container py-24">
        <Empty title="Order not found" body={`No order with ID ${id ?? ''}.`} />
        <Link to="/menu" className="mt-4 inline-block text-sm font-bold text-brand-700">← Back to menu</Link>
      </main>
    );
  }

  const flow = order.orderType === 'PICKUP' ? PICKUP_FLOW : DELIVERY_FLOW;
  const seen = new Set(order.timeline.map((t) => t.status));
  let currentIdx = flow.indexOf(order.status);
  if (currentIdx === -1) {
    currentIdx = flow.reduce((best, s, i) => (seen.has(s) ? i : best), 0);
  }
  const rider = riders.find((r) => r.id === order.riderId);
  const liveRider = order.riderId ? riderLocations[order.riderId] : undefined;
  const riderPos = liveRider ?? (rider ? { lat: rider.lat, lng: rider.lng } : null);

  const etaMin = useMemo(() => {
    if (order.orderType !== 'DELIVERY' || !order.deliveryAddress) return null;
    const from = riderPos ?? { lat: RESTAURANT.lat, lng: RESTAURANT.lng };
    const km = haversineKm(from.lat, from.lng, order.deliveryAddress.lat, order.deliveryAddress.lng);
    return Math.max(3, (km / 25) * 60);
  }, [riderPos, order]);

  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: `Order ${order.id}` }]} />
      <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm font-bold text-coal/60 hover:text-coal">
        <ArrowLeft size={15} /> Back to menu
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <SectionTitle kicker={order.orderType} title={`Order ${order.id}`} sub={`${order.items.reduce((s, i) => s + i.qty, 0)} items · ${GHS(order.total)}`} />
        <span className={cn('rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide',
          order.status === 'DELIVERED' ? 'bg-leaf text-white' : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-800')}>
          {LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Timeline */}
        <Card><CardBody>
          <h2 className="font-display font-extrabold">Live status</h2>
          <ol className="mt-4 space-y-0" aria-label="Order timeline">
            {flow.map((s, i) => {
              const done = i <= currentIdx && order.status !== 'CANCELLED';
              const isNow = i === currentIdx && order.status !== 'CANCELLED';
              const at = [...order.timeline].reverse().find((t) => t.status === s)?.at;
              return (
                <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < flow.length - 1 && (
                    <span aria-hidden="true" className={cn('absolute left-[13px] top-7 h-[calc(100%-24px)] w-0.5', i < currentIdx ? 'bg-leaf' : 'bg-coal/10')} />
                  )}
                  <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2',
                    done ? 'border-leaf bg-leaf text-white' : 'border-coal/15 bg-white text-coal/30')}>
                    {done ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <div>
                    <p className={cn('text-sm font-bold', isNow ? 'text-leaf' : done ? 'text-coal' : 'text-coal/40')}>
                      {LABELS[s]} {isNow && '· now'}
                    </p>
                    {at && <p className="text-xs text-coal/50">{format12h(at)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {order.status === 'CANCELLED' && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">This order was cancelled.</p>}
        </CardBody></Card>

        <div className="space-y-6">
          {order.orderType === 'DELIVERY' && order.deliveryAddress && (
            <MockMap
              restaurant={{ lat: RESTAURANT.lat, lng: RESTAURANT.lng }}
              customer={{ lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng }}
              rider={riderPos}
              showRoute
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {rider && order.orderType === 'DELIVERY' ? (
              <Card><CardBody>
                <h2 className="flex items-center gap-1.5 font-display font-extrabold"><Bike size={17} /> Your rider</h2>
                <p className="mt-2 text-sm font-bold">{rider.name}</p>
                <p className="text-xs text-coal/60">{rider.vehicle}{rider.plate ? ` · ${rider.plate}` : ''}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-coal/60"><Star size={12} className="fill-gold text-gold" /> {rider.rating.toFixed(1)} rating</p>
                {etaMin !== null && <p className="mt-2 text-sm">ETA: <strong>{eta(etaMin)}</strong> {liveRider ? '· live' : ''}</p>}
                <a href={`tel:${rider.phone}`} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-coal px-4 py-2 text-xs font-bold text-white">
                  <Phone size={13} /> {rider.phone}
                </a>
              </CardBody></Card>
            ) : (
              <Card><CardBody>
                <h2 className="font-display font-extrabold">Pickup</h2>
                <p className="mt-2 text-sm text-coal/70">Collect at {RESTAURANT.address}. Show your order ID at the counter.</p>
                {order.pickupTime && <p className="mt-1 text-sm">Ready target: <strong>{formatTime12h(order.pickupTime)}</strong></p>}
              </CardBody></Card>
            )}
            <Card><CardBody>
              <h2 className="flex items-center gap-1.5 font-display font-extrabold"><KeyRound size={16} /> Handover OTP</h2>
              <p aria-live="polite" className="mt-2 font-display text-4xl font-extrabold tracking-[0.3em] text-brand-700">{order.deliveryCode ?? '—'}</p>
              <p className="mt-1 text-xs text-coal/60">Share this code with {order.orderType === 'PICKUP' ? 'the counter' : 'your rider'} to confirm handover.</p>
            </CardBody></Card>
          </div>

          <Card><CardBody>
            <h2 className="font-display font-extrabold">Items</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{it.qty} × {it.name}{it.modifiers.length > 0 && <span className="text-coal/55"> (+{it.modifiers.map((m) => m.name).join(', ')})</span>}</span>
                  <strong>{GHS(it.unitPrice * it.qty)}</strong>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-coal/10 pt-3 text-sm">
              <div className="flex justify-between text-coal/60"><dt>Subtotal</dt><dd>{GHS(order.subtotal)}</dd></div>
              <div className="flex justify-between text-coal/60"><dt>Delivery</dt><dd>{GHS(order.deliveryFee)}</dd></div>
              <div className="flex justify-between text-coal/60"><dt>Service</dt><dd>{GHS(order.serviceFee)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-leaf"><dt>Discount</dt><dd>−{GHS(order.discount)}</dd></div>}
              <div className="flex justify-between font-display text-lg font-extrabold"><dt>Total</dt><dd>{GHS(order.total)}</dd></div>
            </dl>
          </CardBody></Card>
        </div>
      </div>
    </main>
  );
}
