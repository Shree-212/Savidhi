'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    q: 'How do I book a puja?',
    a: 'Browse the Puja section, pick the puja you want, choose an upcoming event date, enter devotee details, and complete payment. You\'ll see live updates in My Bookings.',
  },
  {
    q: 'What is a Chadhava?',
    a: 'A Chadhava is an offering made at a temple on your behalf — flowers, fruits, sweets, or special items associated with the deity. You select the offerings and quantities at the time of booking.',
  },
  {
    q: 'Will I receive prasad?',
    a: 'For pujas and chadhavas that include prasad delivery, the prasad hamper is shipped to the address you provide. Some events do not include prasad delivery — this is indicated on the event details.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Open the booking in My Bookings and use the Cancel option. Cancellations made well before the event are eligible for a refund per our Refund Policy.',
  },
  {
    q: 'When will I get the live stream link?',
    a: 'The live stream link appears in your booking details page once the temple shares it — usually shortly before the event begins. You\'ll see it in the timeline.',
  },
  {
    q: 'Can I see my Sankalp video?',
    a: 'Yes. Once the temple completes your puja or chadhava, a personalised Sankalp video is uploaded to your booking details page under "Your Videos".',
  },
  {
    q: 'What is the Panchang section for?',
    a: 'The Panchang section shows the daily Hindu calendar — tithi, nakshatra, auspicious and inauspicious times — calculated for your selected location.',
  },
  {
    q: 'My payment failed. What now?',
    a: 'Your booking is reserved until payment completes. Retry the payment from the same booking page, or contact support if the issue persists.',
  },
];

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="w-9 h-9 rounded-full bg-white border border-border-DEFAULT flex items-center justify-center text-text-secondary hover:border-primary-300 hover:text-primary-500 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Help & FAQ</h1>
      </div>
      <div className="space-y-2.5">
        {FAQS.map((item, i) => {
          const open = openIdx === i;
          return (
            <div key={i} className="bg-white border border-orange-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-text-primary">{item.q}</span>
                {open ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />}
              </button>
              {open && (
                <div className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">{item.a}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
