'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  Phone,
  Edit2,
  BookOpen,
  Calendar,
  Gem,
  ChevronRight,
  Users,
  MapPin,
  CreditCard,
  Bell,
  Globe,
  Shield,
  HelpCircle,
  Mail,
  Info,
  LogOut,
} from 'lucide-react';
import { MOCK_USER } from '@/data';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Bookings',
    items: [
      { icon: BookOpen, label: 'Puja Bookings', href: '/bookings/puja', badge: 3 },
      { icon: Calendar, label: 'Appointments', href: '/bookings/appointments', badge: 1 },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: Users, label: 'My Family', href: '#' },
      { icon: MapPin, label: 'Saved Addresses', href: '#' },
      { icon: CreditCard, label: 'Payment Methods', href: '#' },
    ],
  },
  {
    title: 'App Settings',
    items: [
      { icon: Bell, label: 'Notifications', href: '#' },
      { icon: Globe, label: 'Language', href: '#' },
      { icon: Shield, label: 'Privacy', href: '#' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & FAQ', href: '#' },
      { icon: Mail, label: 'Contact Us', href: '#' },
      { icon: Info, label: 'About Savidhi', href: '#' },
    ],
  },
];

export default function ProfilePage() {
  const user = MOCK_USER;

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      {/* User Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            <Image src={user.imageUrl} alt={user.name} fill className="object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-text-primary">{user.name}</h1>
            <p className="text-sm text-text-secondary flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              +91 {user.phone}
            </p>
          </div>
          <button className="p-2 rounded-full hover:bg-surface-warm transition">
            <Edit2 className="w-4 h-4 text-primary-500" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-3 divide-x divide-border-DEFAULT text-center">
          <div>
            <p className="text-lg font-bold text-primary-500">{user.pujaBooked}</p>
            <p className="text-xs text-text-muted">Pujas Booked</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary-500">{user.appointments}</p>
            <p className="text-xs text-text-muted">Appointments</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Gem className="w-4 h-4 text-primary-500" />
              <p className="text-lg font-bold text-primary-500">{user.gems}</p>
            </div>
            <p className="text-xs text-text-muted">Gems</p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="space-y-4">
        {menuSections.map((section) => (
          <div key={section.title} className="card overflow-hidden">
            <p className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              {section.title}
            </p>
            {section.items.map((item, idx) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-warm transition ${
                  idx < section.items.length - 1 ? 'border-b border-border-DEFAULT' : ''
                }`}
              >
                <item.icon className="w-5 h-5 text-text-secondary" />
                <span className="flex-1 text-sm text-text-primary">{item.label}</span>
                {item.badge && (
                  <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Logout */}
      <button className="w-full mt-6 py-3 rounded-xl border border-status-error text-status-error font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition">
        <LogOut className="w-4 h-4" />
        Logout
      </button>

      {/* Version */}
      <p className="text-center text-xs text-text-muted mt-4">Version 1.0.0</p>
    </div>
  );
}
