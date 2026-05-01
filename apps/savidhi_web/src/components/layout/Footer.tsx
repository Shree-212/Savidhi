'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import svlogo from '@/assets/svlogo.png';
import { useT } from '@/lib/i18n';

const QUICK_KEYS = [
  { key: 'home.howToBook.bookPuja', href: '/puja' },
  { key: 'nav.chadhava', href: '/chadhava' },
  { key: 'nav.temples', href: '/temples' },
  { key: 'nav.consult', href: '/consult' },
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
      <div className="section-container py-10 sm:py-12">
        {/* Top: brand block */}
        <div className="space-y-4 max-w-md mb-8 sm:mb-10">
          <Image
            src={svlogo}
            alt="सविधि"
            width={40}
            height={40}
            className="h-10 w-auto brightness-0 invert"
          />
          <p className="text-sm text-gray-400 leading-relaxed">
            {t('footer.tagline')}
          </p>
          <div className="flex gap-3 flex-wrap">
            <div className="h-10 px-3 bg-gray-800 rounded-lg flex items-center gap-2 text-xs">
              <span>▶</span>
              <div>
                <div className="text-[9px] text-gray-400 leading-none">GET IT ON</div>
                <div className="font-semibold leading-tight">Google Play</div>
              </div>
            </div>
            <div className="h-10 px-3 bg-gray-800 rounded-lg flex items-center gap-2 text-xs">
              <span></span>
              <div>
                <div className="text-[9px] text-gray-400 leading-none">Download on the</div>
                <div className="font-semibold leading-tight">App Store</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mid: link columns + contact */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 pb-8 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-gray-200">
              {t('footer.product.title')}
            </h3>
            <ul className="space-y-2">
              {QUICK_KEYS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-primary-300 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-gray-200">
              {t('footer.legal.title')}
            </h3>
            <ul className="space-y-2">
              {POLICY_KEYS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-primary-300 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Contact */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-gray-200">
              {t('footer.contact.title')}
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <span className="text-gray-200 font-semibold">VAIDIK VIKHYAT ASTRO PRIVATE LIMITED</span>
                  <br />
                  {t('footer.address')}
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <a href="tel:+919455567776" className="hover:text-primary-300 transition block">
                    +91 9455567776
                  </a>
                  <a href="tel:+918234567890" className="hover:text-primary-300 transition block">
                    +91 8234567890
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <a href="mailto:support@savidhi.com" className="hover:text-primary-300 transition">
                  support@savidhi.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom: copyright */}
        <p className="text-xs text-gray-500 text-center pt-6 leading-relaxed">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
