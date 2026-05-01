'use client';

import { Eye, Edit, Trash2, ChevronDown, Download, Clock, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function ViewButton({ onClick, className, disabled, title }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50', className)}>
      <Eye size={13} />
    </button>
  );
}

export function EditButton({ onClick, className, disabled, title }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50', className)}>
      <Edit size={13} />
    </button>
  );
}

export function DeleteButton({ onClick, className, disabled, title }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50', className)}>
      <Trash2 size={13} />
    </button>
  );
}

export function ExpandButton({ onClick, expanded, className, disabled, title }: ActionButtonProps & { expanded?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50', className)}>
      <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
    </button>
  );
}

export function DownloadButton({ onClick, className, disabled, title }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50', className)}>
      <Download size={13} />
    </button>
  );
}

export function CopyButton({ onClick, className, disabled, title }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50', className)}>
      <Copy size={13} />
    </button>
  );
}

export function ScheduleButton({ onClick, className, disabled, title }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cn('w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50', className)}>
      <Clock size={13} />
    </button>
  );
}

interface BigButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function PrimaryButton({ children, onClick, className, disabled, type = 'button' }: BigButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, onClick, className, disabled, type = 'button' }: BigButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 border border-primary text-primary rounded-md text-xs font-semibold hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}
