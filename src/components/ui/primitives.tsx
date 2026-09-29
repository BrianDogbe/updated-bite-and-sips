import { cn } from '../../lib/utils';
import * as React from 'react';

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-coal/10 bg-white shadow-card', className)} {...p} />;
}
export function CardBody({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...p} />;
}
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', className)} {...p} />;
}
export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('focus-visible-ring h-11 w-full rounded-xl border border-coal/15 bg-white px-3.5 text-sm outline-none placeholder:text-coal/40 focus:border-brand-500', className)} {...p} />;
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-coal/10', className)} />;
}
export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-coal/20 bg-white/60 p-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {body && <p className="mt-1 text-sm text-coal/60">{body}</p>}
    </div>
  );
}
export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div>
      {kicker && <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{kicker}</p>}
      <h2 className="mt-1 font-display text-2xl font-extrabold md:text-3xl">{title}</h2>
      {sub && <p className="mt-1 text-sm text-coal/60">{sub}</p>}
    </div>
  );
}
