import { useMemo, useState } from 'react';
import { Bike } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { GHS, cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Card, CardBody, Badge, Empty, SectionTitle } from '../../../components/ui/primitives';
import { useToast } from '../../../components/ui/toaster';

const ACTIVE = ['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export default function DeliveryPage() {
  const { orders, riders, assignRider } = useApp();
  const toast = useToast();
  const [pick, setPick] = useState<Record<string, string>>({});

  const active = useMemo(() => orders.filter((o) => o.orderType === 'DELIVERY' && ACTIVE.includes(o.status)), [orders]);
  const unassigned = useMemo(
    () => orders.filter((o) => o.orderType === 'DELIVERY' && !o.riderId && !['DELIVERED', 'CANCELLED'].includes(o.status)),
    [orders],
  );
  const riderName = (id?: string) => riders.find((r) => r.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Logistics" title="Delivery" sub={`${active.length} active · ${unassigned.length} unassigned`} />

      <section>
        <h3 className="mb-2 font-display text-base font-extrabold">Active deliveries</h3>
        {active.length === 0 ? (
          <Empty title="No active deliveries" body="Deliveries with an assigned rider in transit will appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {active.map((o) => (
              <Card key={o.id} className="border-0">
                <CardBody className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold">{o.id}</p>
                    <Badge className="bg-brand-600/10 text-brand-700">{o.status}</Badge>
                  </div>
                  <p className="mt-1 text-coal/60">{o.customerName} · {GHS(o.total)}</p>
                  <p className="text-coal/60">{o.deliveryAddress ? `${o.deliveryAddress.street}, ${o.deliveryAddress.city}` : 'No address'}</p>
                  <p className="mt-1 flex items-center gap-1 font-semibold"><Bike className="h-4 w-4" /> {riderName(o.riderId)}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-extrabold">Unassigned orders</h3>
        {unassigned.length === 0 ? (
          <Empty title="All caught up" body="Every delivery order has a rider." />
        ) : (
          <Card className="border-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {unassigned.map((o) => (
                    <tr key={o.id} className="border-b border-coal/5">
                      <td className="px-4 py-3 font-bold">{o.id}</td>
                      <td className="px-4 py-3">{o.customerName}</td>
                      <td className="px-4 py-3"><Badge className="bg-coal/5 text-coal">{o.status}</Badge></td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Assign rider to ${o.id}`}
                          value={pick[o.id] ?? ''}
                          onChange={(e) => setPick((p) => ({ ...p, [o.id]: e.target.value }))}
                          className="h-10 rounded-xl border border-coal/15 bg-white px-2"
                        >
                          <option value="">Select rider</option>
                          {riders.filter((r) => r.online).map((r) => (
                            <option key={r.id} value={r.id}>{r.name}{r.busy ? ' (busy)' : ''}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          disabled={!pick[o.id]}
                          onClick={() => {
                            assignRider(o.id, pick[o.id]);
                            toast({ title: 'Rider assigned', body: `${o.id} → ${riderName(pick[o.id])}`, kind: 'success' });
                          }}
                        >
                          Assign
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-display text-base font-extrabold">Rider availability</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {riders.map((r) => (
            <Card key={r.id} className="border-0">
              <CardBody className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-coal/60">{r.vehicle} · {r.deliveriesToday} today · ★ {r.rating}</p>
                </div>
                <Badge className={cn(r.online ? 'bg-leaf/10 text-leaf' : 'bg-coal/5 text-coal/60', r.busy && 'opacity-70')}>
                  {r.online ? (r.busy ? 'BUSY' : 'ONLINE') : 'OFFLINE'}
                </Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
