import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import svlogo from '@/assets/svlogo.png';

const QUICK_LINKS = [
  { label: 'Book A Puja', href: '/puja' },
  { label: 'Offer Chadhava', href: '/chadhava' },
  { label: 'Explore Temples', href: '/temples' },
  { label: 'Consult Astrologer', href: '/consult' },
  { label: 'Today\'s Panchang', href: '/panchang' },
  { label: 'My Bookings', href: '/bookings' },
];

export function Footer() {
  return (
    <footer className="bg-text-primary text-white">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & App Store */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src={svlogo} alt="सविधि" width={40} height={40} className="h-10 w-auto brightness-0 invert" />
            </div>
            <p className="text-sm text-gray-400">
              Your trusted platform for online puja booking, chadhava offerings, and spiritual consultations.
            </p>
            <div className="flex gap-3">
              <div className="h-10 px-4 bg-gray-800 rounded-lg flex items-center gap-2 text-xs">
                <span>▶</span>
                <div>
                  <div className="text-[10px] text-gray-400">GET IT ON</div>
                  <div className="font-semibold">Google Play</div>
                </div>
              </div>
              <div className="h-10 px-4 bg-gray-800 rounded-lg flex items-center gap-2 text-xs">
                <span></span>
                <div>
                  <div className="text-[10px] text-gray-400">Download on the</div>
                  <div className="font-semibold">App Store</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-base mb-4">Quick Links</h3>
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

          {/* Contact Us */}
          <div>
            <h3 className="font-semibold text-base mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p>+91 9455567776</p>
                  <p>+91 8234567890</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <span>support@savidhi.com</span>
              </li>
            </ul>
          </div>

          {/* Company & Office */}
          <div>
            <h3 className="font-semibold text-base mb-4">Company & Office</h3>
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Savidhi Spiritual Pvt. Ltd.<br />
                123, Divine Tower, MG Road<br />
                Ahmedabad, Gujarat - 380001
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Savidhi. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-gray-500 hover:text-gray-300">Privacy Policy</Link>
            <Link href="#" className="text-xs text-gray-500 hover:text-gray-300">Terms of Service</Link>
            <Link href="#" className="text-xs text-gray-500 hover:text-gray-300">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
