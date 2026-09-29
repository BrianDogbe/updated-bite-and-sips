import { useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Banknote, ShoppingBag, Clock3, Bike, Users, PackageX } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { GHS } from '../../../lib/utils';
import { Card, CardBody, Badge, Empty, SectionTitle } from '../../../components/ui/primitives';

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

export default function Dashboard() {
  const { orders, riders, inventory } = useApp();

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = useMemo(() => orders.filter((o) => o.createdAt.slice(0, 10) === todayKey), [orders, todayKey]);
  const revenueToday = todayOrders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const active = orders.filter((o) => ACTIVE.has(o.status)).length;
  const completed = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
  const pickup = orders.filter((o) => o.orderType === 'PICKUP').length;
  const delivery = orders.filter((o) => o.orderType === 'DELIVERY').length;
  const activeDeliveries = orders.filter((o) => o.orderType === 'DELIVERY' && ACTIVE.has(o.status)).length;
  const availableRiders = riders.filter((r) => r.online && !r.busy).length;
  const lowStock = inventory.filter((i) => i.qty <= i.minQty);

  const sales7 = useMemo(() => {
    const days = last7Days();
    return days.map((d) => {
      const dayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === d.key && o.status !== 'CANCELLED');
      return {
        day: d.label,
        revenue: +dayOrders.reduce((s, o) => s + o.total, 0).toFixed(2),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const popular = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      if (o.status === 'CANCELLED') continue;
      for (const it of o.items) {
        const e = m.get(it.itemId) ?? { name: it.name, qty: 0, revenue: 0 };
        e.qty += it.qty;
        e.revenue += it.qty * it.unitPrice;
        m.set(it.itemId, e);
      }
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  const kpis = [
    { label: 'Revenue today', value: GHS(revenueToday), icon: Banknote },
    { label: 'Orders today', value: String(todayOrders.length), icon: ShoppingBag },
    { label: 'Pending', value: String(pending), icon: Clock3 },
    { label: 'Active', value: String(active), icon: ShoppingBag },
    { label: 'Completed', value: String(completed), icon: ShoppingBag },
    { label: 'Cancelled', value: String(cancelled), icon: ShoppingBag },
    { label: 'Pickup / Delivery', value: `${pickup} / ${delivery}`, icon: ShoppingBag },
    { label: 'Active deliveries', value: String(activeDeliveries), icon: Bike },
    { label: 'Available riders', value: String(availableRiders), icon: Users },
    { label: 'Low-stock items', value: String(lowStock.length), icon: PackageX },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Overview" title="Dashboard" sub="Live snapshot of sales, orders and operations." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody className="p-4">
              <div className="flex items-center gap-2 text-coal/50">
                <k.icon className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-wide">{k.label}</p>
              </div>
              <p className="mt-1 font-display text-xl font-extrabold">{k.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="font-display text-base font-extrabold">Sales — last 7 days</h3>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales7} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14121022" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={56} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? GHS(v) : v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#EA580C" fill="#FDBA74" fillOpacity={0.5} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-display text-base font-extrabold">Orders — last 7 days</h3>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales7} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14121022" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={32} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#141210" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="font-display text-base font-extrabold">Popular items</h3>
            {popular.length === 0 ? (
              <div className="mt-3"><Empty title="No sales yet" body="Popular items will appear once orders flow in." /></div>
            ) : (
              <ul className="mt-3 divide-y divide-coal/10">
                {popular.map((p) => (
                  <li key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-semibold">{p.name} <span className="text-coal/50">× {p.qty}</span></span>
                    <span className="font-bold">{GHS(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-display text-base font-extrabold">Low-stock alerts</h3>
            {lowStock.length === 0 ? (
              <div className="mt-3"><Empty title="Stock looks healthy" body="Items below minimum quantity will show here." /></div>
            ) : (
              <ul className="mt-3 space-y-2">
                {lowStock.map((i) => (
                  <li key={i.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm">
                    <span className="font-semibold">{i.name} <span className="text-coal/50">· {i.qty}{i.unit} left</span></span>
                    <Badge className="bg-red-600 text-white">Low stock</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
