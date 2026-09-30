import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowRight, Banknote, Bike, Clock3, Flame, PackageX, ShoppingBag,
  Users, UtensilsCrossed, Activity,
} from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { GHS, cn } from '../../../lib/utils';
import { Card, CardBody, Badge, Empty } from '../../../components/ui/primitives';

const ACTIVE = new Set(['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY']);

function last7Days(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    });
  }
  return out;
}

const DONUT_COLORS = ['#EA580C', '#141210', '#C9A227', '#1E7A4C', '#D6CDBF'];

export default function Dashboard() {
  const { orders, riders, inventory, menu, audit } = useApp();

  const weekAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); }, []);
  const valid = useMemo(() => orders.filter((o) => o.status !== 'CANCELLED'), [orders]);
  const thisWeek = useMemo(() => valid.filter((o) => o.createdAt.slice(0, 10) >= weekAgo), [valid, weekAgo]);
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const customers = useMemo(() => new Set(orders.map((o) => o.customerId)).size, [orders]);
  const newCustomersWeek = useMemo(() => {
    const seen = new Set(orders.filter((o) => o.createdAt.slice(0, 10) < weekAgo).map((o) => o.customerId));
    return new Set(thisWeek.map((o) => o.customerId).filter((id) => !seen.has(id))).size;
  }, [orders, thisWeek, weekAgo]);
  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const active = orders.filter((o) => ACTIVE.has(o.status)).length;
  const activeDeliveries = orders.filter((o) => o.orderType === 'DELIVERY' && ACTIVE.has(o.status)).length;
  const availableRiders = riders.filter((r) => r.online && !r.busy).length;
  const lowStock = inventory.filter((i) => i.qty <= i.minQty);

  const sales7 = useMemo(() => {
    const days = last7Days();
    return days.map((d) => {
      const dayOrders = valid.filter((o) => o.createdAt.slice(0, 10) === d.key);
      return {
        day: d.label,
        revenue: +dayOrders.reduce((s, o) => s + o.total, 0).toFixed(2),
        orders: dayOrders.length,
      };
    });
  }, [valid]);
  const peakDay = sales7.reduce((best, d) => (d.orders > best.orders ? d : best), sales7[0]);

  const byCategory = useMemo(() => {
    const byId = new Map(menu.map((m) => [m.id, m.categoryId]));
    const m = new Map<string, number>();
    valid.forEach((o) => o.items.forEach((it) => {
      const cat = byId.get(it.itemId) ?? 'other';
      m.set(cat, (m.get(cat) ?? 0) + it.qty * it.unitPrice);
    }));
    const total = [...m.values()].reduce((s, v) => s + v, 0) || 1;
    return [...m.entries()]
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, pct: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [valid, menu]);

  const orderTypes = useMemo(() => {
    const p = valid.filter((o) => o.orderType === 'PICKUP').length;
    const d = valid.filter((o) => o.orderType === 'DELIVERY').length;
    const t = Math.max(1, p + d);
    return [
      { label: 'Pickup', count: p, pct: Math.round((p / t) * 100) },
      { label: 'Delivery', count: d, pct: Math.round((d / t) * 100) },
    ];
  }, [valid]);

  const trending = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    valid.forEach((o) => o.items.forEach((it) => {
      const e = m.get(it.itemId) ?? { name: it.name, qty: 0, revenue: 0 };
      e.qty += it.qty;
      e.revenue += it.qty * it.unitPrice;
      m.set(it.itemId, e);
    }));
    const byId = new Map(menu.map((x) => [x.id, x]));
    return [...m.entries()]
      .map(([id, v]) => ({ ...v, item: byId.get(id) }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [valid, menu]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5),
    [orders],
  );
  const activity = useMemo(() => [...audit].slice(0, 5), [audit]);

  const topCustomers = useMemo(() => {
    const m = new Map<string, { name: string; orders: number; spend: number }>();
    valid.forEach((o) => {
      const e = m.get(o.customerId) ?? { name: o.customerName, orders: 0, spend: 0 };
      e.orders += 1;
      e.spend += o.total;
      m.set(o.customerId, e);
    });
    return [...m.values()].sort((a, b) => b.spend - a.spend).slice(0, 5);
  }, [valid]);

  const paySplit = useMemo(() => {
    const m = new Map<string, number>();
    valid.forEach((o) => m.set(o.paymentMethod, (m.get(o.paymentMethod) ?? 0) + o.total));
    const total = [...m.values()].reduce((s, v) => s + v, 0) || 1;
    return [...m.entries()]
      .map(([method, rev]) => ({ method: method.replaceAll('_', ' '), rev, pct: Math.round((rev / total) * 100) }))
      .sort((a, b) => b.rev - a.rev);
  }, [valid]);

  const stats = [
    { label: 'Total Orders', value: String(orders.length), sub: `${thisWeek.length} this week`, icon: ShoppingBag },
    { label: 'Total Customers', value: String(customers), sub: `${newCustomersWeek} new this week`, icon: Users },
    { label: 'Total Revenue', value: GHS(revenue), sub: `${GHS(thisWeek.reduce((s, o) => s + o.total, 0))} this week`, icon: Banknote },
  ];

  const statusPill = (s: string) => {
    if (s === 'DELIVERED') return 'bg-leaf/10 text-leaf';
    if (s === 'CANCELLED') return 'bg-red-600/10 text-red-700';
    if (s === 'PENDING') return 'bg-gold/15 text-yellow-800';
    return 'bg-brand-600/10 text-brand-700';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-coal/55">Hello Admin, welcome back!</p>
        </div>
        <p className="text-xs font-semibold text-coal/50">
          {pending} pending · {active} active · {activeDeliveries} deliveries out · {availableRiders} riders free
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-0"><CardBody className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <s.icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-coal/50">{s.label}</span>
              <span className="block truncate font-display text-xl font-extrabold">{s.value}</span>
              <span className="block text-[11px] font-semibold text-coal/50">{s.sub}</span>
            </span>
          </CardBody></Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <Card className="border-0"><CardBody>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-extrabold">Total Revenue</h3>
                <p className="font-display text-2xl font-extrabold text-brand-700">{GHS(revenue)}</p>
              </div>
              <span className="rounded-full bg-coal/5 px-3 py-1.5 text-[11px] font-bold text-coal/60">Last 7 days</span>
            </div>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales7} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14121022" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={64} tickFormatter={(v) => `₵${v}`} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? GHS(v) : v)} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#EA580C" fill="#FDBA74" fillOpacity={0.45} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody></Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0"><CardBody>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-extrabold">Orders Overview</h3>
                <span className="rounded-full bg-coal/5 px-3 py-1.5 text-[11px] font-bold text-coal/60">This week</span>
              </div>
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sales7} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#14121022" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={28} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" radius={[7, 7, 0, 0]}>
                      {sales7.map((d) => (
                        <Cell key={d.day} fill={d.day === peakDay?.day && d.orders > 0 ? '#EA580C' : '#FDBA74'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody></Card>

            <Card className="border-0"><CardBody>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-extrabold">Top Categories</h3>
                <span className="rounded-full bg-coal/5 px-3 py-1.5 text-[11px] font-bold text-coal/60">This month</span>
              </div>
              {byCategory.length === 0 ? (
                <div className="mt-3"><Empty title="No sales yet" body="Category mix will appear here." /></div>
              ) : (
                <>
                  <div className="mx-auto mt-2 h-44 max-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
                          {byCategory.map((c, i) => (
                            <Cell key={c.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => (typeof v === 'number' ? GHS(v) : v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {byCategory.map((c, i) => (
                      <li key={c.name} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="truncate font-semibold">{c.name} {c.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardBody></Card>
          </div>

          <Card className="border-0"><CardBody>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold">Recent Orders</h3>
              <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline">
                See All Orders <ArrowRight size={13} />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="mt-3"><Empty title="No orders yet" body="Recent orders will stream in here live." /></div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead><tr className="border-b border-coal/10 text-[11px] uppercase tracking-wide text-coal/45">
                    <th className="px-2 py-2">Order ID</th><th className="px-2 py-2">Photo</th><th className="px-2 py-2">Menu</th>
                    <th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Amount</th>
                    <th className="px-2 py-2">Customer</th><th className="px-2 py-2 text-right">Status</th>
                  </tr></thead>
                  <tbody>
                    {recentOrders.map((o) => {
                      const first = menu.find((m) => m.id === o.items[0]?.itemId);
                      return (
                        <tr key={o.id} className="border-b border-coal/5 last:border-0">
                          <td className="px-2 py-2.5 font-extrabold">{o.id}</td>
                          <td className="px-2 py-2.5">
                            {first ? (
                              <img src={first.image} alt="" aria-hidden="true" className="h-9 w-9 rounded-lg object-cover" loading="lazy" />
                            ) : (
                              <span className="grid h-9 w-9 place-items-center rounded-lg bg-coal/5"><UtensilsCrossed size={14} className="text-coal/40" /></span>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            <span className="block max-w-[180px] truncate font-semibold">{o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</span>
                            <span className="block text-xs text-coal/50">{o.orderType}</span>
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                          <td className="px-2 py-2.5 text-right font-bold">{GHS(o.total)}</td>
                          <td className="px-2 py-2.5">{o.customerName}</td>
                          <td className="px-2 py-2.5 text-right">
                            <Badge className={cn('text-[10px]', statusPill(o.status))}>{o.status.replaceAll('_', ' ')}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody></Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0"><CardBody>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold"><Users size={16} className="text-brand-600" /> Top customers</h3>
                <Link to="/admin/customers" className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline">
                  All customers <ArrowRight size={13} />
                </Link>
              </div>
              {topCustomers.length === 0 ? (
                <div className="mt-3"><Empty title="No customers yet" body="Big spenders will appear here." /></div>
              ) : (
                <ol className="mt-3 space-y-2.5">
                  {topCustomers.map((c, i) => (
                    <li key={c.name} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 font-display text-sm font-extrabold text-brand-700">
                        {c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">#{i + 1} {c.name}</span>
                        <span className="block text-xs text-coal/55">{c.orders} order{c.orders === 1 ? '' : 's'}</span>
                      </span>
                      <span className="shrink-0 text-sm font-extrabold">{GHS(c.spend)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody></Card>
            <Card className="border-0"><CardBody>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold"><Banknote size={16} className="text-brand-600" /> Payments</h3>
                <Link to="/admin/finance" className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline">
                  Finance <ArrowRight size={13} />
                </Link>
              </div>
              {paySplit.length === 0 ? (
                <div className="mt-3"><Empty title="No payments yet" body="Method split will appear here." /></div>
              ) : (
                <ul className="mt-4 space-y-3.5">
                  {paySplit.map((p) => (
                    <li key={p.method}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{p.method} <span className="text-coal/45">{p.pct}%</span></span>
                        <span className="font-extrabold">{GHS(p.rev)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-coal/8" role="img" aria-label={`${p.method}: ${GHS(p.rev)}`}>
                        <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.max(4, p.pct)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0"><CardBody>
              <h3 className="font-display text-base font-extrabold">Order Types</h3>
              <ul className="mt-4 space-y-4">
                {orderTypes.map((t) => (
                  <li key={t.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className={cn('grid h-8 w-8 place-items-center rounded-lg', t.label === 'Pickup' ? 'bg-leaf/10 text-leaf' : 'bg-brand-600/10 text-brand-700')}>
                          {t.label === 'Pickup' ? <ShoppingBag size={15} /> : <Bike size={15} />}
                        </span>
                        {t.label} <span className="text-coal/45">{t.pct}%</span>
                      </span>
                      <span className="font-extrabold tabular-nums">{t.count}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-coal/8">
                      <div className="h-full rounded-full bg-coal" style={{ width: `${t.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-coal/10 pt-4 text-sm">
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-coal/50">Pending</p><p className="font-display text-lg font-extrabold">{pending}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-coal/50">Low stock</p><p className="font-display text-lg font-extrabold">{lowStock.length}</p></div>
              </div>
            </CardBody></Card>

            <Card className="border-0"><CardBody>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold"><Clock3 size={16} className="text-brand-600" /> Recent Activity</h3>
                <Link to="/admin/audit" className="text-xs font-bold text-brand-700 hover:underline">Audit log</Link>
              </div>
              {activity.length === 0 ? (
                <div className="mt-3"><Empty title="Nothing yet" body="Staff actions will appear here." /></div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-700">
                        <Activity size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{a.user} <span className="font-normal text-coal/55">{a.action}</span></span>
                        <span className="block text-xs text-coal/45">{new Date(a.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody></Card>
          </div>
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-4">
          <Card className="border-0"><CardBody>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold">Trending Menus</h3>
              <span className="rounded-full bg-coal/5 px-3 py-1.5 text-[11px] font-bold text-coal/60">This week</span>
            </div>
            {trending.length === 0 ? (
              <div className="mt-3"><Empty title="No sales yet" body="Best sellers will appear here." /></div>
            ) : (
              <ul className="mt-4 space-y-5">
                {trending.map((t) => (
                  <li key={t.name}>
                    {t.item ? (
                      <img src={t.item.image} alt={t.name} loading="lazy" className="h-36 w-full rounded-2xl object-cover" />
                    ) : (
                      <span className="grid h-36 w-full place-items-center rounded-2xl bg-coal/5"><Flame size={22} className="text-coal/30" /></span>
                    )}
                    <p className="mt-2.5 font-display text-[15px] font-extrabold leading-snug">{t.name}</p>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-coal/55">× {t.qty} sold</span>
                      <span className="font-display font-extrabold text-brand-700">{GHS(t.revenue)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody></Card>

          <Card className="border-0"><CardBody>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold"><PackageX size={16} className="text-brand-600" /> Low stock</h3>
              <Link to="/admin/inventory" className="text-xs font-bold text-brand-700 hover:underline">Inventory</Link>
            </div>
            {lowStock.length === 0 ? (
              <div className="mt-3"><Empty title="Stock healthy" body="Low items will show here." /></div>
            ) : (
              <ul className="mt-3 space-y-2">
                {lowStock.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm">
                    <span className="font-semibold">{i.name} <span className="font-normal text-coal/50">· {i.qty}{i.unit}</span></span>
                    <Badge className="bg-red-600 text-white">Low</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody></Card>
        </div>
      </div>
    </div>
  );
}
