import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const btn = cva(
  'focus-visible-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white shadow-warm hover:brightness-95',
        secondary: 'bg-coal text-white hover:brightness-125',
        outline: 'border border-coal/15 bg-white hover:bg-coal/5',
        ghost: 'hover:bg-coal/5',
        leaf: 'bg-leaf text-white hover:brightness-105',
      },
      size: { default: 'h-11 px-5', sm: 'h-9 px-3.5', lg: 'h-13 px-7 py-3.5 text-base', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof btn> {}

export function Button({ className, variant, size, ...p }: ButtonProps) {
  return <button className={cn(btn({ variant, size }), className)} {...p} />;
}
