import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, ChefHat, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';

export interface KitchenOutletCtx {
  soundOn: boolean;
}

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function KitchenLayout() {
  const { user, login } = useApp();
  const now = useClock();
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bs_kitchen_sound') !== 'off';
    } catch {
      return true;
    }
  });

  // Mock staff login if no user (demo mode)
  useEffect(() => {
    if (!user) login('Kitchen Staff', 'KITCHEN_STAFF');
  }, [user, login]);

  const toggleSound = () => {
    setSoundOn((s) => {
      const next = !s;
      try {
        localStorage.setItem('bs_kitchen_sound', next ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const clock = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-coal text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-coal/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600">
            <ChefHat className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-extrabold leading-tight md:text-2xl">
              Bite &amp; Sips Kitchen
            </h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Kitchen Display System
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <div
              className="hidden items-center gap-2 rounded-xl bg-white/10 px-4 py-2 sm:flex"
              aria-live="off"
            >
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">{date}</span>
              <span className="font-display text-2xl font-extrabold tabular-nums" aria-label={`Current time ${clock}`}>
                {clock}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundOn ? 'Mute new-order sound' : 'Unmute new-order sound'}
              aria-pressed={soundOn}
              className="inline-flex min-h-[52px] min-w-[52px] items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold hover:bg-white/20"
            >
              {soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
              <span className="hidden md:inline">{soundOn ? 'Sound on' : 'Muted'}</span>
            </button>
            <Link
              to="/"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden /> Back to site
            </Link>
          </div>
        </div>
        {/* Mobile clock row */}
        <div className="border-t border-white/10 px-4 py-1.5 text-center font-display text-lg font-bold tabular-nums sm:hidden" aria-hidden>
          {clock}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <Outlet context={{ soundOn } satisfies KitchenOutletCtx} />
      </main>
    </div>
  );
}
