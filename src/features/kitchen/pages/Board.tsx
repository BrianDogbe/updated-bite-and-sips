import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bike, Flame, ShoppingBag, Timer, X } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { useToast } from '../../../components/ui/toaster';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/primitives';
import { GHS, cn } from '../../../lib/utils';
import type { Order, OrderStatus } from '../../../shared/types';
import type { KitchenOutletCtx } from '../KitchenLayout';

// ── helpers ──────────────────────────────────────────────

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function elapsedMin(o: Order, nowMs: number): number {
  return Math.max(0, (nowMs - new Date(o.createdAt).getTime()) / 60000);
}

function elapsedLabel(o: Order, nowMs: number): string {
  const m = Math.floor(elapsedMin(o, nowMs));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function pickupCountdown(pickupTime: string | undefined, nowMs: number): string | null {
  if (!pickupTime) return null;
  const diffMs = new Date(pickupTime).getTime() - nowMs;
  const abs = Math.abs(diffMs);
  const m = Math.floor(abs / 60000);
  const label = m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  return diffMs >= 0 ? `in ${label}` : `${label} overdue`;
}

function isUrgent(o: Order, nowMs: number): boolean {
  if (elapsedMin(o, nowMs) > 15) return true;
  if (o.pickupTime) {
    const diffMin = (new Date(o.pickupTime).getTime() - nowMs) / 60000;
    if (diffMin < 20) return true;
  }
  return false;
}

function playBeep(): void {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* audio unavailable — stay silent */
  }
}

// ── column model ─────────────────────────────────────────

type ColKey = 'NEW' | 'PREPARING' | 'READY' | 'DONE';

const COLS: { key: ColKey; title: string; hint: string; dot: string; pill: string }[] = [
  { key: 'NEW', title: 'New', hint: 'Pending + Confirmed', dot: 'bg-gold', pill: 'bg-gold/15 text-yellow-800' },
  { key: 'PREPARING', title: 'Preparing', hint: 'In the kitchen', dot: 'bg-brand-600', pill: 'bg-brand-600/10 text-brand-700' },
  { key: 'READY', title: 'Ready', hint: 'Ready + rider assigned', dot: 'bg-leaf', pill: 'bg-leaf/10 text-leaf' },
  { key: 'DONE', title: 'Completed', hint: 'Handed over today', dot: 'bg-coal/40', pill: 'bg-coal/5 text-coal/60' },
];

function colOf(o: Order): ColKey | null {
  switch (o.status) {
    case 'PENDING':
    case 'CONFIRMED':
      return 'NEW';
    case 'PREPARING':
      return 'PREPARING';
    case 'READY_FOR_PICKUP':
    case 'RIDER_ASSIGNED':
    case 'ARRIVED_AT_RESTAURANT':
      return 'READY';
    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERED':
      return isToday(o.updatedAt) ? 'DONE' : null;
    default:
      return null;
  }
}

// ── board ────────────────────────────────────────────────

