'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Phone, Share2 } from 'lucide-react';
import { settingsService } from '@/lib/services';

interface SupportActionsProps {
  shareTitle: string;
  shareUrl?: string;
}

const FALLBACK_PHONE = '+919528811930';

/** Call Support + Share Status buttons. Used by both booking-details pages.
 *  Pulls support phone from public settings; falls back to default if missing. */
export function SupportActions({ shareTitle, shareUrl }: SupportActionsProps) {
  const [supportPhone, setSupportPhone] = useState<string>(FALLBACK_PHONE);

  useEffect(() => {
    settingsService.get()
      .then((res) => {
        const d = res.data?.data ?? res.data ?? {};
        const phone = d.support_phone ?? d.supportPhone ?? d.contact_phone ?? d.phone ?? null;
        if (phone) setSupportPhone(String(phone));
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  const handleCall = () => {
    if (!supportPhone) {
      toast.error('Support phone not configured');
      return;
    }
    window.location.href = `tel:${supportPhone.replace(/\s+/g, '')}`;
  };

  const handleShare = async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    const payload = { title: shareTitle, text: shareTitle, url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleCall}
        disabled={false}
        className="flex-1 btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Phone className="w-4 h-4" />
        Call Support
      </button>
      <button
        onClick={handleShare}
        className="flex-1 btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
      >
        <Share2 className="w-4 h-4" />
        Share Status
      </button>
    </div>
  );
}
