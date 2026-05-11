'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail } from 'lucide-react';
import svlogo from '@/assets/svlogo.png';
import { useT } from '@/lib/i18n';

const QUICK_KEYS = [
  { key: 'home.howToBook.bookPuja', href: '/puja' },
  { key: 'nav.chadhava', href: '/chadhava' },
  { key: 'nav.temples', href: '/temples' },
  { key: 'nav.panchang', href: '/panchang' },
  { key: 'profile.myBookings', href: '/bookings' },
];

const POLICY_KEYS = [
  { key: 'footer.legal.terms',   href: '/terms' },
  { key: 'footer.legal.privacy', href: '/privacy' },
  { key: 'footer.legal.refund',  href: '/refund' },
  { key: 'footer.legal.vendor',  href: '/vendor-terms' },
];

export function Footer() {
  const t = useT();
  return (
    <footer className="bg-text-primary text-white">
      <div className="section-container py-6 sm:py-8">
        {/* Main row: brand + 3 link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <Image
              src={svlogo}
              alt="सविधि"
              width={32}
              height={32}
              className="h-8 w-auto brightness-0 invert"
            />
            <p className="text-xs text-gray-400 leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-2 flex-wrap">
              <div className="h-8 px-2.5 bg-gray-800 rounded-md flex items-center gap-1.5 text-[11px]">
                <span>▶</span>
                <span className="font-semibold leading-tight">Google Play</span>
              </div>
              <div className="h-8 px-2.5 bg-gray-800 rounded-md flex items-center gap-1.5 text-[11px]">
                <span className="font-semibold leading-tight">App Store</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-2 text-gray-200">
              {t('footer.product.title')}
            </h3>
            <ul className="space-y-1.5">
              {QUICK_KEYS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-400 hover:text-primary-300 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-2 text-gray-200">
              {t('footer.legal.title')}
            </h3>
            <ul className="space-y-1.5">
              {POLICY_KEYS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-400 hover:text-primary-300 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact (no address) */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-2 text-gray-200">
              {t('footer.contact.title')}
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li className="text-gray-200 font-semibold text-[11px] tracking-wide">
                VAIDIK VIKHYAT ASTRO PVT LTD
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0" />
                <a href="tel:+919455567776" className="hover:text-primary-300 transition">
                  +91 9455567776
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0" />
                <a href="tel:+918234567890" className="hover:text-primary-300 transition">
                  +91 8234567890
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 shrink-0" />
                <a href="mailto:support@savidhi.com" className="hover:text-primary-300 transition">
                  support@savidhi.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom: copyright */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-[11px] text-gray-500 text-center">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
