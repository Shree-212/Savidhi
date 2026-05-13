import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'About Savidhi' };

export default function AboutPage() {
  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:text-primary-500 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">About Savidhi</h1>
      </div>

      <div className="prose prose-orange max-w-none text-sm text-text-secondary leading-relaxed space-y-4">
        <p>
          Savidhi is a platform for booking online pujas, chadhava offerings, and astrologer
          consultations from trusted temples and pandits across India. We bring centuries-old
          rituals to the convenience of your home — performed authentically, on your behalf,
          at the temples you trust.
        </p>
        <p>
          Each puja and chadhava is performed by qualified pandits in partnered temples. You
          receive live streams, short videos of the ceremony, and a personalised sankalp video
          with your name and gotra recited during the ritual. For pujas that include prasad,
          we ship the consecrated offerings to your address.
        </p>
        <p>
          We&apos;re building Savidhi to be the most reliable, transparent, and respectful way
          to participate in devotional services online. If you have feedback or questions,
          please don&apos;t hesitate to reach out via <Link href="/contact" className="text-primary-500 underline">Contact Us</Link>.
        </p>
        <p className="text-xs text-text-muted">
          Operated by Vaidik Vikhyat Astro Pvt Ltd.
        </p>
      </div>
    </div>
  );
}
