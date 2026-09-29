import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircleQuestion, Send, X } from 'lucide-react';
import { RESTAURANT } from '../../shared/data';
import { hours12h } from '../../lib/utils';

/**
 * Rule-based responder for the help widget.
 * Swappable later: replace `answerQuery` internals with a fetch to an AI endpoint
 * keeping the same (query: string) => string | Promise<string> contract.
 */
export function answerQuery(q: string): string {
  const s = q.toLowerCase();
  if (/(hour|open|close|when.*open)/.test(s))
    return `We're open daily ${hours12h(RESTAURANT.openHour, RESTAURANT.closeHour)}. Kitchen closes 30 minutes before closing.`;
  if (/(deliver|delivery|fee|how long|time.*deliver)/.test(s))
    return 'Delivery takes 25–45 min in Tema depending on distance. Fees are GH₵8 (0–2km), GH₵14 (2–5km), GH₵22 (5–10km), GH₵35 beyond. Track your rider live on the tracking page.';
  if (/(pickup|collect|takeaway)/.test(s))
    return 'Pickup is free. Choose ASAP (ready in ~15–20 min) or schedule a time during checkout. Show your order ID at the counter.';
  if (/(pay|payment|momo|card|cash)/.test(s))
    return 'We accept MTN MoMo, Vodafone Cash, AirtelTigo, debit/credit cards, and cash on delivery/pickup. Use code WELCOME15 for 15% off your first order.';
  if (/(where|location|address|find)/.test(s))
    return `Find us at ${RESTAURANT.address}. Call ${RESTAURANT.phone} for directions.`;
  if (/(cancel|refund)/.test(s))
    return 'You can cancel free of charge while the order is still PENDING. Once the kitchen confirms, please call us and we will help with a refund or remake.';
  if (/(promo|discount|code|coupon)/.test(s))
    return 'Try WELCOME15 (15% off), FLAT10 (GH₵10 off), or FREERIDE (free delivery). Enter the code at checkout under Payment.';
  if (/(track|status|where.*order|rider)/.test(s))
    return 'Open Orders → Track to see the live timeline, rider position, ETA and your handover OTP.';
  if (/(account|login|sign|register)/.test(s))
    return 'Tap Account and enter your name to sign in (demo login, no password). Your orders, favourites and addresses are saved on this device.';
  if (/(allergen|ingredient|vegetarian|vegan|halal)/.test(s))
    return 'Every dish page lists ingredients and allergens. Tell us about allergies in the instructions box and our kitchen will take extra care.';
  if (/^(hi|hello|hey|good)/.test(s))
    return 'Hello! Ask me about hours, delivery, pickup, payments, promos, tracking or cancellations.';
  return "I don't have that answer yet — try asking about hours, delivery, pickup, payment, promos, tracking or cancellations. For anything urgent call " + RESTAURANT.phone + '.';
}

const SUGGESTIONS = ['What are your hours?', 'How much is delivery?', 'Do you do pickup?', 'Which payments?', 'How do I track my order?'];

export default function AskAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<{ from: 'me' | 'bot'; text: string }[]>([
    { from: 'bot', text: 'Hi, I\'m Sippy — your Bite & Sips helper. Ask me anything!' },
  ]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setLog((l) => [...l, { from: 'me', text: q }, { from: 'bot', text: answerQuery(q) }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            aria-label="Help assistant"
            className="mb-3 flex h-[420px] w-[min(92vw,340px)] flex-col overflow-hidden rounded-2xl border border-coal/10 bg-white shadow-card"
          >
            <header className="flex items-center justify-between bg-coal px-4 py-3 text-white">
              <p className="font-display text-sm font-bold">Sippy · Help</p>
              <button aria-label="Close assistant" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/10">
                <X size={16} />
              </button>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" role="log" aria-live="polite">
              {log.map((m, i) => (
                <div key={i} className={m.from === 'me' ? 'ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-brand-600 px-3 py-2 text-white' : 'w-fit max-w-[90%] rounded-xl rounded-bl-sm bg-cream px-3 py-2 text-coal'}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-coal/10 p-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full bg-coal/5 px-2.5 py-1 text-[11px] font-semibold hover:bg-coal/10">
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2 border-t border-coal/10 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <label htmlFor="ask-input" className="sr-only">Ask a question</label>
              <input
                id="ask-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about hours, delivery…"
                className="h-10 w-full rounded-xl border border-coal/15 px-3 text-sm outline-none focus:border-brand-500"
              />
              <button aria-label="Send question" type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white hover:bg-brand-700">
                <Send size={16} />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close help assistant' : 'Open help assistant'}
        aria-expanded={open}
        className="grid h-13 w-13 place-items-center rounded-full bg-brand-600 p-3.5 text-white shadow-warm transition hover:bg-brand-700"
      >
        {open ? <X size={22} /> : <MessageCircleQuestion size={22} />}
      </button>
    </div>
  );
}
