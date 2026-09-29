import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bike, Check, Loader2, MapPin, ShoppingBag, Store, Tag } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { RESTAURANT } from '../../../shared/data';
import { GHS, cn, formatTime12h, hours12h, uid } from '../../../lib/utils';
import { initializePayment, verifyPayment, PAYMENT_LABELS } from '../../../shared/services/payments';
import { getCurrentPositionMock } from '../../../shared/services/maps';
import { useToast } from '../../../components/ui/toaster';
import { Badge, Card, CardBody, Empty, Input, SectionTitle } from '../../../components/ui/primitives';
import { Button } from '../../../components/ui/button';
import QtyInput from '../../../components/common/QtyInput';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import type { Address, OrderType, PaymentMethod } from '../../../shared/types';

const STEPS = ['Cart', 'Type', 'Location', 'Time', 'Payment', 'Confirm'];

const PAYMENT_OPTIONS: PaymentMethod[] =
  ['MOMO_MTN', 'MOMO_VODAFONE', 'MOMO_AIRTELTIGO', 'CARD', 'CASH_ON_DELIVERY', 'CASH_ON_PICKUP'];

/** Build a Date for today at the given "HH:MM" time. */
function todayAt(time: string): Date {
  const [hh, mm] = time.split(':').map(Number);
  const dt = new Date();
  dt.setHours(hh, mm, 0, 0);
  return dt;
}

