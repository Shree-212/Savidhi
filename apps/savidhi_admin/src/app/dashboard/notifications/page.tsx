'use client';

import { useState } from 'react';
import { notificationService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

type Audience = 'ALL' | 'ACTIVE_PUJA_BOOKING' | 'EVENT_DEVOTEES' | 'SPECIFIC';
type Channel = 'IN_APP' | 'SMS' | 'WHATSAPP';

const AUDIENCE_OPTIONS: { value: Audience; label: string; help: string }[] = [
  { value: 'ALL', label: 'All devotees (broadcast)', help: 'Single broadcast row visible to every devotee.' },
  { value: 'ACTIVE_PUJA_BOOKING', label: 'Devotees with active puja booking', help: 'Anyone with a NOT_STARTED or INPROGRESS puja booking.' },
  { value: 'EVENT_DEVOTEES', label: 'Devotees in a specific event', help: 'Enter a puja or chadhava event id below.' },
  { value: 'SPECIFIC', label: 'Specific devotees (paste IDs)', help: 'Comma-separated devotee UUIDs.' },
];

export default function NotificationsPage() {
  const [audience, setAudience] = useState<Audience>('ALL');
  const [pujaEventId, setPujaEventId] = useState('');
  const [chadhavaEventId, setChadhavaEventId] = useState('');
  const [devoteeIdsRaw, setDevoteeIdsRaw] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['IN_APP']);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (c: Channel) => {
    setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const handleSend = async () => {
    setError(null);
    setResult(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    if (channels.length === 0) {
      setError('Pick at least one channel.');
      return;
    }
    if (audience === 'EVENT_DEVOTEES' && !pujaEventId && !chadhavaEventId) {
      setError('Provide a puja or chadhava event id.');
      return;
    }
    if (audience === 'SPECIFIC' && !devoteeIdsRaw.trim()) {
      setError('Paste at least one devotee id.');
      return;
    }
    try {
      setSending(true);
      const payload: any = {
        audience,
        channels,
        title: title.trim(),
        body: body.trim(),
        deep_link_path: deepLink.trim() || undefined,
      };
      if (audience === 'EVENT_DEVOTEES') {
        if (pujaEventId) payload.puja_event_id = pujaEventId.trim();
        if (chadhavaEventId) payload.chadhava_event_id = chadhavaEventId.trim();
      }
      if (audience === 'SPECIFIC') {
        payload.devotee_ids = devoteeIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);
      }
      const res = await notificationService.send(payload);
      setResult(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const smsChars = body.length;
  const smsParts = Math.ceil(smsChars / 160);

  return (
    <div>
      <PageHeader />

      <div className="max-w-3xl space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold mb-1">Compose Notification</h2>
          <p className="text-xs text-muted-foreground">
            Send an in-app, SMS, or WhatsApp message to one or many devotees.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider">Audience</label>
          <div className="space-y-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value={opt.value}
                  checked={audience === opt.value}
                  onChange={() => setAudience(opt.value)}
                  className="mt-1"
                />
                <div>
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground">{opt.help}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {audience === 'EVENT_DEVOTEES' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Puja Event ID</label>
              <input
                value={pujaEventId}
                onChange={(e) => setPujaEventId(e.target.value)}
                placeholder="UUID"
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Chadhava Event ID</label>
              <input
                value={chadhavaEventId}
                onChange={(e) => setChadhavaEventId(e.target.value)}
                placeholder="UUID"
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs"
              />
            </div>
          </div>
        )}

        {audience === 'SPECIFIC' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Devotee IDs (comma-separated)</label>
            <textarea
              rows={3}
              value={devoteeIdsRaw}
              onChange={(e) => setDevoteeIdsRaw(e.target.value)}
              placeholder="uuid1, uuid2, uuid3"
              className="w-full px-3 py-2 bg-accent border border-border rounded-md text-xs"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider">Channels</label>
          <div className="flex gap-4 flex-wrap">
            {(['IN_APP', 'SMS', 'WHATSAPP'] as Channel[]).map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes(c)}
                  onChange={() => toggleChannel(c)}
                />
                <span className="text-xs">{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Short headline (max 120 chars)"
            className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Body</label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body"
            className="w-full px-3 py-2 bg-accent border border-border rounded-md text-xs"
          />
          {channels.includes('SMS') && (
            <div className="text-[10px] text-muted-foreground mt-1">
              SMS: {smsChars} chars ≈ {smsParts} SMS segment{smsParts !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Deep Link Path (optional)</label>
          <input
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="/bookings/puja/abc-123"
            className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs"
          />
        </div>

        {error && (
          <div className="text-xs text-red-500 border border-red-300 bg-red-50 rounded-md p-3">{error}</div>
        )}

        {result && (
          <div className="text-xs bg-accent border border-border rounded-md p-3">
            Sent. Targets: {result.targets_count ?? 'broadcast'}, In-app inserted: {result.in_app_inserted}, other channels logged: {result.other_channels_logged}
          </div>
        )}

        <div className="flex gap-3">
          <OutlineButton className="flex-1" onClick={() => { setTitle(''); setBody(''); setDeepLink(''); setResult(null); setError(null); }}>
            Reset
          </OutlineButton>
          <PrimaryButton className="flex-1" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
