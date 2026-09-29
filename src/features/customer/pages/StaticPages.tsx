import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, Clock, Flame, Leaf, Mail, MapPin, MessageCircleQuestion, Phone, Send, UtensilsCrossed } from 'lucide-react';
import { RESTAURANT } from '../../../shared/data';
import { cn, hours12h } from '../../../lib/utils';
import { Card, CardBody, Input, SectionTitle } from '../../../components/ui/primitives';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toaster';
import { answerQuery } from '../../../components/common/AskAssistant';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

export function AboutPage() {
  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
      <SectionTitle kicker="About" title="Good food. Great sips. Your way." />
      <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
        <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=75" alt="Bite and Sips dining room" className="h-[26rem] w-full rounded-3xl object-cover shadow-card lg:h-[32rem]" />
        <div className="space-y-5 text-base leading-relaxed text-coal/75 md:text-lg">
          <p>Bite &amp; Sips started with one grill, one blender and a simple idea: Tema deserves food that is fast <em>without</em> tasting fast. Every burger is smashed to order, every jollof pot gets real firewood smoke, every sip is blended from fresh fruit.</p>
          <p>We built the whole experience around your day — order ahead for pickup in Community 7, let our riders bring it hot to your home or office with live tracking and a handover OTP for safety, or simply walk in and dine with us. Our dining room is open daily — order at the counter, take a seat, and we will bring your food over. No bookings, no queues, no fuss.</p>
          <ul className="space-y-2.5 text-base md:text-lg">
            <li className="flex gap-2"><Clock size={15} className="mt-0.5 text-brand-700" /> Open daily {hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)}</li>
            <li className="flex gap-2"><MapPin size={15} className="mt-0.5 text-brand-700" /> {RESTAURANT.address}</li>
            <li className="flex gap-2"><Phone size={15} className="mt-0.5 text-brand-700" /> {RESTAURANT.phone}</li>
          </ul>
        </div>
      </div>

      <section aria-label="Our promise" className="relative left-1/2 mt-16 w-screen -translate-x-1/2 bg-cream py-16 text-coal md:py-20">
        <div className="container">
          <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-brand-600">Our promise</p>
          <ol className="mt-10 grid gap-x-12 gap-y-14 md:grid-cols-2">
            {[
              { icon: Flame, t: 'Cooked to order', d: 'Nothing sits under heat lamps. Your meal hits the grill or fryer only after you order — that is why pickup takes ~15–20 minutes and tastes worth it.' },
              { icon: Bike, t: 'Delivery you can watch', d: 'Distance-based fees, live rider tracking on a map, an ETA that updates as the rider moves, and a 4-digit handover code so your food reaches the right hands.' },
              { icon: Leaf, t: 'Fresh, honest ingredients', d: 'Market-fresh produce, real fruit in every sip, and clear allergen and ingredient lists on every dish. Add preferences in the instructions box at checkout.' },
              { icon: UtensilsCrossed, t: 'Dine in with us', d: 'Prefer to stay? Our Tema C7 dining room is open daily. Order at the counter and enjoy your meal fresh off the pass — walk-ins always welcome.' },
            ].map((v) => (
              <li key={v.t} className="border-t border-coal/15 pt-8">
                <v.icon size={24} strokeWidth={1.5} className="text-brand-700" aria-hidden="true" />
                <p className="mt-6 font-display text-xl font-extrabold md:text-2xl">{v.t}</p>
                <p className="mt-4 border-b border-coal/15 pb-10 text-base leading-relaxed text-coal/65 md:text-lg">{v.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

export function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <SectionTitle kicker="Contact" title="Talk to us" sub="Catering, feedback, bulk orders — we reply within a day." />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardBody>
          <form onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !msg.trim()) { toast({ title: 'Add your name and message', kind: 'error' }); return; } toast({ title: 'Message sent', body: 'We’ll get back to you soon.', kind: 'success' }); setName(''); setEmail(''); setMsg(''); }}>
            <label htmlFor="c-name" className="text-xs font-bold uppercase tracking-wide">Name</label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Your name" />
            <label htmlFor="c-email" className="mt-3 block text-xs font-bold uppercase tracking-wide">Email</label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="you@example.com" />
            <label htmlFor="c-msg" className="mt-3 block text-xs font-bold uppercase tracking-wide">Message</label>
            <textarea id="c-msg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} placeholder="How can we help?" className="mt-1 w-full rounded-xl border border-coal/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500" />
            <Button type="submit" className="mt-3"><Send /> Send message</Button>
          </form>
        </CardBody></Card>
        <div className="space-y-3 text-sm">
          <Card><CardBody className="flex gap-2.5"><MapPin size={17} className="shrink-0 text-brand-700" /> {RESTAURANT.address}</CardBody></Card>
          <Card><CardBody className="flex gap-2.5"><Phone size={17} className="shrink-0 text-brand-700" /> {RESTAURANT.phone}</CardBody></Card>
          <Card><CardBody className="flex gap-2.5"><Mail size={17} className="shrink-0 text-brand-700" /> hello@biteandsips.com.gh</CardBody></Card>
          <Card><CardBody>
            <p className="flex gap-2.5 font-bold"><Clock size={17} className="shrink-0 text-brand-700" /> Opening hours</p>
            <p className="mt-2 pl-7 text-coal/70">Open daily {hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)}.<br />Kitchen closes 30 minutes before closing. Walk-ins always welcome.</p>
          </CardBody></Card>
          <Card className="relative overflow-hidden border-transparent text-coal"><CardBody className="relative">
            <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=70" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-cream/90" aria-hidden="true" />
            <div className="relative">
              <p className="font-display text-lg font-extrabold">Hungry right now?</p>
              <p className="mt-1 text-sm text-coal/65">Skip the form — order pickup or delivery in minutes.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/menu" className="rounded-xl bg-coal px-5 py-2.5 text-sm font-bold text-white hover:bg-black">Order now</Link>
                <a href={`tel:${RESTAURANT.phone.replace(/\s/g, '')}`} className="rounded-xl border border-coal/20 px-5 py-2.5 text-sm font-bold hover:bg-white/60">Call to order</a>
              </div>
            </div>
          </CardBody></Card>
        </div>
      </div>
    </main>
  );
}

