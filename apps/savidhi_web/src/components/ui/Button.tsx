import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-400',
        variant === 'secondary' && 'bg-primary-50 text-primary-600 hover:bg-primary-100 focus:ring-primary-400',
        variant === 'outline' && 'border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-50 focus:ring-primary-400',
        variant === 'ghost' && 'bg-transparent text-text-secondary hover:bg-gray-100 focus:ring-gray-400',
        size === 'sm' && 'px-4 py-2 text-sm',
        size === 'md' && 'px-6 py-2.5 text-sm',
        size === 'lg' && 'px-8 py-3 text-base',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
