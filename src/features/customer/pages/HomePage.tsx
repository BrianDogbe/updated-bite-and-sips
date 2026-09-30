import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Clock, Play, Star, Truck, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import { RESTAURANT } from '../../../shared/data';
import { GHS, cn } from '../../../lib/utils';
import { FAQS } from './StaticPages';
import { Button } from '../../../components/ui/button';
import { Card, CardBody, SectionTitle } from '../../../components/ui/primitives';
import Marquee from '../../../components/common/Marquee';

const REVIEWS = [
  { n: 'Efua A.', t: 'The jollof tastes like a party. Rider arrived in 30 minutes, food still steaming.' },
  { n: 'Kofi D.', t: 'Smash burger + mango sip is elite. Pickup was ready before I even parked.' },
  { n: 'Ama S.', t: 'Tracking with the OTP felt so safe. My office orders every Friday now.' },
  { n: 'Yaw O.', t: 'Grilled tilapia with banku — fresh, spicy, perfect. Delivery to Community 7 was quick.' },
  { n: 'Selasi K.', t: 'The hibiscus cooler is my daily fix. Ordered at lunch, arrived ice-cold.' },
  { n: 'Nana E.', t: 'Scheduled pickup for the family and everything was hot and on time. Impressive.' },
];

function StepText({ step, title, body, footer, to, dark, i }: { step: string; title: string; body: string; footer: string; to: string; dark?: boolean; i: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (i % 4) * 0.07 }}
      className={cn(
        'flex min-h-[190px] flex-col rounded-2xl border p-5 md:min-h-[210px]',
        dark ? 'border-transparent bg-[#101f3c] text-white' : 'border-coal/10 bg-white text-coal',
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', dark ? 'text-white/60' : 'text-coal/50')}>{step}</p>
        <span aria-hidden="true" className="flex gap-1">
          <span className={cn('h-[3px] w-5 rounded-full', dark ? 'bg-gold' : 'bg-brand-600')} />
          <span className={cn('h-[3px] w-5 rounded-full', dark ? 'bg-white/20' : 'bg-coal/10')} />
        </span>
      </div>
      <p className="mt-4 font-display text-base font-extrabold leading-snug">{title}</p>
      <p className={cn('mt-2 text-xs leading-relaxed', dark ? 'text-white/70' : 'text-coal/60')}>{body}</p>
      <div className="mt-auto pt-4">
        <div className={cn('border-t', dark ? 'border-white/15' : 'border-coal/10')} />
        <div className="flex items-center justify-between pt-3">
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.18em]', dark ? 'text-white/60' : 'text-coal/50')}>{footer}</p>
          <Link
            to={to}
            aria-label={`${title} — order now`}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full border transition',
              dark ? 'border-white/25 hover:bg-white/10' : 'border-coal/15 hover:bg-coal hover:text-white',
            )}
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </motion.li>
  );
}

function StepImage({ src, alt, i }: { src: string; alt: string; i: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (i % 4) * 0.07 }}
      className="relative min-h-[190px] overflow-hidden rounded-2xl bg-coal md:min-h-[210px]"
    >
      <img src={src} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    </motion.li>
  );
}