export const FAQS = [
  { q: 'What are your opening hours?', a: `Daily ${hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)}.` },
  { q: 'How long does delivery take?', a: '25–45 minutes depending on distance and kitchen load. Track live with ETA on the tracking page.' },
  { q: 'How do pickup orders work?', a: 'Choose ASAP or schedule a time. Show your order ID at the Tema C7 counter — no queue.' },
  { q: 'Can I come and dine in?', a: 'Yes! Our Tema C7 dining room is open daily. Walk in, order at the counter and enjoy your meal with us — no booking needed.' },
  { q: 'Which payments do you accept?', a: 'MTN MoMo, Vodafone Cash, AirtelTigo, cards and cash. Promo codes apply at checkout.' },
  { q: 'Can I cancel my order?', a: 'Yes, free while it is still PENDING. After confirmation, call us and we will help.' },
  { q: 'What is the handover OTP?', a: 'A 4-digit code shown on your tracking page. Share it with the rider or counter to confirm receipt.' },
];

export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState('');
  const [a, setA] = useState<string | null>(null);
  return (
    <main className="container py-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Help' }]} />
      <SectionTitle kicker="Help" title="Questions, answered" />
      <Card className="mt-6"><CardBody>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) setA(answerQuery(q)); }}>
          <label htmlFor="faq-ask" className="sr-only">Ask a question</label>
          <Input id="faq-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about delivery, payments…" />
          <Button type="submit"><MessageCircleQuestion /> Ask</Button>
        </form>
        {a && <p role="status" className="mt-3 rounded-xl bg-cream p-3.5 text-sm">{a}</p>}
      </CardBody></Card>
      <ul className="mt-4 space-y-2">
        {FAQS.map((f, i) => (
          <li key={i}><Card>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between p-4 text-left font-bold">
              {f.q}<span className={cn('text-brand-600 transition', open === i && 'rotate-45')}>+</span>
            </button>
            {open === i && <p className="px-4 pb-4 text-sm text-coal/70">{f.a}</p>}
          </Card></li>
        ))}
      </ul>
    </main>
  );
}
