import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QtyInputProps {
  id: string;
  qty: number;
  onChange: (qty: number) => void;
  label: string;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

/** Stepper with a directly editable quantity field. */
export default function QtyInput({ id, qty, onChange, label, min = 1, max = 20, size = 'sm' }: QtyInputProps) {
  const btn = size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-10 w-10 rounded-xl';
  const field = size === 'sm' ? 'h-7 w-9 text-sm rounded-lg' : 'h-10 w-14 text-lg rounded-xl';
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(qty - 1)}
        className={cn('grid place-items-center border border-coal/15 hover:bg-cream', btn)}
      >
        <Minus size={size === 'sm' ? 13 : 16} />
      </button>
      <label htmlFor={id} className="sr-only">
        {label} quantity ({min} to {max})
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={qty}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isNaN(n)) return;
          onChange(Math.min(max, Math.max(min, n)));
        }}
        onBlur={(e) => {
          if (e.target.value === '') onChange(min);
        }}
        aria-live="polite"
        className={cn(
          'border border-coal/15 text-center font-display font-extrabold outline-none focus:border-brand-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          field,
        )}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(qty + 1)}
        className={cn('grid place-items-center border border-coal/15 hover:bg-cream', btn)}
      >
        <Plus size={size === 'sm' ? 13 : 16} />
      </button>
    </div>
  );
}
