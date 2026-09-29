import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, Clock, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { GHS, cn } from '../../../lib/utils';
import { Empty } from '../../../components/ui/primitives';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toaster';

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const { menu, addToCart } = useApp();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = useMemo(() => menu.find((m) => m.id === id), [menu, id]);
  if (!item) {
    return (
      <main className="container py-24">
        <Empty title="Dish not found" body="It may have been removed from the menu." />
        <Link to="/menu" className="mt-4 inline-block text-sm font-bold text-brand-700">← Back to menu</Link>
      </main>
    );
  }

  const total = item.price * qty;

  const handleAdd = () => {
    addToCart(item, qty, [], notes.trim() || undefined);
    toast({ title: 'Added to cart', body: `${qty} × ${item.name}`, kind: 'success' });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1800);
  };

  return (
    <main className="container py-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm">
            <li><Link to="/" className="font-semibold text-coal/55 hover:text-brand-700">Home</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} className="text-coal/35" /></li>
            <li><Link to="/menu" className="font-semibold text-coal/55 hover:text-brand-700">Menu</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} className="text-coal/35" /></li>
            <li aria-current="page" className="max-w-[40vw] truncate font-bold text-coal">{item.name}</li>
          </ol>
        </nav>
        <Link
          to="/menu"
          className="inline-flex items-center gap-1.5 rounded-xl border border-coal/15 bg-white px-4 py-2 text-sm font-bold hover:bg-cream"
        >
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <img src={item.image} alt={item.name} className="h-64 w-full rounded-3xl object-cover shadow-card sm:h-80 lg:h-[380px]" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold">{item.name}</h1>
          <p className="mt-2 text-coal/65">{item.description}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-coal/60"><Clock size={15} /> Ready in ~{item.prepMinutes} min</p>
          <p className="mt-4 font-display text-3xl font-extrabold text-brand-700">{GHS(item.price)}</p>

          <div className="mt-5">
            <label htmlFor="item-notes" className="text-sm font-extrabold uppercase tracking-wide">Instructions (optional)</label>
            <textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. no onions, extra spicy, cut pizza in 6…"
              className="mt-2 w-full rounded-xl border border-coal/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2" role="group" aria-label="Quantity">
              <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-coal/15 hover:bg-cream">
                <Minus size={16} />
              </button>
              <label htmlFor="item-qty" className="sr-only">Quantity (1 to 20)</label>
              <input
                id="item-qty"
                type="number"
                min={1}
                max={20}
                value={qty}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isNaN(n)) return;
                  setQty(Math.min(20, Math.max(1, n)));
                }}
                onBlur={(e) => {
                  if (e.target.value === '') setQty(1);
                }}
                aria-live="polite"
                className="h-10 w-14 rounded-xl border border-coal/15 text-center font-display text-lg font-extrabold outline-none focus:border-brand-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-coal/15 hover:bg-cream">
                <Plus size={16} />
              </button>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!item.available}
              className={cn('flex-1 transition-colors', added && 'bg-leaf hover:bg-leaf')}
              size="lg"
              aria-live="polite"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={added ? 'added' : 'add'}
                  initial={{ opacity: 0, y: 8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.94 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-2"
                >
                  {added ? (
                    <><Check size={18} strokeWidth={3} /> Added to cart</>
                  ) : (
                    <><ShoppingBag /> {item.available ? `Add to cart · ${GHS(total)}` : 'Sold out'}</>
                  )}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
