'use client';

import { Bell, MessageSquare, Settings, UserCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-end px-6 gap-3">
      <button className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center hover:bg-border transition-colors">
        <Bell size={16} className="text-muted-foreground" />
      </button>
      <button className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center hover:bg-border transition-colors">
        <MessageSquare size={16} className="text-muted-foreground" />
      </button>
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
        <UserCircle size={18} className="text-primary" />
      </div>
      <button className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center hover:bg-border transition-colors">
        <Settings size={16} className="text-muted-foreground" />
      </button>
    </header>
  );
}
