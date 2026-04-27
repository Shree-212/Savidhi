'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  ChevronDown,
  LogOut,
  MessageSquare,
  Settings,
  UserCircle,
} from 'lucide-react';
import svlogo from '@/assets/svlogo.png';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type NavLeaf = { href: string; label: string };
type NavGroup = { label: string; items: NavLeaf[] };

// Top-level horizontal nav. Dashboard is a direct link; everything else lives
// under one of four grouped dropdowns to keep the bar tidy on narrower screens.
const DASHBOARD: NavLeaf = { href: '/dashboard', label: 'Dashboard' };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Bookings',
    items: [
      { href: '/dashboard/puja-bookings', label: 'Puja Bookings' },
      { href: '/dashboard/chadhava-bookings', label: 'Chadhava Bookings' },
      { href: '/dashboard/appointments', label: 'Appointments' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/dashboard/pujas', label: 'Pujas' },
      { href: '/dashboard/chadhavas', label: 'Chadhavas' },
      { href: '/dashboard/temples', label: 'Temples' },
      { href: '/dashboard/deities', label: 'Type Of Deities' },
      { href: '/dashboard/hampers', label: 'Hampers' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/dashboard/pujaris', label: 'Pujaris' },
      { href: '/dashboard/astrologers', label: 'Astrologers' },
      { href: '/dashboard/devotees', label: 'Devotees' },
      { href: '/dashboard/admin-users', label: 'Admin Users' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/dashboard/reports', label: 'Reports' },
    ],
  },
];

function NavGroupMenu({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = group.items.some((i) => pathname.startsWith(i.href));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 px-3 h-9 rounded-md text-xs transition-colors',
          active
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        {group.label}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 min-w-[200px] rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 py-1"
        >
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block px-3 py-2 text-xs transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-accent',
              )}
              role="menuitem"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
      >
        <UserCircle size={18} className="text-primary" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            {user?.role && <p className="text-[10px] text-primary mt-0.5">{user.role}</p>}
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); void logout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
            role="menuitem"
          >
            <LogOut size={14} className="text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const dashActive = pathname === '/dashboard';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        <Image src={svlogo} alt="Savidhi" width={28} height={28} className="h-7 w-auto" />
        <span className="text-sm font-bold text-foreground tracking-wide">Savidhi</span>
      </Link>

      <nav className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
        <Link
          href={DASHBOARD.href}
          className={cn(
            'flex items-center gap-1.5 px-3 h-9 rounded-md text-xs transition-colors',
            dashActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <LayoutDashboard size={14} />
          {DASHBOARD.label}
        </Link>
        {NAV_GROUPS.map((g) => (
          <NavGroupMenu key={g.label} group={g} pathname={pathname} />
        ))}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <button className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center hover:bg-border transition-colors" aria-label="Notifications">
          <Bell size={16} className="text-muted-foreground" />
        </button>
        <button className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center hover:bg-border transition-colors" aria-label="Messages">
          <MessageSquare size={16} className="text-muted-foreground" />
        </button>
        <Link
          href="/dashboard/settings"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            pathname.startsWith('/dashboard/settings')
              ? 'bg-primary/10 text-primary'
              : 'bg-accent hover:bg-border text-muted-foreground',
          )}
          aria-label="Settings"
        >
          <Settings size={16} />
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
