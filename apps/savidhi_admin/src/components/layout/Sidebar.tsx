'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Gift,
  CalendarCheck,
  FileText,
  Flame,
  Package,
  Landmark,
  Sparkles,
  Users,
  Star,
  UserCircle,
  Box,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import svlogo from '@/assets/svlogo.png';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/puja-bookings', label: 'Puja Bookings', icon: BookOpen },
  { href: '/dashboard/chadhava-bookings', label: 'Chadhava Bookings', icon: Gift },
  { href: '/dashboard/appointments', label: 'Appointments', icon: CalendarCheck },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/pujas', label: 'Pujas', icon: Flame },
  { href: '/dashboard/chadhavas', label: 'Chadhavas', icon: Package },
  { href: '/dashboard/temples', label: 'Temples', icon: Landmark },
  { href: '/dashboard/deities', label: 'Type Of Deities', icon: Sparkles },
  { href: '/dashboard/pujaris', label: 'Pujaris', icon: Users },
  { href: '/dashboard/astrologers', label: 'Astrologers', icon: Star },
  { href: '/dashboard/devotees', label: 'Devotees', icon: UserCircle },
  { href: '/dashboard/hampers', label: 'Hampers', icon: Box },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[200px] min-h-screen bg-card border-r border-border flex flex-col py-4 px-3 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-6">
        <Image src={svlogo} alt="Savidhi" width={32} height={32} className="h-8 w-auto" />
        <span className="text-sm font-bold text-foreground tracking-wide">Savidhi</span>
      </Link>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'sidebar-item text-xs',
              isActive(href) ? 'sidebar-item-active' : 'sidebar-item-inactive'
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
