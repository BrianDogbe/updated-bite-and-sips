import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import type { Order, OrderStatus } from '../../../shared/types';
import { GHS, cn, format12h } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Card, CardBody, Badge, Input, Empty, SectionTitle } from '../../../components/ui/primitives';

const STATUSES: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

function statusStyle(s: OrderStatus): string {
  if (s === 'DELIVERED') return 'bg-leaf/10 text-leaf';
  if (s === 'CANCELLED') return 'bg-red-600/10 text-red-700';
  if (s === 'PENDING') return 'bg-gold/15 text-yellow-800';
  return 'bg-brand-600/10 text-brand-700';
}

export default function OrdersPage() {
  const { orders, riders } = useApp();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [otype, setOtype] = useState<'ALL' | 'PICKUP' | 'DELIVERY'>('ALL');
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== 'ALL' && o.status !== status) return false;
      if (otype !== 'ALL' && o.orderType !== otype) return false;
      if (!needle) return true;
      return (
        o.id.toLowerCase().includes(needle) ||
        o.customerName.toLowerCase().includes(needle) ||
        o.customerPhone.includes(needle)
      );
    });
  }, [orders, q, status, otype]);

  const live = selected ? (orders.find((o) => o.id === selected.id) ?? selected) : null;

  return (
    <div className="space-y-4">
      <SectionTitle kicker="Sales" title="Orders" sub={`${filtered.length} of ${orders.length} orders`} />
      <Card className="border-0">
        <CardBody className="flex flex-col gap-2 p-4 md:flex-row">
          <div className="flex-1"><Input placeholder="Search by id, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></div>
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'ALL')} className="h-11 rounded-xl border border-coal/15 bg-white px-3 text-sm" aria-label="Status filter">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={otype} onChange={(e) => setOtype(e.target.value as 'ALL' | 'PICKUP' | 'DELIVERY')} className="h-11 rounded-xl border border-coal/15 bg-white px-3 text-sm" aria-label="Type filter">
            <option value="ALL">ALL TYPES</option>
            <option value="PICKUP">PICKUP</option>
            <option value="DELIVERY">DELIVERY</option>
          </select>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <Empty title="No orders found" body="Try clearing search or filters." />
      ) : (
        <Card className="border-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer border-b border-coal/5 hover:bg-cream">
                    <td className="px-4 py-3 font-bold">{o.id}<span className="block text-xs font-normal text-coal/50">{format12h(o.createdAt)}</span></td>
                    <td className="px-4 py-3">{o.customerName}<span className="block text-xs text-coal/50">{o.customerPhone}</span></td>
                    <td className="px-4 py-3"><Badge className="bg-coal/5 text-coal">{o.orderType}</Badge></td>
                    <td className="px-4 py-3"><Badge className={cn(statusStyle(o.status))}>{o.status}</Badge></td>
                    <td className="px-4 py-3 text-xs">{o.paymentMethod} · {o.paymentStatus}</td>
                    <td className="px-4 py-3 text-right font-bold">{GHS(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {live && (
        <div className="fixed inset-0 z-40" role="dialog" aria-label={`Order ${live.id}`}>
          <div className="absolute inset-0 bg-coal/40" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 flex h-full w-[min(94vw,440px)] flex-col bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-coal/10 p-4">
              <div>
                <p className="font-display text-lg font-extrabold">{live.id}</p>
                <Badge className={cn('mt-1', statusStyle(live.status))}>{live.status}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close"><X /></Button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-coal/50">Customer</h4>
                <p className="mt-1 font-semibold">{live.customerName} · {live.customerPhone}</p>
                {live.deliveryAddress && <p className="text-coal/60">{live.deliveryAddress.street}, {live.deliveryAddress.city}</p>}
                {live.deliveryCode && <p className="text-coal/60">Delivery OTP: <b>{live.deliveryCode}</b></p>}
              </section>
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-coal/50">Items</h4>
                <ul className="mt-1 divide-y divide-coal/10">
                  {live.items.map((it, i) => (
                    <li key={`${it.itemId}-${i}`} className="flex justify-between py-1.5">
                      <span>{it.name} × {it.qty}</span>
                      <span className="font-semibold">{GHS(it.qty * it.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right font-extrabold">Total {GHS(live.total)}</p>
              </section>
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-coal/50">Payment</h4>
                <p className="mt-1">{live.paymentMethod} · {live.paymentStatus} · fee {GHS(live.deliveryFee)} · discount {GHS(live.discount)}</p>
              </section>
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-coal/50">Status <span className="font-normal normal-case">(updated by kitchen)</span></h4>
                <p className="mt-2"><Badge className={statusStyle(live.status)}>{live.status.replaceAll('_', ' ')}</Badge></p>
              </section>
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-coal/50">Rider <span className="font-normal normal-case">(assigned by kitchen)</span></h4>
                <p className="mt-1 font-semibold">
                  {live.riderId
                    ? (riders.find((r) => r.id === live.riderId)?.name ?? live.riderId)
                    : 'Not assigned yet'}
                </p>
              </section>
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-coal/50">Timeline</h4>
                <ol className="mt-1 space-y-1">
                  {live.timeline.map((t, i) => (
                    <li key={i} className="flex justify-between text-xs"><span className="font-semibold">{t.status}</span><span className="text-coal/50">{format12h(t.at)}{t.by ? ` · ${t.by}` : ''}</span></li>
                  ))}
                </ol>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
