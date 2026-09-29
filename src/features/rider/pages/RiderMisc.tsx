import { Link } from 'react-router-dom';
import { ArrowLeft, Bike, LogOut, MapPin, Package, Star, Wallet } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { Badge, Card, CardBody, Empty } from '../../../components/ui/primitives';
import { GHS, cn, format12h } from '../../../lib/utils';
import { useMockRider } from '../RiderLayout';

// ── History ──────────────────────────────────────────────

export function HistoryPage() {
  const { orders } = useApp();
  const me = useMockRider();

  if (!me) {
    return <Empty title="No riders available" body="Ask dispatch to register a rider account, then try again." />;
  }

  const mine = orders
    .filter((o) => o.riderId === me.id)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">History</p>
        <h1 className="mt-0.5 font-display text-2xl font-extrabold">My deliveries</h1>
        <p className="text-sm text-coal/60">{mine.length} job{mines(mine.length)} · {me.name}</p>
      </div>

      {mine.length === 0 ? (
        <Empty title="No delivery history yet" body="Accepted jobs will show up here once you complete them." />
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((o) => (
            <li key={o.id}>
              <Link to={`/rider/active/${o.id}`} aria-label={`View delivery ${o.id}`}>
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-xl font-extrabold">#{o.id}</p>
                      <Badge
                        className={cn(
                          o.status === 'DELIVERED'
                            ? 'bg-leaf/15 text-leaf'
                            : 'bg-brand-600/10 text-brand-700',
                        )}
                      >
                        {o.status.replaceAll('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-coal/70">
                      <Package className="h-3.5 w-3.5" aria-hidden />
                      {o.items.reduce((s, i) => s + i.qty, 0)} items · {o.customerName} · {GHS(o.total)}
                    </p>
                    {o.deliveryAddress && (
                      <p className="mt-0.5 flex items-start gap-1.5 text-xs text-coal/60">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        {o.deliveryAddress.street}, {o.deliveryAddress.city}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] font-semibold text-coal/40">
                      Updated {format12h(o.updatedAt)}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function mines(n: number): string {
  return n === 1 ? '' : 's';
}

// ── Earnings ─────────────────────────────────────────────

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return d.getTime() >= weekAgo && d.getTime() <= now.getTime();
}

export function EarningsPage() {
  const { orders } = useApp();
  const me = useMockRider();

  if (!me) {
    return <Empty title="No riders available" body="Ask dispatch to register a rider account, then try again." />;
  }

  const delivered = orders.filter((o) => o.riderId === me.id && o.status === 'DELIVERED');
  const todayCount = delivered.filter((o) => isToday(o.updatedAt)).length;
  const weekCount = delivered.filter((o) => isThisWeek(o.updatedAt)).length;
  const FEE_PER_DROP = 12; // GH₵ mock per-drop payout
  const todayEarn = me.earningsToday;
  const weekEarn = me.earningsToday + weekCount * FEE_PER_DROP;

  const cards = [
    { label: 'Today', earn: todayEarn, trips: todayCount, sub: 'deliveries completed today' },
    { label: 'This week', earn: weekEarn, trips: weekCount, sub: 'deliveries in last 7 days' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Earnings</p>
        <h1 className="mt-0.5 font-display text-2xl font-extrabold">Payout summary</h1>
        <p className="text-sm text-coal/60">Mock payouts · GH₵{FEE_PER_DROP} per drop + base</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardBody>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coal/50">
                <Wallet className="h-4 w-4" aria-hidden /> {c.label}
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">{GHS(c.earn)}</p>
              <p className="mt-0.5 text-sm font-semibold text-coal/60">
                {c.trips} {c.sub}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-coal/50">
            <Bike className="h-4 w-4" aria-hidden /> Lifetime with Bite &amp; Sips
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{delivered.length} deliveries</p>
          <p className="flex items-center gap-1 text-sm font-semibold text-coal/60">
            <Star className="h-4 w-4 text-gold" aria-hidden /> {me.rating.toFixed(1)} rider rating
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Profile ──────────────────────────────────────────────

export function ProfilePage() {
  const { logout, setRiderOnline } = useApp();
  const me = useMockRider();

  if (!me) {
    return <Empty title="No riders available" body="Ask dispatch to register a rider account, then try again." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Profile</p>
        <h1 className="mt-0.5 font-display text-2xl font-extrabold">{me.name}</h1>
      </div>

      <Card>
        <CardBody className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-coal font-display text-2xl font-extrabold text-white" aria-hidden>
            {me.name.charAt(0)}
          </div>
          <div>
            <p className="font-extrabold">{me.name}</p>
            <p className="text-sm text-coal/60">{me.phone}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-bold">
              <Star className="h-4 w-4 text-gold" aria-hidden /> {me.rating.toFixed(1)}
              <span className="font-semibold text-coal/50">· {me.deliveriesToday} trips today</span>
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-coal/60">Vehicle</span>
            <span className="font-extrabold">{me.vehicle}{me.plate ? ` · ${me.plate}` : ''}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-coal/60">Availability</span>
            <button
              type="button"
              role="switch"
              aria-checked={me.online}
              aria-label={me.online ? 'Go offline' : 'Go online'}
              onClick={() => setRiderOnline(me.id, !me.online)}
              className={cn(
                'inline-flex min-h-[48px] items-center gap-2 rounded-full px-4 text-sm font-extrabold',
                me.online ? 'bg-leaf/15 text-leaf' : 'bg-coal/10 text-coal/60',
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', me.online ? 'bg-leaf' : 'bg-coal/30')} aria-hidden />
              {me.online ? 'Online' : 'Offline'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-coal/60">Status</span>
            <Badge className={me.busy ? 'bg-amber-100 text-amber-900' : 'bg-leaf/15 text-leaf'}>
              {me.busy ? 'On a trip' : 'Available'}
            </Badge>
          </div>
        </CardBody>
      </Card>

      <Link
        to="/rider"
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-coal text-sm font-bold text-white"
        aria-label="Back to jobs"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to jobs
      </Link>
      <button
        type="button"
        onClick={logout}
        aria-label="Log out of rider app"
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-coal/15 bg-white text-sm font-bold"
      >
        <LogOut className="h-4 w-4" aria-hidden /> Log out
      </button>
    </div>
  );
}
