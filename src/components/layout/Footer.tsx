import { Link } from 'react-router-dom';
import { Clock, MapPin, Phone, UtensilsCrossed } from 'lucide-react';
import { RESTAURANT } from '../../shared/data';
import { hours12h } from '../../lib/utils';

export default function Footer() {
  return (
    <footer className="bg-coal text-white">
      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600">
              <UtensilsCrossed size={18} />
            </span>
            Bite &amp; Sips
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/65">
            Good food. Great sips. Your way. Pickup &amp; delivery across Tema, cooked fresh in Community 7.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">Hours</h3>
          <p className="mt-3 flex items-start gap-2 text-sm text-white/75">
            <Clock size={16} className="mt-0.5 shrink-0" /> Daily {hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)}
          </p>
          <p className="mt-1 text-xs text-white/50">Kitchen closes 30 min before closing.</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">Contact</h3>
          <p className="mt-3 flex items-start gap-2 text-sm text-white/75">
            <MapPin size={16} className="mt-0.5 shrink-0" /> {RESTAURANT.address}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
            <Phone size={16} className="shrink-0" /> {RESTAURANT.phone}
          </p>
        </div>
        <nav aria-label="Footer">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { to: '/menu', label: 'Menu' },
              { to: '/about', label: 'About' },
              { to: '/contact', label: 'Contact' },
              { to: '/help', label: 'Help & FAQ' },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-white/75 hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="container py-5 text-xs text-white/50">© 2026 Bite &amp; Sips · Tema C7 · Crafted fresh daily.</p>
      </div>
    </footer>
  );
}