export function Board() {
  const { orders, updateOrderStatus, assignRider, deleteOrder, riders, user } = useApp();
  const toast = useToast();
  const ctx = useOutletContext<KitchenOutletCtx | null>();
  const soundOn = ctx?.soundOn ?? true;
  const [riderPick, setRiderPick] = useState<Record<string, string>>({});

  // Auto-refresh tick so elapsed times / countdowns stay fresh from the store
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // New-order flash banner + optional beep
  const [flashId, setFlashId] = useState<string | null>(null);
  const prevIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id));
    if (prevIds.current === null) {
      prevIds.current = ids;
      return;
    }
    const fresh = orders.find((o) => !prevIds.current?.has(o.id));
    prevIds.current = ids;
    if (fresh) {
      setFlashId(fresh.id);
      if (soundOn) playBeep();
      const t = setTimeout(() => setFlashId(null), 8000);
      return () => clearTimeout(t);
    }
  }, [orders, soundOn]);

  const grouped = useMemo(() => {
    const g: Record<ColKey, Order[]> = { NEW: [], PREPARING: [], READY: [], DONE: [] };
    for (const o of orders) {
      const c = colOf(o);
      if (c) g[c].push(o);
    }
    // Urgent tickets first, then oldest — so the pass always sees what matters.
    const rank = (o: Order) => (isUrgent(o, nowMs) ? 0 : 1);
    const byPriority = (a: Order, b: Order) =>
      rank(a) - rank(b) || +new Date(a.createdAt) - +new Date(b.createdAt);
    (Object.keys(g) as ColKey[]).forEach((k) => g[k].sort(byPriority));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, nowMs]);

  const [urgentOnly, setUrgentOnly] = useState(false);
  const visible = (key: ColKey): Order[] =>
    urgentOnly ? grouped[key].filter((o) => isUrgent(o, nowMs)) : grouped[key];

  const act = (id: string, status: OrderStatus, label: string) => {
    updateOrderStatus(id, status, user?.name ?? 'kitchen');
    toast({ title: `${id} → ${label}`, kind: 'success' });
  };

  const cancelOrder = (id: string) => {
    if (!window.confirm(`Cancel order ${id}? The customer will see the cancellation immediately.`)) return;
    act(id, 'CANCELLED', 'Cancelled');
  };

  const handToRider = (orderId: string) => {
    const riderId = riderPick[orderId];
    if (!riderId) {
      toast({ title: 'Pick a rider first', kind: 'error' });
      return;
    }
    assignRider(orderId, riderId);
    toast({ title: `${orderId} → rider`, body: riders.find((r) => r.id === riderId)?.name, kind: 'success' });
  };

  const onlineRiders = riders.filter((r) => r.online);
  const sortedRiders = [...riders].sort((a, b) => Number(b.online) - Number(a.online));

  const totalActive = grouped.NEW.length + grouped.PREPARING.length + grouped.READY.length;
  const urgentCount = [...grouped.NEW, ...grouped.PREPARING, ...grouped.READY].filter((o) => isUrgent(o, nowMs)).length;

  return (
    <div>
      <AnimatePresence>
        {flashId && (
          <motion.div
            key={flashId}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            role="alert"
            className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-300 px-5 py-4 text-coal"
          >
            <Flame className="h-6 w-6 shrink-0" aria-hidden />
            <p className="text-lg font-extrabold">
              New order {flashId} just landed — fire it up!
            </p>
            <button
              type="button"
              onClick={() => setFlashId(null)}
              aria-label="Dismiss new order alert"
              className="ml-auto min-h-[44px] min-w-[44px] rounded-xl bg-coal px-3 text-sm font-bold text-white"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pass overview strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-live="polite">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coal px-4 py-2 text-sm font-extrabold text-white">
          <Timer className="h-4 w-4" aria-hidden />
          {totalActive === 0 ? 'Kitchen clear' : `${totalActive} active`}
        </span>
        {(['NEW', 'PREPARING', 'READY'] as ColKey[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-coal/70">
            <span className={cn('h-2.5 w-2.5 rounded-full', COLS.find((c) => c.key === k)?.dot)} aria-hidden />
            {k === 'NEW' ? 'New' : k === 'PREPARING' ? 'Preparing' : 'Ready'} · {grouped[k].length}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setUrgentOnly((v) => !v)}
          aria-pressed={urgentOnly}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors',
            urgentOnly ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700',
          )}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden /> Urgent · {urgentCount}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((c) => (
          <section key={c.key} aria-label={`${c.title} orders`} className="min-w-0 rounded-3xl bg-white/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className={cn('h-3 w-3 rounded-full', c.dot)} aria-hidden />
                <div>
                  <h2 className="font-display text-base font-extrabold uppercase tracking-wide leading-tight">{c.title}</h2>
                  <p className="text-[11px] font-semibold text-coal/50">{c.hint}</p>
                </div>
              </div>
              <span
                className={cn('rounded-full px-3 py-1 font-display text-lg font-extrabold tabular-nums', c.pill)}
                aria-label={`${visible(c.key).length} orders in ${c.title}`}
              >
                {visible(c.key).length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {visible(c.key).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-coal/15 bg-white p-6 text-center">
                  <p className="text-sm font-bold text-coal/50">{urgentOnly ? 'No urgent tickets' : 'No active orders'}</p>
                </div>
              ) : (
                visible(c.key).map((o) => {
                  const urgent = isUrgent(o, nowMs);
                  const countdown = pickupCountdown(o.pickupTime, nowMs);
                  return (
                    <motion.article
                      key={o.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'rounded-2xl bg-white p-4 text-coal shadow-card',
                        urgent && 'border-2 border-red-500',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-2xl font-extrabold tracking-tight">#{o.id}</p>
                        {urgent && (
                          <Badge className="bg-red-600 text-white" role="alert">
                            <Flame className="h-3 w-3" aria-hidden /> Urgent
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge className={o.orderType === 'DELIVERY' ? 'bg-coal text-white' : 'bg-leaf/15 text-leaf'}>
                          {o.orderType === 'DELIVERY' ? <Bike className="h-3 w-3" aria-hidden /> : <ShoppingBag className="h-3 w-3" aria-hidden />}
                          {o.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                        </Badge>
                        <span className="text-xs font-semibold text-coal/60 tabular-nums">{elapsedLabel(o, nowMs)}</span>
                        {countdown && (
                          <Badge className="bg-amber-100 text-amber-900">Pickup {countdown}</Badge>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-semibold text-coal/60">
                        {o.customerName} · {GHS(o.total)}
                      </p>

                      <ul className="mt-3 space-y-2 border-t border-coal/10 pt-3">
                        {o.items.map((it, i) => (
                          <li key={`${it.itemId}-${i}`} className="text-sm">
                            <p className="font-extrabold">
                              <span className="mr-1.5 inline-flex min-w-7 items-center justify-center rounded-lg bg-coal px-1.5 py-0.5 text-xs font-extrabold text-white">
                                {it.qty}×
                              </span>
                              {it.name}
                            </p>
                            {it.modifiers.length > 0 && (
                              <p className="ml-9 text-xs text-coal/60">+ {it.modifiers.map((m) => m.name).join(', ')}</p>
                            )}
                            {it.instructions && (
                              <p className="ml-9 text-xs font-semibold italic text-amber-800">“{it.instructions}”</p>
                            )}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 space-y-2">
                        {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                          <Button
                            size="lg"
                            onClick={() => act(o.id, 'PREPARING', 'Preparing')}
                            aria-label={`Accept order ${o.id} and start preparing`}
                            className="min-h-[56px] w-full text-base"
                          >
                            Accept
                          </Button>
                        )}
                        {o.status === 'PREPARING' && (
                          <Button
                            size="lg"
                            variant="leaf"
                            onClick={() => act(o.id, 'READY_FOR_PICKUP', 'Ready')}
                            aria-label={`Mark order ${o.id} as ready`}
                            className="min-h-[56px] w-full text-base"
                          >
                            Mark ready
                          </Button>
                        )}
                        {o.status === 'READY_FOR_PICKUP' && o.orderType === 'DELIVERY' && (
                          <div className="space-y-2 rounded-xl bg-cream p-3">
                            <label htmlFor={`rider-${o.id}`} className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-coal/60">
                              <Bike size={14} /> Hand to rider
                            </label>
                            {riders.length === 0 ? (
                              <p className="rounded-xl bg-white p-3 text-xs font-semibold text-coal/55">
                                No riders found. Check the connection, then reload this page.
                              </p>
                            ) : (
                              <select
                                id={`rider-${o.id}`}
                                value={riderPick[o.id] ?? ''}
                                onChange={(e) => setRiderPick((p) => ({ ...p, [o.id]: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-coal/15 bg-white px-3 text-sm font-semibold"
                              >
                                <option value="">
                                  {onlineRiders.length > 0
                                    ? `Select rider… (${onlineRiders.length} online)`
                                    : 'All riders offline — ask one to go online'}
                                </option>
                                {sortedRiders.map((r) => (
                                  <option key={r.id} value={r.id} disabled={!r.online}>
                                    {r.name}{r.online ? (r.busy ? ' (busy)' : '') : ' (offline)'}
                                  </option>
                                ))}
                              </select>
                            )}
                            <Button
                              size="lg"
                              onClick={() => handToRider(o.id)}
                              aria-label={`Hand order ${o.id} to rider`}
                              className="min-h-[56px] w-full text-base"
                            >
                              Hand to rider
                            </Button>
                          </div>
                        )}
                        {((o.status === 'READY_FOR_PICKUP' && o.orderType === 'PICKUP') || o.status === 'RIDER_ASSIGNED' || o.status === 'ARRIVED_AT_RESTAURANT') && (
                          <Button
                            size="lg"
                            variant="secondary"
                            onClick={() => act(o.id, 'PICKED_UP', 'Picked up')}
                            aria-label={`Confirm order ${o.id} handed over`}
                            className="min-h-[56px] w-full text-base"
                          >
                            Handed over
                          </Button>
                        )}
                        {(o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED') && (
                          <p className="rounded-xl bg-coal/5 px-4 py-3 text-center text-sm font-bold text-coal/60">
                            {o.status.replaceAll('_', ' ')}
                          </p>
                        )}
                        {['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status) && (
                          <button
                            type="button"
                            onClick={() => cancelOrder(o.id)}
                            aria-label={`Cancel order ${o.id}`}
                            className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
                          >
                            Cancel order
                          </button>
                        )}
                        {(o.status === 'DELIVERED' || o.status === 'CANCELLED') && (
                          <button
                            type="button"
                            onClick={() => deleteOrder(o.id)}
                            aria-label={`Remove order ${o.id} from board`}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-coal/45 hover:bg-coal/5 hover:text-coal"
                          >
                            <X size={14} /> Remove from board
                          </button>
                        )}
                      </div>
                    </motion.article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}

export default Board;
