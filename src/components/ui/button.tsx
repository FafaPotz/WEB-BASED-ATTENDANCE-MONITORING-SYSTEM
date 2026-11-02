import React from 'react';
import { cn } from '../../lib/utils.ts';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    const variants: Record<string, string> = {
      default: 'bg-emerald-600 text-white shadow hover:bg-emerald-700 active:scale-[0.99]',
      destructive: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-[0.99]',
      outline: 'border border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 active:scale-[0.99]',
      secondary: 'bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200',
      ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
      link: 'text-emerald-600 underline-offset-4 hover:underline'
    };

    const sizes: Record<string, string> = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-lg px-6 text-base',
      icon: 'h-10 w-10'
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
