import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, Search } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { CATEGORIES } from '../../../shared/data';
import { GHS, cn } from '../../../lib/utils';
import { Badge, Card, CardBody, Empty, Input, SectionTitle } from '../../../components/ui/primitives';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toaster';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

export default function MenuPage() {
  const { menu, addToCart } = useApp();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCat = params.get('cat') ?? 'all';

  const filtered = useMemo(() => {
    return menu.filter((m) => {
      const matchCat = activeCat === 'all' || m.categoryId === activeCat || (activeCat === 'popular' && m.popular);
      const matchQ = q.trim() === '' || `${m.name} ${m.description}`.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [menu, activeCat, q]);

  const handleAdd = (id: string, item: (typeof menu)[number]) => {
    addToCart(item, 1, []);
    toast({ title: 'Added to cart', body: item.name, kind: 'success' });
    setAddedId(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAddedId(null), 1600);
  };

  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Menu' }]} />
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <SectionTitle kicker="Menu" title="What are you craving?" sub="Everything cooked fresh in Tema C7. Prices in Ghana cedis." />
        <div className="relative mt-6 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-coal/40" aria-hidden="true" />
          <label htmlFor="menu-search" className="sr-only">Search dishes</label>
          <Input id="menu-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jollof, burger, pizza…" className="pl-10" />
        </div>
        <div role="tablist" aria-label="Filter by category" className="mt-4 flex flex-wrap justify-center gap-2">
          {[{ id: 'all', name: 'All', slug: 'all' }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={activeCat === c.id}
              onClick={() => setParams(activeCat === c.id ? {} : { cat: c.id }, { replace: true })}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-bold transition',
                activeCat === c.id ? 'bg-coal text-white' : 'bg-coal/5 text-coal hover:bg-coal/10',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12"><Empty title="No dishes found" body="Try a different search or category." /></div>
      ) : (
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const added = addedId === m.id;
            return (
              <li key={m.id}>
                <Card className={!m.available ? 'opacity-75' : ''}>
                  <div className="relative">
                    <Link to={`/menu/${m.id}`} aria-label={`View ${m.name}`}>
                      <img src={m.image} alt={m.name} loading="lazy" className="h-52 w-full rounded-t-2xl object-cover" />
                    </Link>
                    {!m.available && <Badge className="absolute bottom-3 left-3 bg-coal text-white">Sold out</Badge>}
                  </div>
                  <CardBody>
                    <Link to={`/menu/${m.id}`} className="font-display font-extrabold hover:text-brand-700">{m.name}</Link>
                    <p className="mt-1 line-clamp-2 text-xs text-coal/60">{m.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-display text-lg font-extrabold text-brand-700">{GHS(m.price)}</span>
                      <Button
                        size="sm"
                        disabled={!m.available}
                        onClick={() => handleAdd(m.id, m)}
                        className={cn('min-w-[128px] transition-colors', added && 'bg-leaf hover:bg-leaf')}
                        aria-live="polite"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={added ? 'added' : 'add'}
                            initial={{ opacity: 0, y: 6, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.94 }}
                            transition={{ duration: 0.18 }}
                            className="inline-flex items-center gap-1.5"
                          >
                            {added ? <><Check size={15} strokeWidth={3} /> Added</> : <><Plus /> Add to Cart</>}
                          </motion.span>
                        </AnimatePresence>
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
