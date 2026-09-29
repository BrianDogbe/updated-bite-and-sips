import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Truck, ChefHat, UtensilsCrossed, Users,
  Bike, Wallet, Package, Tag, BarChart3, UserCog, ScrollText, Settings,
  ArrowLeft, Store,
} from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/primitives';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/delivery', label: 'Delivery', icon: Truck },
  { to: '/kitchen', label: 'Kitchen view', icon: ChefHat, external: true },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/riders', label: 'Riders', icon: Bike },
  { to: '/admin/finance', label: 'Finance', icon: Wallet },
  { to: '/admin/inventory', label: 'Inventory', icon: Package },
  { to: '/admin/promotions', label: 'Promotions', icon: Tag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/staff', label: 'Staff', icon: UserCog },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, login } = useApp();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md rounded-2xl border border-coal/10 bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Bite &amp; Sips Admin</h1>
          <p className="mt-1 text-sm text-coal/60">Pick a mock role to enter the business portal.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => login('Abena Owner', 'OWNER')}>Continue as Owner</Button>
            <Button variant="secondary" onClick={() => login('Kojo Admin', 'ADMIN')}>Continue as Admin</Button>
            <Button variant="outline" onClick={() => login('Efua Manager', 'MANAGER')}>Continue as Manager</Button>
          </div>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream text-coal">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-coal/10 bg-coal text-white lg:flex">
        <div className="flex items-center gap-2 px-5 pb-4 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-display text-lg font-extrabold">B</div>
          <div>
            <p className="font-display text-base font-extrabold leading-tight">Bite &amp; Sips</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Admin portal</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {NAV.map((n) =>
            n.external ? (
              <Link
                key={n.label}
                to={n.to}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ) : (
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
              </NavLink>
            ),
          )}
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
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-leaf/10 text-leaf">{user.role}</Badge>
            <span className="hidden text-sm font-medium text-coal/70 sm:inline">{user.name}</span>
            <Link to="/" className="inline-flex items-center gap-1 rounded-xl border border-coal/15 bg-white px-3 py-2 text-xs font-bold hover:bg-cream">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
