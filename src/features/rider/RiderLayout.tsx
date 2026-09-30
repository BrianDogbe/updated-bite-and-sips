import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Bike, Briefcase, History, User, Wallet } from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';
import { cn } from '../../lib/utils';
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
  const { user, login, orders, riders, setRiderOnline } = useApp();

  // Mock rider login (demo mode)
  useEffect(() => {
    if (!user || user.role !== 'RIDER') login('Kwame Mensah', 'RIDER');
  }, [user, login]);

  const me = riders.find((r) => r.name === user?.name) ?? riders[0] ?? null;

  const activeDelivery = me
    ? orders.find(
        (o) =>
          o.riderId === me.id &&
          (o.status === 'RIDER_ASSIGNED' || o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY'),
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
