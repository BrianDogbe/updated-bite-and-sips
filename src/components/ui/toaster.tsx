import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface Toast { id: number; title: string; body?: string; kind: 'success' | 'error' | 'info' }
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-start gap-3 rounded-2xl border border-coal/10 bg-coal p-4 text-white shadow-card">
              {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 text-green-400" /> : t.kind === 'error' ? <AlertTriangle className="mt-0.5 text-red-400" /> : <Info className="mt-0.5 text-brand-300" />}
              <div><p className="text-sm font-bold">{t.title}</p>{t.body && <p className="text-xs text-white/70">{t.body}</p>}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
