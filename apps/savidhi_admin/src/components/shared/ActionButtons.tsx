'use client';

import { Eye, Edit, Trash2, ChevronDown, Download, Clock, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  onClick?: () => void;
  className?: string;
}

export function ViewButton({ onClick, className }: ActionButtonProps) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors', className)}>
      <Eye size={13} />
    </button>
  );
}

export function EditButton({ onClick, className }: ActionButtonProps) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors', className)}>
      <Edit size={13} />
    </button>
  );
}

export function DeleteButton({ onClick, className }: ActionButtonProps) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors', className)}>
      <Trash2 size={13} />
    </button>
  );
}

export function ExpandButton({ onClick, expanded, className }: ActionButtonProps & { expanded?: boolean }) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors', className)}>
      <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
    </button>
  );
}

export function DownloadButton({ onClick, className }: ActionButtonProps) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors', className)}>
      <Download size={13} />
    </button>
  );
}

export function CopyButton({ onClick, className }: ActionButtonProps) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors', className)}>
      <Copy size={13} />
    </button>
  );
}

export function ScheduleButton({ onClick, className }: ActionButtonProps) {
  return (
    <button onClick={onClick} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors', className)}>
      <Clock size={13} />
    </button>
  );
}

export function PrimaryButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity',
        className
      )}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 border border-primary text-primary rounded-md text-xs font-semibold hover:bg-primary/10 transition-colors',
        className
      )}
    >
      {children}
    </button>
  );
}
