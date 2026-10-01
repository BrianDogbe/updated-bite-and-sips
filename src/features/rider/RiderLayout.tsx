import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Bike, Briefcase, Eye, EyeOff, History, User, Wallet } from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/primitives';
import ScrollToTop from '../../components/common/ScrollToTop';

const TABS = [
  { to: '/rider', end: true, label: 'Jobs', icon: Briefcase },
  { to: '/rider/history', end: false, label: 'History', icon: History },
  { to: '/rider/earnings', end: false, label: 'Earnings', icon: Wallet },
  { to: '/rider/profile', end: false, label: 'Profile', icon: User },
];

export function useMockRider() {
  const { user, riders } = useApp();
  return riders.find((r) => r.name === user?.name) ?? riders[0] ?? null;
}

export default function RiderLayout() {
  const { user, loginRider, orders, riders, setRiderOnline } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Enter your email and password.');
      return;
    }
    const res = await loginRider(email, password);
    if (!res.ok) setFormError(res.error ?? 'Login failed.');
    else setFormError(null);
  };

  // Every rider signs in as themselves — jobs, earnings and history follow the account.
  if (!user || user.role !== 'RIDER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md rounded-2xl border border-coal/10 bg-white p-8 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
            <Bike className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Rider sign-in</h1>
          <p className="mt-1 text-sm text-coal/60">Sign in to see your deliveries, trips and earnings.</p>
          <form onSubmit={signIn} className="mt-6 space-y-3 text-left" noValidate>
            <div>
              <label htmlFor="rider-email" className="text-xs font-bold uppercase tracking-wide">Email</label>
              <Input
                id="rider-email" type="email" autoComplete="username"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="kwame@biteandsips.com" className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="rider-password" className="text-xs font-bold uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <Input
                  id="rider-password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-coal/50 hover:bg-coal/5"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {formError && <p role="alert" className="text-sm font-semibold text-red-600">{formError}</p>}
            <Button type="submit" size="lg" className="w-full">Sign in</Button>
          </form>
          <p className="mt-3 text-[11px] text-coal/45">Demo: kwame@biteandsips.com · rider1234 (Ama: ama.rider@biteandsips.com)</p>
        </div>
      </div>
    );
  }

  const me = riders.find((r) => r.name === user?.name) ?? riders[0] ?? null;

  const activeDelivery = me
    ? orders.find(
        (o) =>
          o.riderId === me.id &&
          (o.status === 'READY_FOR_PICKUP' || o.status === 'RIDER_ASSIGNED' || o.status === 'ARRIVED_AT_RESTAURANT' || o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY'),
      )
    : undefined;

  return (
    <div className="min-h-screen bg-cream text-coal">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-cream shadow-card">
        <ScrollToTop />
        <header className="sticky top-0 z-30 border-b border-coal/10 bg-coal text-white">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600" aria-hidden>
              <Bike className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-extrabold leading-tight">
                {me?.name ?? 'Bite & Sips Rider'}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Rider app</p>
            </div>
            {me && (
              <button
                type="button"
                role="switch"
                aria-checked={me.online}
                aria-label={me.online ? 'Go offline' : 'Go online'}
                onClick={() => setRiderOnline(me.id, !me.online)}
                className={cn(
                  'inline-flex min-h-[48px] items-center gap-2 rounded-full px-4 text-sm font-extrabold transition-colors',
                  me.online ? 'bg-leaf text-white' : 'bg-white/15 text-white/70',
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', me.online ? 'bg-white' : 'bg-white/40')} aria-hidden />
                {me.online ? 'Online' : 'Offline'}
              </button>
            )}
          </div>
          {activeDelivery && (
            <Link
              to={`/rider/active/${activeDelivery.id}`}
              className="block bg-brand-600 px-4 py-2.5 text-center text-sm font-extrabold text-white hover:bg-brand-700"
              aria-label={`Resume active delivery ${activeDelivery.id}`}
            >
              Active delivery {activeDelivery.id} — tap to resume →
            </Link>
          )}
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">
          <Outlet />
        </main>

        <nav
          aria-label="Rider"
          className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-coal/10 bg-white/95 backdrop-blur"
        >
          <div className="grid grid-cols-4">
            {TABS.map((t) => (
              <NavLink
                key={t.label}
                to={t.to}
                end={t.end}
                aria-label={`${t.label} tab`}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-wide',
                    isActive ? 'text-brand-700' : 'text-coal/45',
                  )
                }
              >
                <t.icon className="h-5 w-5" aria-hidden />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
