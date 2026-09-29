import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Copy, Minus, Plus } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { RESTAURANT } from '../../../shared/data';
import { FEE_BANDS } from '../../../shared/services/delivery';
import type { Role } from '../../../shared/types';
import { GHS, cn, format12h } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Card, CardBody, Badge, Input, Empty, SectionTitle } from '../../../components/ui/primitives';
import { useToast } from '../../../components/ui/toaster';

/* ── Customers ─────────────────────────────────────────────── */
export function CustomersPage() {
  const { orders } = useApp();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; phone: string; spend: number; count: number; last: string }>();
    for (const o of orders) {
      if (o.status === 'CANCELLED') continue;
      const e = m.get(o.customerPhone) ?? { name: o.customerName, phone: o.customerPhone, spend: 0, count: 0, last: o.createdAt };
      e.spend += o.total;
      e.count += 1;
      if (o.createdAt > e.last) { e.last = o.createdAt; e.name = o.customerName; }
      m.set(o.customerPhone, e);
    }
    const needle = q.trim().toLowerCase();
    return [...m.values()]
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.phone.includes(needle))
      .sort((a, b) => b.spend - a.spend);
  }, [orders, q]);

  return (
    <div className="space-y-4">
      <SectionTitle kicker="CRM" title="Customers" sub={`${rows.length} customers derived from orders`} />
      <Card><CardBody className="p-4"><Input placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></CardBody></Card>
      {rows.length === 0 ? <Empty title="No customers yet" body="Customers appear once orders are placed." /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Total spend</th><th className="px-4 py-3">Last order</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.phone} className="border-b border-coal/5">
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3">{r.phone}</td>
                    <td className="px-4 py-3 text-right">{r.count}</td>
                    <td className="px-4 py-3 text-right font-bold">{GHS(r.spend)}</td>
                    <td className="px-4 py-3 text-coal/60">{new Date(r.last).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Riders ────────────────────────────────────────────────── */
export function RidersPage() {
  const { riders, setRiderOnline, logAudit, user } = useApp();
  const toast = useToast();
  return (
    <div className="space-y-4">
      <SectionTitle kicker="Fleet" title="Riders" sub={`${riders.filter((r) => r.online).length} of ${riders.length} online`} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {riders.map((r) => (
          <Card key={r.id}>
            <CardBody className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-extrabold">{r.name}</p>
                <Badge className={cn(r.online ? 'bg-leaf/10 text-leaf' : 'bg-coal/5 text-coal/60')}>{r.online ? 'ONLINE' : 'OFFLINE'}</Badge>
              </div>
              <p className="text-coal/60">{r.phone} · {r.vehicle}{r.plate ? ` · ${r.plate}` : ''}</p>
              <div className="flex gap-4 text-xs">
                <span><b>{r.deliveriesToday}</b> deliveries today</span>
                <span><b>{GHS(r.earningsToday)}</b> earned</span>
                <span><b>★ {r.rating}</b></span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-coal/60">{r.busy ? 'Currently busy' : 'Available'}</span>
                <Button
                  size="sm" variant={r.online ? 'outline' : 'default'}
                  onClick={() => {
                    setRiderOnline(r.id, !r.online);
                    logAudit(user?.name ?? 'admin', `Set rider ${r.id} online=${!r.online}`, 'riders');
                    toast({ title: r.online ? 'Rider set offline' : 'Rider set online', body: r.name, kind: 'info' });
                  }}
                >
                  {r.online ? 'Go offline' : 'Go online'}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Finance ───────────────────────────────────────────────── */
type Range = 'Daily' | 'Weekly' | 'Monthly';
export function FinancePage() {
  const { orders } = useApp();
  const [range, setRange] = useState<Range>('Weekly');
  const days = range === 'Daily' ? 1 : range === 'Weekly' ? 7 : 30;
  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - (days - 1)); d.setHours(0, 0, 0, 0); return d.toISOString(); }, [days]);
  const rows = useMemo(() => orders.filter((o) => o.createdAt >= cutoff && o.status !== 'CANCELLED'), [orders, cutoff]);
  const revenue = rows.reduce((s, o) => s + o.total, 0);
  const deliveryRev = rows.reduce((s, o) => s + o.deliveryFee, 0);
  const discounts = rows.reduce((s, o) => s + o.discount, 0);
  const aov = rows.length ? revenue / rows.length : 0;
  const pickupRev = rows.filter((o) => o.orderType === 'PICKUP').reduce((s, o) => s + o.total, 0);
  const deliveryOrderRev = rows.filter((o) => o.orderType === 'DELIVERY').reduce((s, o) => s + o.total, 0);
  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((o) => m.set(o.paymentMethod, (m.get(o.paymentMethod) ?? 0) + o.total));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const topDishes = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; rev: number }>();
    rows.forEach((o) => o.items.forEach((it) => {
      const e = m.get(it.itemId) ?? { name: it.name, qty: 0, rev: 0 };
      e.qty += it.qty;
      e.rev += it.qty * it.unitPrice;
      m.set(it.itemId, e);
    }));
    return [...m.values()].sort((a, b) => b.rev - a.rev).slice(0, 5);
  }, [rows]);
  const maxMethod = byMethod[0]?.[1] ?? 1;
  const maxDish = topDishes[0]?.rev ?? 1;

  return (
    <div className="space-y-4">
      <SectionTitle kicker="Money" title="Finance" sub={`${rows.length} transactions in scope`} />
      <div className="flex gap-2">
        {(['Daily', 'Weekly', 'Monthly'] as Range[]).map((r) => (
          <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'} onClick={() => setRange(r)}>{r}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Revenue', GHS(revenue)], ['Average order value', GHS(aov)], ['Delivery revenue', GHS(deliveryRev)], ['Discounts given', GHS(discounts)]].map(([l, v]) => (
          <Card key={l}><CardBody className="p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-coal/50">{l}</p><p className="mt-1 font-display text-xl font-extrabold">{v}</p></CardBody></Card>
        ))}
      </div>
      {rows.length === 0 ? <Empty title="No transactions" body="No paid orders in this period." /> : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card><CardBody className="p-5">
              <p className="font-display font-extrabold">Revenue by payment method</p>
              <ul className="mt-4 space-y-3">
                {byMethod.map(([method, rev]) => (
                  <li key={method}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{method.replaceAll('_', ' ')}</span>
                      <span className="font-bold">{GHS(rev)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-coal/8" role="img" aria-label={`${method} ${GHS(rev)}`}>
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, (rev / maxMethod) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody></Card>
            <Card><CardBody className="p-5">
              <p className="font-display font-extrabold">Pickup vs delivery</p>
              <div className="mt-2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: 'Pickup', value: pickupRev }, { name: 'Delivery', value: deliveryOrderRev }]} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      <Cell fill="#EA580C" />
                      <Cell fill="#141210" />
                    </Pie>
                    <Tooltip formatter={(v) => GHS(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-600" />Pickup</span><b>{GHS(pickupRev)}</b></li>
                <li className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-coal" />Delivery</span><b>{GHS(deliveryOrderRev)}</b></li>
              </ul>
            </CardBody></Card>
          </div>
          <Card><CardBody className="p-5">
            <p className="font-display font-extrabold">Top dishes by revenue</p>
            <ol className="mt-4 space-y-3">
              {topDishes.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-coal/5 font-display text-xs font-extrabold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{d.name}</span>
                      <span className="shrink-0 text-coal/55">{d.qty} sold · <b className="text-coal">{GHS(d.rev)}</b></span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-coal/8">
                      <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.max(4, (d.rev / maxDish) * 100)}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody></Card>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                  <th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Subtotal</th><th className="px-4 py-3 text-right">Fees</th><th className="px-4 py-3 text-right">Total</th>
                </tr></thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="border-b border-coal/5">
                      <td className="px-4 py-3 font-bold">{o.id}</td>
                      <td className="px-4 py-3 text-coal/60">{format12h(o.createdAt)}</td>
                      <td className="px-4 py-3">{o.paymentMethod}</td>
                      <td className="px-4 py-3 text-right">{GHS(o.subtotal)}</td>
                      <td className="px-4 py-3 text-right">{GHS(o.deliveryFee + o.serviceFee)}</td>
                      <td className="px-4 py-3 text-right font-bold">{GHS(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── Inventory ─────────────────────────────────────────────── */
export function InventoryPage() {
  const { inventory, adjustStock, logAudit, user } = useApp();
  const toast = useToast();
  const bump = (id: string, delta: number, name: string) => {
    adjustStock(id, delta);
    logAudit(user?.name ?? 'admin', `Adjusted stock ${name} by ${delta}`, 'inventory');
    toast({ title: 'Stock updated', body: `${name} ${delta > 0 ? '+' : ''}${delta}`, kind: 'info' });
  };
  return (
    <div className="space-y-4">
      <SectionTitle kicker="Stock" title="Inventory" sub={`${inventory.filter((i) => i.qty <= i.minQty).length} items at or below minimum`} />
      {inventory.length === 0 ? <Empty title="No inventory" body="Seed stock items to track them here." /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                <th className="px-4 py-3">Item</th><th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Adjust</th>
              </tr></thead>
              <tbody>
                {inventory.map((i) => {
                  const low = i.qty <= i.minQty;
                  return (
                    <tr key={i.id} className="border-b border-coal/5">
                      <td className="px-4 py-3 font-semibold">{i.name}<span className="block text-xs font-normal text-coal/50">{GHS(i.unitCost)} / {i.unit}</span></td>
                      <td className="px-4 py-3 text-coal/60">{i.supplier}</td>
                      <td className="px-4 py-3 text-right font-bold">{i.qty}{i.unit} <span className="font-normal text-coal/50">(min {i.minQty})</span></td>
                      <td className="px-4 py-3"><Badge className={low ? 'bg-red-600 text-white' : 'bg-leaf/10 text-leaf'}>{low ? 'Low stock' : 'OK'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="outline" aria-label={`Decrease ${i.name}`} onClick={() => bump(i.id, -1, i.name)}><Minus /></Button>
                          <Button size="icon" variant="outline" aria-label={`Increase ${i.name}`} onClick={() => bump(i.id, 1, i.name)}><Plus /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Promotions ────────────────────────────────────────────── */
export function PromotionsPage() {
  const { promos } = useApp();
  const toast = useToast();
  return (
    <div className="space-y-4">
      <SectionTitle kicker="Marketing" title="Promotions" sub={`${promos.filter((p) => p.active).length} active codes`} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {promos.map((p) => (
          <Card key={p.id}>
            <CardBody className="flex items-center justify-between p-4">
              <div>
                <p className="font-display text-lg font-extrabold tracking-wide">{p.code}</p>
                <p className="text-sm text-coal/60">
                  {p.type === 'PERCENT' ? `${p.value}% off` : p.type === 'FIXED' ? `${GHS(p.value)} off` : 'Free delivery'}
                  {p.expiresAt ? ` · expires ${new Date(p.expiresAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={p.active ? 'bg-leaf/10 text-leaf' : 'bg-coal/5 text-coal/60'}>{p.active ? 'Active' : 'Off'}</Badge>
                <Button
                  size="sm" variant="outline"
                  onClick={() => { void navigator.clipboard?.writeText(p.code).catch(() => undefined); toast({ title: 'Code copied', body: p.code, kind: 'info' }); }}
                >
                  <Copy /> Copy
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {promos.length === 0 && <Empty title="No promotions" body="Create promo codes from the backend." />}
    </div>
  );
}

/* ── Analytics ─────────────────────────────────────────────── */
export function AnalyticsPage() {
  const { orders } = useApp();
  const trend = useMemo(() => {
    const days: { day: string; key: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === key && o.status !== 'CANCELLED');
      days.push({ day: d.toLocaleDateString('en-GB', { weekday: 'short' }), key, revenue: +dayOrders.reduce((s, o) => s + o.total, 0).toFixed(2), orders: dayOrders.length });
    }
    return days;
  }, [orders]);
  const split = useMemo(() => [
    { name: 'Pickup', value: orders.filter((o) => o.orderType === 'PICKUP').length },
    { name: 'Delivery', value: orders.filter((o) => o.orderType === 'DELIVERY').length },
  ], [orders]);
  const peak = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: 0 }));
    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      if (Number.isFinite(h)) buckets[h].orders += 1;
    }
    return buckets.filter((b) => b.orders > 0);
  }, [orders]);

  return (
    <div className="space-y-4">
      <SectionTitle kicker="Insights" title="Analytics" sub="Revenue, channel mix and peak hours." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardBody>
          <h3 className="font-display text-base font-extrabold">Revenue trend (7d)</h3>
          <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="#14121022" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} width={56} />
              <Tooltip formatter={(v) => (typeof v === 'number' ? GHS(v) : v)} />
              <Area type="monotone" dataKey="revenue" stroke="#1E7A4C" fill="#1E7A4C33" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer></div>
        </CardBody></Card>
        <Card><CardBody>
          <h3 className="font-display text-base font-extrabold">Pickup vs delivery</h3>
          <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={split} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3} label>
                {split.map((_, i) => <Cell key={i} fill={i === 0 ? '#EA580C' : '#141210'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer></div>
        </CardBody></Card>
      </div>
      <Card><CardBody>
        <h3 className="font-display text-base font-extrabold">Peak hours</h3>
        {peak.length === 0 ? <div className="mt-3"><Empty title="No data yet" body="Hourly order volume will appear here." /></div> : (
          <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={peak}><CartesianGrid strokeDasharray="3 3" stroke="#14121022" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} width={32} allowDecimals={false} />
              <Tooltip /><Bar dataKey="orders" fill="#C9A227" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        )}
      </CardBody></Card>
    </div>
  );
}

/* ── Staff ─────────────────────────────────────────────────── */
const ROLES: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN_MANAGER', 'KITCHEN_STAFF', 'DELIVERY_MANAGER', 'RIDER', 'ACCOUNTANT'];
const PERMS = ['View dashboard', 'Manage orders', 'Manage menu', 'Manage riders', 'View finance', 'Manage promos', 'Manage staff'] as const;
const MATRIX: Record<Role, boolean[]> = {
  OWNER: [true, true, true, true, true, true, true],
  ADMIN: [true, true, true, true, true, true, false],
  MANAGER: [true, true, true, false, false, false, false],
  KITCHEN_MANAGER: [true, true, false, false, false, false, false],
  KITCHEN_STAFF: [false, true, false, false, false, false, false],
  DELIVERY_MANAGER: [true, true, false, true, false, false, false],
  RIDER: [false, false, false, false, false, false, false],
  ACCOUNTANT: [true, false, false, false, true, false, false],
  CUSTOMER: [false, false, false, false, false, false, false],
};
export function StaffPage() {
  return (
    <div className="space-y-4">
      <SectionTitle kicker="Team" title="Staff & roles" sub="RBAC is enforced by the backend — this matrix is read-only here." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
              <th className="px-4 py-3">Role</th>
              {PERMS.map((p) => <th key={p} className="px-4 py-3 text-center">{p}</th>)}
            </tr></thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r} className="border-b border-coal/5">
                  <td className="px-4 py-3 font-bold">{r}</td>
                  {MATRIX[r].map((on, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      <input type="checkbox" checked={on} disabled aria-label={`${r} ${PERMS[i]}`} className="h-4 w-4 accent-orange-600" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── Audit ─────────────────────────────────────────────────── */
export function AuditPage() {
  const { audit } = useApp();
  return (
    <div className="space-y-4">
      <SectionTitle kicker="Compliance" title="Audit logs" sub={`${audit.length} entries`} />
      {audit.length === 0 ? <Empty title="No audit entries" body="Staff actions will be recorded here." /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                <th className="px-4 py-3">When</th><th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th><th className="px-4 py-3">Resource</th><th className="px-4 py-3">Change</th>
              </tr></thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-b border-coal/5">
                    <td className="px-4 py-3 text-coal/60">{format12h(a.at)}</td>
                    <td className="px-4 py-3 font-semibold">{a.user}</td>
                    <td className="px-4 py-3">{a.action}</td>
                    <td className="px-4 py-3"><Badge className="bg-coal/5 text-coal">{a.resource}</Badge></td>
                    <td className="px-4 py-3 text-xs text-coal/60">{a.prev || a.next ? `${a.prev ?? '—'} → ${a.next ?? '—'}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Settings ──────────────────────────────────────────────── */
export function SettingsPage() {
  const toast = useToast();
  const [name, setName] = useState(RESTAURANT.name);
  const [address, setAddress] = useState(RESTAURANT.address);
  const [phone, setPhone] = useState(RESTAURANT.phone);
  const creds = ['PAYSTACK public/secret keys', 'MTN MoMo API key', 'Vodafone MoMo API key', 'Google Maps API key'];
  return (
    <div className="space-y-4">
      <SectionTitle kicker="Config" title="Settings" sub="Restaurant profile, fees, hours and credentials." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardBody className="space-y-2">
          <h3 className="font-display text-base font-extrabold">Restaurant info</h3>
          <label className="text-xs font-bold uppercase tracking-wide text-coal/50" htmlFor="s-name">Name</label>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="text-xs font-bold uppercase tracking-wide text-coal/50" htmlFor="s-addr">Address</label>
          <Input id="s-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
          <label className="text-xs font-bold uppercase tracking-wide text-coal/50" htmlFor="s-phone">Phone</label>
          <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="text-xs text-coal/60">Hours: {RESTAURANT.openHour}:00 – {RESTAURANT.closeHour}:00 daily</p>
          <Button onClick={() => toast({ title: 'Saved (demo)', body: 'Persists to backend in production.', kind: 'success' })}>Save changes</Button>
        </CardBody></Card>
        <Card><CardBody>
          <h3 className="font-display text-base font-extrabold">Delivery fee bands</h3>
          <table className="mt-2 w-full text-left text-sm">
            <thead><tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
              <th className="py-2">Distance</th><th className="py-2 text-right">Fee</th>
            </tr></thead>
            <tbody>
              {FEE_BANDS.map((b) => (
                <tr key={`${b.minKm}-${b.maxKm}`} className="border-b border-coal/5">
                  <td className="py-2">{b.minKm} – {b.maxKm >= 999 ? '∞' : b.maxKm} km</td>
                  <td className="py-2 text-right font-bold">{GHS(b.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody></Card>
      </div>
      <Card><CardBody>
        <h3 className="font-display text-base font-extrabold">Credentials checklist</h3>
        <p className="text-sm text-coal/60">Add these in the backend <code>.env</code> — never in frontend code.</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {creds.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', /Maps/.test(c) ? 'bg-gold' : 'bg-coal/20')} />
              {c} <Badge className="bg-gold/15 text-yellow-800">backend .env</Badge>
            </li>
          ))}
        </ul>
      </CardBody></Card>
    </div>
  );
}
