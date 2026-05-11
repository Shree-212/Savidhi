'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, User, ChevronDown, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import svlogo from '@/assets/svlogo.png';
import { useLocale, useT, type Locale } from '@/lib/i18n';

const NAV_KEYS: { key: string; href: string }[] = [
  { key: 'nav.home',     href: '/' },
  { key: 'nav.puja',     href: '/puja' },
  { key: 'nav.chadhava', href: '/chadhava' },
  { key: 'nav.temples',  href: '/temples' },
  { key: 'nav.panchang', href: '/panchang' },
  { key: 'nav.points',   href: '/points' },
];

export function Header() {
  const pathname = usePathname();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [langOpen]);

  const pickLocale = (l: Locale) => { setLocale(l); setLangOpen(false); };

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
            {NAV_KEYS.map((link) => (
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
                {t(link.key)}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div ref={langRef} className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={langOpen}
                className="flex items-center gap-1.5 text-[15px] text-text-secondary hover:text-text-primary transition-colors"
              >
                <Globe className="w-[18px] h-[18px]" />
                <span>{locale === 'hi' ? t('lang.short.hi') : t('lang.short.en')}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', langOpen && 'rotate-180')} />
              </button>
              {langOpen && (
                <ul role="menu" className="absolute right-0 mt-2 w-40 bg-white border border-border-light rounded-xl shadow-lg overflow-hidden z-50">
                  {(['en', 'hi'] as const).map((l) => (
                    <li key={l}>
                      <button
                        onClick={() => pickLocale(l)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-primary-50 transition-colors"
                      >
                        <span>{l === 'en' ? t('lang.english') : t('lang.hindi')}</span>
                        {locale === l && <Check className="w-4 h-4 text-primary-500" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            {NAV_KEYS.map((link) => (
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
                {t(link.key)}
              </Link>
            ))}
            {/* Mobile language picker */}
            <div className="mt-2 border-t border-border-light pt-3 px-1">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">{t('lang.english')} / {t('lang.hindi')}</p>
              <div className="flex gap-2">
                {(['en', 'hi'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLocale(l); setMobileMenuOpen(false); }}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                      locale === l ? 'bg-primary-500 text-white border-primary-500' : 'border-border-light text-text-secondary',
                    )}
                  >
                    {l === 'en' ? t('lang.english') : t('lang.hindi')}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