function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Help</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-coal/60">
          Hours, delivery, pickup, payments and dine-in — everything you need before you order.
        </p>
      </div>
      <ol className="divide-y divide-coal/10 border-y border-coal/10">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-5 py-5 text-left"
              >
                <span aria-hidden="true" className="font-display text-sm font-extrabold text-brand-600">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-display text-base font-extrabold md:text-lg">{f.q}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xl leading-none transition-all duration-300',
                    isOpen ? 'rotate-45 border-brand-600 bg-brand-600 text-white' : 'border-coal/15 text-coal',
                  )}
                >
                  +
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 pl-9 pr-4 text-sm leading-relaxed text-coal/70 md:pl-11">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // One card on phones, three side-by-side on tablets and up
  const [count, setCount] = useState(3);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setCount(mq.matches ? 3 : 1);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % REVIEWS.length), 4500);
    return () => clearInterval(t);
  }, [paused]);

  const visible = Array.from({ length: count }, (_, k) => REVIEWS[(index + k) % REVIEWS.length]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[280px]">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {visible.map((r) => (
              <Card key={r.n}><CardBody className="p-8 md:p-10">
                <p aria-label="5 out of 5 stars" className="text-2xl text-gold">★★★★★</p>
                <p className="mt-4 text-lg leading-relaxed text-coal/80 md:text-xl">“{r.t}”</p>
                <p className="mt-5 text-base font-bold">{r.n}</p>
              </CardBody></Card>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label="Choose review set">
        {REVIEWS.map((r, i) => (
          <button
            key={r.n}
            role="tab"
            aria-selected={i === index}
            aria-label={`Show reviews from ${r.n}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-brand-600' : 'w-2 bg-coal/20 hover:bg-coal/40'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { menu } = useApp();
  const popular = menu.filter((m) => m.available).slice(0, 8);

  return (
    <main>
      {/* Hero */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-coal text-white" aria-label="Welcome">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=70"
          alt="Signature dishes at Bite and Sips"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-coal via-coal/70 to-brand-900/40" aria-hidden="true" />
        <div className="container relative grid w-full gap-10 pb-16 pt-28 md:grid-cols-2 md:pb-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Good Food. Great Sips. Your Way.
            </h1>
            <p className="mt-4 max-w-md text-white/75">
              Smash burgers, smoky jollof, wood-fired pizza and ice-cold sips — ready for pickup or
              delivered fast to your door in Tema.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/menu">
                <Button size="lg">Order Now <ArrowRight /></Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  View Details
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Marquee />

      {/* Popular */}
      <section className="bg-cream py-20 md:py-24" aria-label="Popular dishes">
        <div className="container">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle kicker="Loved" title="Fresh from the kitchen" />
            <Link to="/menu" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700">View all <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 8) * 0.05 }} className="h-full">
                <Card className="flex h-full flex-col overflow-hidden border-0">
                  <Link to={`/menu/${m.id}`} aria-label={`Browse ${m.name}`} className="block">
                    <img src={m.image} alt={m.name} className="h-44 w-full object-cover transition hover:scale-[1.03]" loading="lazy" />
                  </Link>
                  <CardBody className="flex flex-1 flex-col">
                    <p className="line-clamp-2 min-h-[3rem] font-display font-extrabold">{m.name}</p>
                    <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-coal/60">{m.description}</p>
                    <p className="mt-auto pt-3 font-display font-extrabold text-brand-700">{GHS(m.price)}</p>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cinematic — full-bleed, full screen height */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-coal text-white" aria-label="Our story on film">
        <img src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=75" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/55 to-coal/20" aria-hidden="true" />
        <div className="container relative grid w-full items-center gap-8 py-16 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Cinematic</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight md:text-5xl">Fire, flavour &amp; fresh sips.</h2>
            <p className="mt-4 max-w-xl text-base text-white/75">Take a 60-second tour of our Tema C7 kitchen — grill smoke, shaking cups, happy regulars.</p>
          </div>
          <div className="grid place-items-center">
            <button aria-label="Play Bite and Sips story video" className="group relative grid h-24 w-24 place-items-center rounded-full bg-brand-600 shadow-warm md:h-28 md:w-28">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/40" aria-hidden="true" />
              <Play size={32} className="relative fill-white" />
            </button>
          </div>
        </div>
      </section>

      {/* How it works — mosaic */}
      <section className="bg-white py-12 md:py-16" aria-label="How ordering works">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="max-w-xl font-display text-2xl font-extrabold leading-[1.05] tracking-tight md:text-3xl">
              From craving to doorstep
            </h2>
            <Link to="/about" className="inline-flex items-center gap-1.5 text-sm font-bold text-coal hover:text-brand-700">
              About our kitchen <ArrowRight size={16} />
            </Link>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StepText i={0} step="Step 01" title="Pick your dishes" body="Browse the menu and add to your cart. Your details and payment are collected at checkout." footer="No accounts needed" to="/menu" />
            <StepImage i={1} src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=70" alt="A spread of freshly cooked dishes" />
            <StepText i={2} step="Step 02" title="We fire it up" body="Our Tema C7 kitchen cooks your order fresh — pickup in ~15–20 minutes, or schedule ahead." footer="Ready in ~20 min" to="/menu" dark />
            <StepImage i={3} src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=70" alt="Chef cooking over open flame in the kitchen" />
            <StepImage i={4} src="https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=70" alt="Delivery rider on the road with an order" />
            <StepText i={5} step="Step 03" title="Pickup or track" body="Grab it at the counter or follow your rider live on the map with a secure handover OTP." footer="Live tracking + OTP" to="/menu" />
            <motion.li
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.14 }}
              className="flex min-h-[190px] flex-col rounded-2xl bg-brand-600 p-5 text-white md:min-h-[210px]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Hungry already?</p>
              <p className="mt-4 font-display text-base font-extrabold leading-snug">Start your order now</p>
              <p className="mt-2 text-xs leading-relaxed text-white/80">Pickup is free. Delivery across Tema from GH₵8.00.</p>
              <div className="mt-auto pt-6">
                <Link to="/menu" aria-label="Start your order now" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 hover:bg-cream">
                  Order now <ArrowRight size={16} />
                </Link>
              </div>
            </motion.li>
            <StepImage i={7} src="https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=800&q=70" alt="Fresh mango passion sip over crushed ice" />
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-20 md:py-24" aria-label="Frequently asked questions">
        <HomeFaq />
      </section>

      {/* About teaser */}
      <section className="bg-coal py-20 text-white md:py-24" aria-label="About teaser">
        <div className="container grid items-center gap-8 md:grid-cols-2">
          <div>
            <SectionTitle kicker="Our promise" title="Cooked fresh in Tema C7, served with pride" sub={`${RESTAURANT.address} · ${RESTAURANT.phone}`} />
            <ul className="mt-5 space-y-2.5 text-sm text-white/75">
              <li className="flex gap-2"><Truck size={16} className="mt-0.5 text-brand-300" /> Fast delivery with live rider tracking &amp; handover OTP.</li>
              <li className="flex gap-2"><Clock size={16} className="mt-0.5 text-brand-300" /> Pickup in ~15–20 min, or schedule ahead.</li>
              <li className="flex gap-2"><Star size={16} className="mt-0.5 text-brand-300" /> 4.9★ from 2,000+ Tema food lovers.</li>
              <li className="flex gap-2"><UtensilsCrossed size={16} className="mt-0.5 text-brand-300" /> Walk in and dine with us — open daily, no booking needed.</li>
            </ul>
            <Link to="/about" className="mt-6 inline-flex"><Button variant="secondary">Our story <ArrowRight /></Button></Link>
          </div>
          <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=70" alt="Dining room at Bite and Sips" loading="lazy" className="h-72 w-full rounded-3xl object-cover" />
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-20 md:py-24" aria-label="Testimonials">
        <div className="text-center">
          <SectionTitle kicker="Reviews" title="Tema loves us" />
        </div>
        <div className="mt-8">
          <Testimonials />
        </div>
      </section>
    </main>
  );
}
