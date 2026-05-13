'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
import { settingsService } from '@/lib/services';

interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export default function ContactPage() {
  const [info, setInfo] = useState<ContactInfo>({});

  useEffect(() => {
    settingsService.get()
      .then((res) => {
        const d = res.data?.data ?? res.data ?? {};
        setInfo({
          phone: d.support_phone ?? d.supportPhone ?? d.contact_phone ?? d.phone ?? undefined,
          email: d.support_email ?? d.contact_email ?? d.email ?? undefined,
          address: d.address ?? d.contact_address ?? undefined,
        });
      })
      .catch(() => { /* fall back to defaults */ });
  }, []);

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:text-primary-500 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Contact Us</h1>
      </div>

      <p className="text-sm text-text-secondary mb-6 leading-relaxed">
        We&apos;re here to help. Reach out by phone, email, or visit our office. Our team responds within one business day.
      </p>

      <div className="space-y-3">
        {info.phone && (
          <a
            href={`tel:${info.phone.replace(/\s+/g, '')}`}
            className="flex items-center gap-3 bg-white border border-orange-100 rounded-xl px-4 py-3.5 hover:border-primary-300 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Phone</p>
              <p className="text-sm font-semibold text-text-primary">{info.phone}</p>
            </div>
          </a>
        )}
        {info.email && (
          <a
            href={`mailto:${info.email}`}
            className="flex items-center gap-3 bg-white border border-orange-100 rounded-xl px-4 py-3.5 hover:border-primary-300 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm font-semibold text-text-primary">{info.email}</p>
            </div>
          </a>
        )}
        {info.address && (
          <div className="flex items-center gap-3 bg-white border border-orange-100 rounded-xl px-4 py-3.5">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Office</p>
              <p className="text-sm font-semibold text-text-primary">{info.address}</p>
            </div>
          </div>
        )}
        {!info.phone && !info.email && !info.address && (
          <p className="text-sm text-text-secondary">
            Contact information will be available soon. Please check back later.
          </p>
        )}
      </div>
    </div>
  );
}
