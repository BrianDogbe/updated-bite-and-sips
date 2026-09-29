import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Trash2, X } from 'lucide-react';
import { useApp } from '../../shared/store/AppStore';
import { GHS } from '../../lib/utils';
import QtyInput from './QtyInput';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const { cart, updateQty, removeLine } = useApp();
  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-[70] bg-coal/50 backdrop-blur-[2px]"
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-[71] flex h-full w-[min(94vw,400px)] flex-col bg-white shadow-card"
          >
            <header className="flex items-center justify-between border-b border-coal/10 px-5 py-4">
              <h2 className="font-display text-lg font-extrabold">Your cart ({cart.length})</h2>
              <button onClick={onClose} aria-label="Close cart" className="rounded-lg p-2 hover:bg-coal/5">
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-display text-base font-bold">Cart is empty</p>
                  <p className="mt-1 text-sm text-coal/60">Add something tasty from the menu.</p>
                  <Link to="/menu" onClick={onClose} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
                    Browse menu <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {cart.map((l) => (
                    <li key={l.key} className="flex gap-3">
                      <img src={l.image} alt={l.name} className="h-16 w-16 rounded-xl object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{l.name}</p>
                        {l.modifiers.length > 0 && (
                          <p className="truncate text-xs text-coal/55">+ {l.modifiers.map((m) => m.name).join(', ')}</p>
                        )}
                        <p className="text-xs font-semibold text-brand-700">{GHS(l.unitPrice)} each</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <QtyInput id={`cart-${l.key}`} qty={l.qty} onChange={(n) => updateQty(l.key, n)} label={l.name} />
                          <button aria-label={`Remove ${l.name}`} onClick={() => removeLine(l.key)} className="ml-auto rounded-lg p-1.5 text-coal/50 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-extrabold">{GHS(l.unitPrice * l.qty)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cart.length > 0 && (
              <footer className="border-t border-coal/10 px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-coal/60">Subtotal (before fees)</span>
                  <span className="font-display text-lg font-extrabold">{GHS(subtotal)}</span>
                </div>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-coal px-5 py-3 text-sm font-bold text-white hover:bg-black"
                >
                  Go to checkout <ArrowRight size={16} />
                </Link>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
