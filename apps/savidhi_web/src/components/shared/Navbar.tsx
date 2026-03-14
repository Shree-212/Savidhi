'use client';

import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

export function Navbar() {
  return (
    <nav className="w-full bg-white border-b border-gray-100 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href={ROUTES.HOME} className="text-xl font-bold text-primary-700">
          Savidhi
        </Link>
        <div className="flex gap-6">
          <Link href={ROUTES.ABOUT} className="text-sm text-gray-600 hover:text-primary-700 transition-colors">
            About
          </Link>
          <Link href={ROUTES.CONTACT} className="text-sm text-gray-600 hover:text-primary-700 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}
