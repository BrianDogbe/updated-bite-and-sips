import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu as MenuIcon, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';
import { cn } from '../../lib/utils';
import CartDrawer from '../common/CartDrawer';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/track', label: 'Track Order' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function CustomerNavbar() {
  const { cartCount } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const loc = useLocation();
  const isHome = loc.pathname === '/';
  const overlay = isHome && !scrolled; // transparent over the hero image only
  const light = overlay; // white text only while over the hero; otherwise the scrolled look

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[60] transition-all duration-300',
          overlay
            ? 'bg-transparent'
            : isHome
              ? 'bg-cream/95 shadow-card backdrop-blur'
              : 'border-b border-coal/10 bg-white shadow-card',
        )}
      >
        <nav aria-label="Primary" className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2" aria-label="Bite and Sips home">
            <span className={cn('grid h-10 w-10 place-items-center rounded-2xl', light ? 'bg-white text-brand-700' : 'bg-brand-600 text-white')}>
              <UtensilsCrossed size={20} />
            </span>
            <span className={cn('font-display text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-coal')}>
              Bite <span className="text-brand-500">&amp;</span> Sips
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => {
              const active = l.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(l.to);
              return (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                      active
                        ? 'bg-brand-600 text-white'
                        : light
                          ? 'text-white/90 hover:bg-white/15'
                          : 'text-coal hover:bg-coal/5',
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cartCount} items`}
              className={cn(
                'relative grid h-10 w-10 place-items-center rounded-xl transition',
                light ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-coal/5 text-coal hover:bg-coal/10',
              )}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-extrabold text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <Link
              to="/menu"
              className="hidden rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-warm transition-colors hover:brightness-95 sm:inline-flex"
            >
              Order Now
            </Link>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl lg:hidden',
                light ? 'bg-white/15 text-white' : 'bg-coal/5 text-coal',
              )}
            >
              {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute right-4 top-[4.25rem] w-[min(78vw,300px)] origin-top-right overflow-hidden rounded-2xl border border-coal/10 bg-white shadow-card lg:hidden"
            >
              <ul className="space-y-1 px-3 py-3">
                {LINKS.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className={cn(
                        'block rounded-xl px-4 py-3 text-sm font-bold',
                        loc.pathname === l.to || (l.to !== '/' && loc.pathname.startsWith(l.to))
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-coal hover:bg-coal/5',
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/menu" className="mt-2 block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white">
                    Order Now
                  </Link>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
