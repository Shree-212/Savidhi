import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import svlogo from '@/assets/svlogo.png';

const QUICK_LINKS = [
  { label: 'Book A Puja', href: '/puja' },
  { label: 'Offer Chadhava', href: '/chadhava' },
  { label: 'Explore Temples', href: '/temples' },
  { label: 'Consult Astrologer', href: '/consult' },
  { label: "Today's Panchang", href: '/panchang' },
  { label: 'My Bookings', href: '/bookings' },
];

const POLICY_LINKS = [
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy & Cookie Policy', href: '/privacy' },
  { label: 'Refund & Cancellation', href: '/refund' },
  { label: 'Vendor Terms', href: '/vendor-terms' },
];

export function Footer() {
  return (
    <footer className="bg-text-primary text-white">
      <div className="section-container py-10 sm:py-12">
        {/* Top: brand block — full width on mobile, narrows on desktop */}
        <div className="space-y-4 max-w-md mb-8 sm:mb-10">
          <Image
            src={svlogo}
            alt="सविधि"
            width={40}
            height={40}
            className="h-10 w-auto brightness-0 invert"
          />
          <p className="text-sm text-gray-400 leading-relaxed">
            Your trusted platform for online puja booking, chadhava offerings, and spiritual consultations.
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

        {/* Mid: link columns + contact. 2-col on mobile (Quick + Legal),
            3-col on desktop with Contact taking the third slot. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 pb-8 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-gray-200">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-primary-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-gray-200">
              Legal
            </h3>
            <ul className="space-y-2">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-primary-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Contact — full row on mobile (col-span-2), single col on md+ */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-gray-200">
              Company &amp; Contact
            </h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <span className="text-gray-200 font-semibold">VAIDIK VIKHYAT ASTRO PRIVATE LIMITED</span>
                  <br />
                  Registered office: Kolkata, India
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

        {/* Bottom: copyright only — policy links live in the Legal column above. */}
        <p className="text-xs text-gray-500 text-center pt-6 leading-relaxed">
          &copy; {new Date().getFullYear()} VAIDIK VIKHYAT ASTRO PRIVATE LIMITED.
          <span className="hidden sm:inline"> All rights reserved.</span>
          <span className="sm:hidden">
            <br />All rights reserved.
          </span>
        </p>
      </div>
    </footer>
  );
}
