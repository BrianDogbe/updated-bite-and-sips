import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, MapPin, Navigation, Phone, Store } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { useToast } from '../../../components/ui/toaster';
import { Button } from '../../../components/ui/button';
import { Badge, Card, CardBody, Empty } from '../../../components/ui/primitives';
import { GHS } from '../../../lib/utils';
import { RESTAURANT } from '../../../shared/data';
import { useMockRider } from '../RiderLayout';

/** Stable mock distance derived from the order id (no GPS in demo). */
function mockKm(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (1.2 + (h % 40) / 10).toFixed(1);
}

function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function Jobs() {
  const { orders, assignRider, declineOrder, updateOrderStatus, refreshOrders, user } = useApp();
  const toast = useToast();
  const me = useMockRider();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Always re-pull on open — assignments made in the kitchen land here
  // even if a realtime event was missed.
  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  if (!me) {
    return <Empty title="No riders available" body="Ask dispatch to register a rider account, then try again." />;
  }

  const available = orders.filter((o) => o.status === 'READY_FOR_PICKUP' && !o.riderId && !dismissed.has(o.id));
  const mine = orders.filter(
    (o) =>
      o.riderId === me.id &&
      (o.status === 'READY_FOR_PICKUP' || o.status === 'RIDER_ASSIGNED' || o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY'),
  );

  const accept = (orderId: string) => {
    assignRider(orderId, me.id);
    updateOrderStatus(orderId, 'RIDER_ASSIGNED', user?.name ?? me.name);
    toast({ title: `Delivery ${orderId} accepted`, body: 'Head to the restaurant for pickup.', kind: 'success' });
  };

  // Confirm an order the kitchen handed to me (READY → RIDER_ASSIGNED).
  const confirm = (orderId: string) => {
    updateOrderStatus(orderId, 'RIDER_ASSIGNED', user?.name ?? (me?.name ?? 'rider'));
    toast({ title: `Delivery ${orderId} confirmed`, body: 'The customer and kitchen have been notified.', kind: 'success' });
  };

  // Decline before pickup: assigned orders go back to READY for the kitchen;
  // unassigned ones just hide from my list.
  const decline = (orderId: string, assigned: boolean) => {
    if (assigned) {
      declineOrder(orderId);
      toast({ title: `Delivery ${orderId} declined`, body: 'Released back to the kitchen.', kind: 'info' });
    } else {
      setDismissed((d) => new Set(d).add(orderId));
      toast({ title: `Delivery ${orderId} declined`, body: 'It stays available for other riders.', kind: 'info' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Available jobs</p>
        <h1 className="mt-0.5 font-display text-2xl font-extrabold">Deliveries near you</h1>
        {!me.online && (
          <p className="mt-1 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900" role="status">
            You’re offline — go online from the header to receive new jobs.
          </p>
        )}
      </div>

      {available.length === 0 ? (
        <Empty title="No available deliveries" body="New READY orders will appear here automatically. Stay online!" />
      ) : (
        <ul className="flex flex-col gap-3">
          {available.map((o) => (
            <li key={o.id}>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-xl font-extrabold">#{o.id}</p>
                    <Badge className="bg-leaf/15 text-leaf">Ready for pickup</Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-start gap-2">
                      <Store className="mt-0.5 h-4 w-4 shrink-0 text-coal/50" aria-hidden />
                      <span>
                        <span className="font-bold">Pickup:</span> {RESTAURANT.address}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      <span>
                        <span className="font-bold">Drop-off:</span>{' '}
                        {o.deliveryAddress
                          ? `${o.deliveryAddress.street}, ${o.deliveryAddress.city}`
                          : 'Customer address on file'}
                      </span>
                    </p>
                    <p className="text-xs font-semibold text-coal/60">
                      ≈ {mockKm(o.id)} km · {o.items.reduce((s, i) => s + i.qty, 0)} items · {GHS(o.total)}
                      {o.deliveryAddress?.instructions ? ` · Note: ${o.deliveryAddress.instructions}` : ''}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      size="lg"
                      onClick={() => accept(o.id)}
                      disabled={!me.online}
                      aria-label={`Accept delivery ${o.id}`}
                      className="min-h-[56px] w-full text-base"
                    >
                      <Bike className="h-5 w-5" aria-hidden /> Accept delivery
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => decline(o.id, false)}
                        aria-label={`Decline delivery ${o.id}`}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-coal/15 bg-white text-sm font-bold text-coal/70"
                      >
                        Decline
                      </button>
                      <a
                        href={mapsLink(RESTAURANT.lat, RESTAURANT.lng)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Navigate to restaurant for order ${o.id}`}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-coal/15 bg-white text-sm font-bold"
                      >
                        <Navigation className="h-4 w-4" aria-hidden /> Preview pickup route
                      </a>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h2 className="font-display text-lg font-extrabold">My accepted jobs ({mine.length})</h2>
        {mine.length === 0 ? (
          <div className="mt-2">
            <Empty title="No accepted jobs yet" body="Accept a delivery above to get moving." />
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {mine.map((o) => (
              <li key={o.id}>
                <Card className="border-brand-600/30">
                  <CardBody>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-xl font-extrabold">#{o.id}</p>
                      <Badge className="bg-brand-600/10 text-brand-700">{o.status.replaceAll('_', ' ')}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-coal/70">
                      <Phone className="h-3.5 w-3.5" aria-hidden /> {o.customerName} · {GHS(o.total)}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {o.status === 'READY_FOR_PICKUP' ? (
                        <>
                          <Button
                            size="lg"
                            onClick={() => confirm(o.id)}
                            disabled={!me.online}
                            aria-label={`Accept and confirm delivery ${o.id}`}
                            className="col-span-2 min-h-[56px] w-full text-base"
                          >
                            <Bike className="h-5 w-5" aria-hidden /> Accept & confirm
                          </Button>
                          <button
                            onClick={() => decline(o.id, true)}
                            aria-label={`Decline delivery ${o.id}`}
                            className="col-span-2 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-coal/15 bg-white text-sm font-bold text-coal/70"
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/rider/active/${o.id}`}
                          aria-label={`Open active delivery ${o.id}`}
                          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-coal text-sm font-bold text-white"
                        >
                          Open delivery
                        </Link>
                      )}
                      <a
                        href={mapsLink(
                          o.deliveryAddress?.lat ?? RESTAURANT.lat,
                          o.deliveryAddress?.lng ?? RESTAURANT.lng,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Navigate to customer for order ${o.id}`}
                        className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl border border-coal/15 bg-white text-sm font-bold"
                      >
                        <Navigation className="h-4 w-4" aria-hidden /> Navigate
                      </a>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Jobs;
