'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, User, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import svlogo from '@/assets/svlogo.png';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Puja', href: '/puja' },
  { label: 'Chadhava', href: '/chadhava' },
  { label: 'Temples', href: '/temples' },
  { label: 'Consult', href: '/consult' },
  { label: 'Panchang', href: '/panchang' },
  { label: 'Points', href: '/points' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border-light shadow-sm">
      <div className="section-container">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image src={svlogo} alt="सविधि" width={96} height={96} className="h-20 w-auto" priority />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-5 py-2 rounded-full text-[15px] font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-primary-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-1.5 text-[15px] text-text-secondary hover:text-text-primary transition-colors">
              <Globe className="w-[18px] h-[18px]" />
              <span>En</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/profile"
              className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors"
            >
              <User className="w-5 h-5 text-primary-500" />
            </Link>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-text-primary" />
              ) : (
                <Menu className="w-5 h-5 text-text-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border-light bg-white">
          <nav className="section-container py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:bg-primary-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
