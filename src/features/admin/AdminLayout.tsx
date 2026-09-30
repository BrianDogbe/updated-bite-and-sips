import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Truck, UtensilsCrossed, Users,
  Bike, Wallet, Package, Tag, BarChart3, ScrollText, Settings,
  Store, LogOut, Eye, EyeOff, Moon, Sun, Mail,
} from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge, Input } from '../../components/ui/primitives';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/delivery', label: 'Delivery', icon: Truck },
  { to: '/admin/messages', label: 'Messages', icon: Mail },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/riders', label: 'Riders', icon: Bike },
  { to: '/admin/finance', label: 'Finance', icon: Wallet },
  { to: '/admin/inventory', label: 'Inventory', icon: Package },
  { to: '/admin/promotions', label: 'Promotions', icon: Tag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, loginWithPassword, logout, messages } = useApp();
  const unreadMessages = messages.filter((m) => !m.read).length;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sign-in is handled by loginWithPassword (backend JWT when VITE_API_URL
  // is set, strict demo credential otherwise — see the store).

  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bs_admin_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const toggleTheme = () => {
    setDark((d) => {
      try {
        localStorage.setItem('bs_admin_theme', d ? 'light' : 'dark');
      } catch {
        /* ignore */
      }
      return !d;
    });
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Enter your email and password.');
      return;
    }
    const res = await loginWithPassword(email, password);
    if (!res.ok) setFormError(res.error ?? 'Login failed.');
    else setFormError(null);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md rounded-2xl border border-coal/10 bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Bite &amp; Sips Admin</h1>
          <p className="mt-1 text-sm text-coal/60">Sign in with your admin email and password.</p>
          <form onSubmit={signIn} className="mt-6 space-y-3 text-left" noValidate>
            <div>
              <label htmlFor="admin-email" className="text-xs font-bold uppercase tracking-wide">Email</label>
              <Input
                id="admin-email" type="email" autoComplete="username"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@biteandsips.com" className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <Input
                  id="admin-password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
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
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-screen', dark ? 'admin-dark bg-[#171310] text-[#f4eee7]' : 'bg-cream text-coal')}>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-coal/10 bg-coal text-white lg:flex">
        <div className="flex items-center gap-2 px-5 pb-4 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-display text-lg font-extrabold">B</div>
          <div>
            <p className="font-display text-base font-extrabold leading-tight">Bite &amp; Sips</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Admin portal</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {NAV.map((n) => (
            <NavLink
              key={n.label}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
              {n.label === 'Messages' && unreadMessages > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-extrabold text-white">
                  {unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/50">
          <p className="font-semibold text-white/80">{user.name}</p>
          <p>{user.role}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-coal/10 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 overflow-x-auto lg:hidden">
            {NAV.slice(0, 6).map((n) => (
              <NavLink
                key={n.label}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold',
                    isActive ? 'bg-coal text-white' : 'bg-coal/5 text-coal/70',
                  )
                }
              >
                {n.label}
                {n.label === 'Messages' && unreadMessages > 0 && (
                  <span className="ml-1 inline-grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-extrabold text-white">
                    {unreadMessages}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-leaf/10 text-leaf">{user.role}</Badge>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={dark}
              className="inline-flex items-center gap-1.5 rounded-xl border border-coal/15 bg-white px-3 py-2 text-xs font-bold hover:bg-cream"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={logout}
              aria-label="Log out of admin portal"
              className="inline-flex items-center gap-1.5 rounded-xl border border-coal/15 bg-white px-3 py-2 text-xs font-bold hover:bg-cream"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
