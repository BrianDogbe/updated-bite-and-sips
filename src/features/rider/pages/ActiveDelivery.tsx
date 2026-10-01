import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCheck, MapPin, Navigation, Package, Phone, Store } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { useToast } from '../../../components/ui/toaster';
import { Button } from '../../../components/ui/button';
import { Badge, Card, CardBody, Empty } from '../../../components/ui/primitives';
import { GHS, cn } from '../../../lib/utils';
import { RESTAURANT } from '../../../shared/data';
import { useMockRider } from '../RiderLayout';

function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4) || '••••';
  return `•••• ••• ${last4}`;
}

export function ActiveDelivery() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, updateOrderStatus, declineOrder, recordDeliveryStats, user } = useApp();
  const toast = useToast();
  const me = useMockRider();

  const order = orders.find((o) => o.id === id);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Mock route progress — simulated while OUT_FOR_DELIVERY
  const [progress, setProgress] = useState(8);
  useEffect(() => {
    if (order?.status !== 'OUT_FOR_DELIVERY') return;
    const t = setInterval(() => {
      setProgress((p) => Math.min(92, p + 4 + Math.random() * 7));
    }, 1800);
    return () => clearInterval(t);
  }, [order?.status]);

  const steps = useMemo(() => {
    if (!order) return [];
    const s = order.status;
    const doneSet = (statuses: string[]) => statuses.includes(s);
    return [
      { label: 'Accepted', done: doneSet(['RIDER_ASSIGNED', 'ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']) },
      { label: 'Arrived', done: doneSet(['ARRIVED_AT_RESTAURANT', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']) },
      { label: 'Picked up', done: doneSet(['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']) },
      { label: 'On the way', done: doneSet(['OUT_FOR_DELIVERY', 'DELIVERED']) },
      { label: 'Delivered', done: s === 'DELIVERED' },
    ];
  }, [order]);

  if (!order) {
    return (
      <div className="flex flex-col gap-3">
        <Empty title="Delivery not found" body={`No order ${id ?? ''} on your board. It may have been reassigned.`} />
        <Link
          to="/rider"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-coal text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to jobs
        </Link>
      </div>
    );
  }

  const by = user?.name ?? me?.name ?? 'rider';
  const dest = order.deliveryAddress;
  const expectedCode = order.deliveryCode ?? '';
  const otpOk = expectedCode === '' || otp.trim() === expectedCode;

  const arrived = () => {
    updateOrderStatus(order.id, 'ARRIVED_AT_RESTAURANT', by);
    toast({ title: `Arrived at restaurant`, body: 'Show the staff your order number to collect it.', kind: 'success' });
  };

  const pickedUp = () => {
    updateOrderStatus(order.id, 'PICKED_UP', by);
    toast({ title: `${order.id} picked up`, body: 'Start the trip when you leave the restaurant.', kind: 'success' });
  };
  const confirmHandover = () => {
    updateOrderStatus(order.id, 'RIDER_ASSIGNED', by);
    toast({ title: `${order.id} confirmed`, body: 'Head to the restaurant for pickup.', kind: 'success' });
  };
  const startTrip = () => {
    updateOrderStatus(order.id, 'OUT_FOR_DELIVERY', by);
    toast({ title: `${order.id} on the way`, body: 'Customer has been notified.', kind: 'success' });
  };
  const delivered = () => {
    if (!otpOk) {
      setOtpError(
        expectedCode ? 'Code does not match — ask the customer for the delivery code.' : 'Enter the delivery code.',
      );
      return;
    }
    setOtpError(null);
    updateOrderStatus(order.id, 'DELIVERED', by);
    if (me) recordDeliveryStats(me.id, order.deliveryFee);
    toast({ title: `${order.id} delivered`, body: 'Nice work! Earnings updated.', kind: 'success' });
    navigate('/rider/history');
  };
  const decline = () => {
    declineOrder(order.id);
    toast({ title: `${order.id} declined`, body: 'Released back to the kitchen.', kind: 'info' });
    navigate('/rider');
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/rider"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-coal/60"
        aria-label="Back to jobs"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Jobs
      </Link>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Active delivery</p>
        <h1 className="font-display text-3xl font-extrabold">#{order.id}</h1>
        <Badge className="mt-1 bg-brand-600/10 text-brand-700">{order.status.replaceAll('_', ' ')}</Badge>
      </div>

      {/* Restaurant block */}
      <Card>
        <CardBody>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coal/50">
            <Store className="h-4 w-4" aria-hidden /> Pickup — restaurant
          </p>
          <p className="mt-1 font-extrabold">{RESTAURANT.name}</p>
          <p className="text-sm text-coal/70">{RESTAURANT.address}</p>
          <a
            href={`tel:${RESTAURANT.phone.replace(/\s/g, '')}`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden /> {RESTAURANT.phone}
          </a>
          <a
            href={mapsLink(RESTAURANT.lat, RESTAURANT.lng)}
            target="_blank"
            rel="noreferrer"
            aria-label="Navigate to restaurant in Google Maps"
            className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-coal text-sm font-bold text-white"
          >
            <Navigation className="h-4 w-4" aria-hidden /> Navigate to restaurant
          </a>
        </CardBody>
      </Card>

      {/* Order items */}
      <Card>
        <CardBody>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coal/50">
            <Package className="h-4 w-4" aria-hidden /> Order items · {GHS(order.total)}
          </p>
          <ul className="mt-2 space-y-2">
            {order.items.map((it, i) => (
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
                {it.instructions && <p className="ml-9 text-xs font-semibold italic text-amber-800">“{it.instructions}”</p>}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Customer contact */}
      <Card>
        <CardBody>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coal/50">
            <Phone className="h-4 w-4" aria-hidden /> Customer
          </p>
          <p className="mt-1 font-extrabold">{order.customerName}</p>
          <p className="text-sm text-coal/60 tabular-nums">{maskPhone(order.customerPhone)}</p>
          <a
            href={`tel:${order.customerPhone.replace(/\s/g, '')}`}
            aria-label={`Call customer ${order.customerName}`}
            className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-coal/15 bg-white text-sm font-bold"
          >
            <Phone className="h-4 w-4" aria-hidden /> Call customer
          </a>
          <p className="mt-2 text-[11px] text-coal/50">Number masked in production — calls route via a backend proxy.</p>
          {dest && (
            <div className="mt-3 rounded-xl bg-coal/5 p-3 text-sm">
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span>
                  {dest.street}
                  {dest.apartment ? `, ${dest.apartment}` : ''}, {dest.city}
                  {dest.landmark ? ` (${dest.landmark})` : ''}
                </span>
              </p>
              {dest.instructions && <p className="mt-1 font-semibold">Delivery instructions: {dest.instructions}</p>}
              <a
                href={mapsLink(dest.lat, dest.lng)}
                target="_blank"
                rel="noreferrer"
                aria-label="Navigate to customer in Google Maps"
                className="mt-2 inline-flex min-h-[48px] items-center gap-1.5 text-sm font-bold text-brand-700"
              >
                <Navigation className="h-4 w-4" aria-hidden /> Navigate to customer
              </a>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pickup / trip actions */}
      {order.status === 'READY_FOR_PICKUP' && order.riderId === me?.id && (
        <>
          <Button size="lg" onClick={confirmHandover} aria-label={`Accept and confirm delivery ${order.id}`} className="min-h-[60px] w-full text-lg">
            <CheckCheck className="h-5 w-5" aria-hidden /> Accept & confirm
          </Button>
          <button
            onClick={decline}
            aria-label={`Decline delivery ${order.id}`}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-coal/15 bg-white text-sm font-bold text-coal/70"
          >
            Decline order
          </button>
        </>
      )}
      {(order.status === 'READY_FOR_PICKUP' && order.riderId !== me?.id) && (
        <Button size="lg" onClick={pickedUp} aria-label={`Confirm pickup for order ${order.id}`} className="min-h-[60px] w-full text-lg">
          <CheckCheck className="h-5 w-5" aria-hidden /> I’ve picked up
        </Button>
      )}
      {order.status === 'RIDER_ASSIGNED' && (
        <Button size="lg" onClick={arrived} aria-label={`Confirm arrival at restaurant for order ${order.id}`} className="min-h-[60px] w-full text-lg">
          <CheckCheck className="h-5 w-5" aria-hidden /> I’ve arrived
        </Button>
      )}
      {order.status === 'ARRIVED_AT_RESTAURANT' && (
        <Button size="lg" onClick={pickedUp} aria-label={`Confirm pickup for order ${order.id}`} className="min-h-[60px] w-full text-lg">
          <CheckCheck className="h-5 w-5" aria-hidden /> I’ve picked up
        </Button>
      )}
      {order.status === 'PICKED_UP' && (
        <Button size="lg" variant="leaf" onClick={startTrip} aria-label={`Start delivery trip for order ${order.id}`} className="min-h-[60px] w-full text-lg">
          <Navigation className="h-5 w-5" aria-hidden /> Start delivery trip
        </Button>
      )}

      {/* Mock route progress */}
      {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'PICKED_UP') && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-coal/50">
              <span>Route progress (mock)</span>
              <span className="tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-coal/10" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Mock delivery progress">
              <motion.div
                className={cn('h-full rounded-full bg-leaf')}
                animate={{ width: `${order.status === 'OUT_FOR_DELIVERY' ? progress : 4}%` }}
                transition={{ ease: 'easeOut', duration: 0.8 }}
              />
            </div>
            <ol className="mt-3 flex justify-between gap-1">
              {steps.map((s) => (
                <li key={s.label} className={cn('text-[10px] font-extrabold uppercase tracking-wide', s.done ? 'text-leaf' : 'text-coal/35')}>
                  ● {s.label}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] text-coal/50">
              Mock GPS — connect navigator.geolocation + POST /api/rider/location (see services/maps.ts).
            </p>
          </CardBody>
        </Card>
      )}

      {/* OTP + delivered */}
      {(order.status === 'OUT_FOR_DELIVERY' || order.status === 'PICKED_UP') && (
        <Card className="border-brand-600/30">
          <CardBody>
            <p className="text-xs font-bold uppercase tracking-widest text-coal/50">Delivery code (OTP)</p>
            {expectedCode ? (
              <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em]" aria-label={`Delivery code ${expectedCode}`}>
                {expectedCode}
              </p>
            ) : (
              <p className="mt-1 text-sm text-coal/60">No code on this order — confirm handover with the customer.</p>
            )}
            <label htmlFor="otp" className="mt-3 block text-sm font-bold">
              Ask the customer for the code, then enter it:
            </label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setOtpError(null);
              }}
              placeholder="Enter 4-digit code"
              aria-invalid={otpError ? true : undefined}
              aria-describedby={otpError ? 'otp-error' : undefined}
              className="mt-1 h-14 w-full rounded-xl border border-coal/15 bg-white px-4 text-center font-display text-2xl font-extrabold tracking-[0.3em] outline-none placeholder:text-sm placeholder:font-body placeholder:font-normal placeholder:tracking-normal focus:border-brand-500"
            />
            {otpError && (
              <p id="otp-error" role="alert" className="mt-1 text-xs font-bold text-red-600">
                {otpError}
              </p>
            )}
            <Button
              size="lg"
              variant="leaf"
              onClick={delivered}
              aria-label={`Mark order ${order.id} as delivered`}
              className="mt-3 min-h-[60px] w-full text-lg"
            >
              Mark as delivered
            </Button>
          </CardBody>
        </Card>
      )}

      {order.status === 'DELIVERED' && (
        <Card>
          <CardBody className="text-center">
            <CheckCheck className="mx-auto h-8 w-8 text-leaf" aria-hidden />
            <p className="mt-1 font-display text-xl font-extrabold">Delivered 🎉</p>
            <Link
              to="/rider"
              className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-coal text-sm font-bold text-white"
            >
              Back to jobs
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default ActiveDelivery;