export default function CheckoutPage() {
  const { cart, updateQty, removeLine, activeAddress, addresses, setActiveAddress, addAddress, calcTotals, applyPromo, placeOrder, user } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [pickupMode, setPickupMode] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  const [schedTime, setSchedTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO_MTN');
  const [promoInput, setPromoInput] = useState('');
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fLabel, setFLabel] = useState('Home');
  const [fStreet, setFStreet] = useState('');
  const [fCity, setFCity] = useState('Tema');
  const [fLandmark, setFLandmark] = useState('');

  // Always bring the user back to the process (progress + current step)
  // whenever Continue moves them forward or blocks on an error.
  const processRef = useRef<HTMLDivElement>(null);
  const scrollToProcess = () => {
    processRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    scrollToProcess();
  }, [step]);

  const totals = calcTotals(orderType);
  const effectivePayment: PaymentMethod = useMemo(() => {
    if (orderType === 'PICKUP' && paymentMethod === 'CASH_ON_DELIVERY') return 'CASH_ON_PICKUP';
    if (orderType === 'DELIVERY' && paymentMethod === 'CASH_ON_PICKUP') return 'CASH_ON_DELIVERY';
    return paymentMethod;
  }, [orderType, paymentMethod]);

  const timeError = useMemo(() => {
    if (pickupMode === 'ASAP') return null;
    if (!schedTime) return 'Choose a time.';
    const dt = todayAt(schedTime);
    if (Number.isNaN(dt.getTime())) return 'Invalid time.';
    if (dt.getTime() < Date.now() + 20 * 60_000) return 'Scheduled time must be at least 20 minutes from now.';
    const h = dt.getHours() + dt.getMinutes() / 60;
    if (h < RESTAURANT.openHour || h >= RESTAURANT.closeHour)
      return `We're open ${hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)}.`;
    return null;
  }, [pickupMode, schedTime]);

  const canNext = (): boolean => {
    if (step === 0) return cart.length > 0;
    if (step === 2 && orderType === 'DELIVERY') return !!activeAddress;
    if (step === 3) return timeError === null;
    return true;
  };

  const next = () => {
    setError(null);
    if (!canNext()) {
      setError(step === 0 ? 'Your cart is empty.' : step === 2 ? 'Select or add a delivery address.' : (timeError ?? 'Check your details.'));
      scrollToProcess();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handlePromo = () => {
    const code = promoInput.trim();
    if (!code) return;
    const { discount, deliveryFee } = applyPromo(code, totals.subtotal, totals.deliveryFee);
    if (discount > 0 || deliveryFee < totals.deliveryFee) {
      setPromoMsg(`Code ${code.toUpperCase()} applied.`);
      toast({ title: 'Promo applied', body: code.toUpperCase(), kind: 'success' });
    } else {
      setPromoMsg('That code is not valid.');
    }
  };

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPositionMock();
      const a: Address = {
        id: uid('addr'), label: 'Current location', street: 'Pinned location (mock GPS)',
        city: 'Tema', lat: pos.lat, lng: pos.lng, isDefault: false,
      };
      addAddress(a);
      toast({ title: 'Location added', body: 'Mock GPS position saved.', kind: 'success' });
    } catch {
      setError('Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleAddAddress = () => {
    if (!fStreet.trim()) {
      setError('Enter a street address.');
      return;
    }
    addAddress({
      id: uid('addr'), label: fLabel.trim() || 'Home', street: fStreet.trim(), city: fCity.trim() || 'Tema',
      landmark: fLandmark.trim() || undefined,
      lat: RESTAURANT.lat + (Math.random() - 0.5) * 0.04,
      lng: RESTAURANT.lng + (Math.random() - 0.5) * 0.04,
    });
    setFStreet('');
    setFLandmark('');
    setError(null);
    toast({ title: 'Address saved', kind: 'success' });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || placing) return;
    if (orderType === 'DELIVERY' && !activeAddress) {
      setError('Select a delivery address first.');
      setStep(2);
      return;
    }
    if (timeError) {
      setError(timeError);
      setStep(3);
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const isCash = effectivePayment === 'CASH_ON_DELIVERY' || effectivePayment === 'CASH_ON_PICKUP';
      let paymentStatus: 'PAID' | 'PENDING' | 'FAILED' = 'PENDING';
      if (!isCash) {
        const intent = await initializePayment(totals.total, effectivePayment);
        paymentStatus = await verifyPayment(intent.reference);
        if (paymentStatus !== 'PAID') throw new Error('Payment failed. Please try another method.');
      }
      const pickupISO = (() => {
        if (pickupMode === 'ASAP') return new Date(Date.now() + 25 * 60_000).toISOString();
        return todayAt(schedTime).toISOString();
      })();
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const order = placeOrder({
        customerId: user?.id ?? 'guest',
        customerName: user?.name ?? 'Guest',
        customerPhone: user?.phone ?? '+233 24 000 0000',
        items: cart.map((l) => ({
          itemId: l.itemId, name: l.name, qty: l.qty, unitPrice: l.unitPrice,
          modifiers: l.modifiers, instructions: l.instructions,
        })),
        orderType,
        status: 'PENDING',
        paymentStatus,
        paymentMethod: effectivePayment,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        serviceFee: totals.serviceFee,
        discount: totals.discount,
        total: totals.total,
        pickupTime: pickupISO,
        pickupMode,
        deliveryAddress: orderType === 'DELIVERY' ? (activeAddress ?? undefined) : undefined,
        deliveryCode: otp,
      });
      toast({ title: 'Order placed', body: `Order ${order.id} · OTP ${otp}`, kind: 'success' });
      navigate(`/track/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Menu', to: '/menu' }, { label: 'Checkout' }]} />
      <SectionTitle kicker="Checkout" title="Almost there" sub="Six quick steps to hot food." />
      <div ref={processRef} className="scroll-mt-24">
      {/* Progress */}
      <ol aria-label="Checkout progress" className="mt-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold',
                i < step ? 'bg-leaf text-white' : i === step ? 'bg-coal text-white' : 'bg-coal/8 text-coal/50',
              )}
            >
              {i < step ? <Check size={13} /> : <span>{i + 1}</span>} {s}
            </button>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="text-coal/25">›</span>}
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label={`Step ${step + 1}: ${STEPS[step]}`}
          className="min-h-[320px]"
        >
          {step === 0 && (
            <Card><CardBody>
              <h2 className="font-display text-lg font-extrabold">Review cart</h2>
              {cart.length === 0 ? (
                <div className="mt-3"><Empty title="Cart is empty" body="Add dishes from the menu first." /></div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {cart.map((l) => (
                    <li key={l.key} className="flex items-center gap-3 rounded-xl border border-coal/10 p-3">
                      <img src={l.image} alt="" aria-hidden="true" className="h-12 w-12 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{l.name}</p>
                        <p className="text-xs text-coal/55">{GHS(l.unitPrice)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <QtyInput id={`checkout-${l.key}`} qty={l.qty} onChange={(n) => updateQty(l.key, n)} label={l.name} />
                      </div>
                      <button aria-label={`Remove ${l.name}`} onClick={() => removeLine(l.key)} className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody></Card>
          )}

          {step === 1 && (
            <Card><CardBody>
              <h2 className="font-display text-lg font-extrabold">Pickup or delivery?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Order type">
                {([
                  { v: 'PICKUP' as OrderType, icon: Store, t: 'Pickup', d: 'Free · ready in ~20 min at Tema C7' },
                  { v: 'DELIVERY' as OrderType, icon: Bike, t: 'Delivery', d: '25–45 min · fee by distance' },
                ]).map((o) => (
                  <button
                    key={o.v}
                    role="radio"
                    aria-checked={orderType === o.v}
                    onClick={() => setOrderType(o.v)}
                    className={cn('flex items-start gap-3 rounded-2xl border-2 p-4 text-left', orderType === o.v ? 'border-brand-600 bg-brand-50' : 'border-coal/10 hover:border-coal/25')}
                  >
                    <o.icon size={20} className="mt-0.5 text-brand-700" />
                    <span><span className="block font-bold">{o.t}</span><span className="text-xs text-coal/60">{o.d}</span></span>
                  </button>
                ))}
              </div>
            </CardBody></Card>
          )}

          {step === 2 && (
            <Card><CardBody>
              <h2 className="font-display text-lg font-extrabold">
                {orderType === 'DELIVERY' ? 'Where should we deliver?' : 'Pickup point'}
              </h2>
              {orderType === 'PICKUP' ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-cream p-4 text-sm">
                  <Store size={17} className="mt-0.5 shrink-0 text-brand-700" />
                  Pick up at {RESTAURANT.address}. Show your order ID at the counter.
                </p>
              ) : (
                <>
                  <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Delivery addresses">
                    {addresses.map((a) => (
                      <li key={a.id}>
                        <button
                          role="radio"
                          aria-checked={activeAddress?.id === a.id}
                          onClick={() => setActiveAddress(a)}
                          className={cn('flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-sm', activeAddress?.id === a.id ? 'border-brand-600 bg-brand-50' : 'border-coal/10')}
                        >
                          <MapPin size={17} className="mt-0.5 shrink-0 text-brand-700" />
                          <span><span className="font-bold">{a.label} — {a.street}</span><br /><span className="text-coal/60">{a.city}{a.landmark ? ` · ${a.landmark}` : ''}</span></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" onClick={handleUseLocation} disabled={locating} className="mt-3">
                    {locating ? <Loader2 className="animate-spin" /> : <MapPin />} Use My Current Location
                  </Button>
                  <div className="mt-5 border-t border-coal/10 pt-4">
                    <h3 className="text-sm font-bold">Add new address</h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input aria-label="Address label" value={fLabel} onChange={(e) => setFLabel(e.target.value)} placeholder="Label (Home)" />
                      <Input aria-label="City" value={fCity} onChange={(e) => setFCity(e.target.value)} placeholder="City" />
                      <Input aria-label="Street address" value={fStreet} onChange={(e) => setFStreet(e.target.value)} placeholder="Street address" className="sm:col-span-2" />
                      <Input aria-label="Landmark" value={fLandmark} onChange={(e) => setFLandmark(e.target.value)} placeholder="Landmark (optional)" className="sm:col-span-2" />
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleAddAddress} className="mt-2">Save address</Button>
                  </div>
                </>
              )}
            </CardBody></Card>
          )}

          {step === 3 && (
            <Card><CardBody>
              <h2 className="font-display text-lg font-extrabold">When?</h2>
              <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Timing">
                {(['ASAP', 'SCHEDULED'] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={pickupMode === m} onClick={() => setPickupMode(m)}
                    className={cn('rounded-full px-5 py-2 text-sm font-bold', pickupMode === m ? 'bg-coal text-white' : 'bg-coal/5 hover:bg-coal/10')}>
                    {m === 'ASAP' ? (orderType === 'PICKUP' ? 'ASAP pickup' : 'ASAP delivery') : 'Schedule'}
                  </button>
                ))}
              </div>
              {pickupMode === 'SCHEDULED' && (
                <div className="mt-4">
                  <label htmlFor="sched-time" className="text-xs font-bold uppercase tracking-wide">Time ({hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)})</label>
                  <Input id="sched-time" type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="mt-1" />
                  {timeError && <p role="alert" className="mt-1.5 text-sm font-semibold text-red-600">{timeError}</p>}
                </div>
              )}
            </CardBody></Card>
          )}

          {step === 4 && (
            <Card><CardBody>
              <h2 className="font-display text-lg font-extrabold">Payment</h2>
              <div className="mt-4 space-y-2" role="radiogroup" aria-label="Payment method">
                {PAYMENT_OPTIONS.filter((m) =>
                  orderType === 'PICKUP' ? m !== 'CASH_ON_DELIVERY' : m !== 'CASH_ON_PICKUP').map((m) => (
                  <label key={m} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 text-sm', paymentMethod === m ? 'border-brand-600 bg-brand-50' : 'border-coal/10')}>
                    <input type="radio" name="pay" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} className="h-4 w-4 accent-orange-600" />
                    <span className="font-semibold">{PAYMENT_LABELS[m]}</span>
                  </label>
                ))}
              </div>
              <div className="mt-5 border-t border-coal/10 pt-4">
                <label htmlFor="promo" className="flex items-center gap-1.5 text-sm font-bold"><Tag size={15} /> Promo code</label>
                <div className="mt-2 flex gap-2">
                  <Input id="promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="WELCOME15" className="uppercase" />
                  <Button variant="secondary" onClick={handlePromo}>Apply</Button>
                </div>
                {promoMsg && <p className="mt-1.5 text-xs font-semibold text-coal/60">{promoMsg}</p>}
              </div>
            </CardBody></Card>
          )}

          {step === 5 && (
            <Card><CardBody>
              <h2 className="font-display text-lg font-extrabold">Confirm order</h2>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-coal/60">Type</dt><dd className="font-bold">{orderType} · {pickupMode}</dd></div>
                {pickupMode === 'SCHEDULED' && schedTime && !timeError && (
                  <div className="flex justify-between"><dt className="text-coal/60">Scheduled for</dt><dd className="font-bold">{formatTime12h(todayAt(schedTime))}</dd></div>
                )}
                {orderType === 'DELIVERY' && <div className="flex justify-between"><dt className="text-coal/60">Deliver to</dt><dd className="font-bold">{activeAddress?.label} — {activeAddress?.street}</dd></div>}
                <div className="flex justify-between"><dt className="text-coal/60">Payment</dt><dd className="font-bold">{PAYMENT_LABELS[effectivePayment]}</dd></div>
                <div className="flex justify-between"><dt className="text-coal/60">Items</dt><dd className="font-bold">{cart.reduce((s, l) => s + l.qty, 0)}</dd></div>
              </dl>
              <Button size="lg" onClick={handlePlaceOrder} disabled={placing || cart.length === 0} className="mt-5 w-full">
                {placing ? <Loader2 className="animate-spin" /> : <ShoppingBag />} {placing ? 'Placing order…' : `Pay ${GHS(totals.total)} & place order`}
              </Button>
              <p className="mt-2 text-center text-xs text-coal/50">Mock payment — no real money moves. You’ll get an OTP for handover.</p>
            </CardBody></Card>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 rounded-xl border border-coal/15 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-40">
              <ArrowLeft size={15} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canNext()}>Continue <ArrowRight /></Button>
            ) : (
              <Link to="/menu" className="text-sm font-bold text-coal/50 hover:text-coal">Keep shopping</Link>
            )}
          </div>
        </motion.section>

        {/* Summary */}
        <aside aria-label="Order summary" className="h-fit lg:sticky lg:top-24">
          <Card><CardBody>
            <h2 className="font-display font-extrabold">Summary</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-coal/60">Subtotal</dt><dd className="font-bold">{GHS(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-coal/60">Delivery {totals.km > 0 && `(${totals.km.toFixed(1)} km)`}</dt><dd className="font-bold">{orderType === 'PICKUP' ? 'Free' : GHS(totals.deliveryFee)}</dd></div>
              <div className="flex justify-between"><dt className="text-coal/60">Service fee</dt><dd className="font-bold">{GHS(totals.serviceFee)}</dd></div>
              {totals.discount > 0 && <div className="flex justify-between text-leaf"><dt>Discount</dt><dd className="font-bold">−{GHS(totals.discount)}</dd></div>}
              <div className="flex justify-between border-t border-coal/10 pt-2 font-display text-lg font-extrabold"><dt>Total</dt><dd>{GHS(totals.total)}</dd></div>
            </dl>
            {totals.discount === 0 && (
              <p className="mt-2 rounded-xl bg-cream p-2.5 text-xs text-coal/60"><Badge className="mr-1 bg-coal text-white">Tip</Badge>Try WELCOME15 at the Payment step.</p>
            )}
          </CardBody></Card>
        </aside>
      </div>
    </main>
  );
}
