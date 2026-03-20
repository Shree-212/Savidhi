'use client';

import { X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  statusBadge?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}

export function Modal({ open, onClose, title, statusBadge, onBack, children, className, wide }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={cn(
          'bg-card border border-border rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-thin',
          wide ? 'w-full max-w-2xl' : 'w-full max-w-md',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
            {statusBadge}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
