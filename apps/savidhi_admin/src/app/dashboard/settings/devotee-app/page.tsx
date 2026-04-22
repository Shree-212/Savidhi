'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { settingsService, pujaService } from '@/lib/services';
import { PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

/**
 * "Devotee App Settings" — split from the main /dashboard/settings page.
 *
 * Controls what the mobile + web devotee apps see:
 *   - Home-screen puja carousel (home_puja_slider_ids ordered list)
 *   - WhatsApp support number
 *   - Call support number
 *
 * Matches Figma wireframe node 143:8757.
 */

interface Puja { id: string; name: string; temple_name?: string }

export default function DevoteeAppSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [allPujas, setAllPujas] = useState<Puja[]>([]);
  const [sliderIds, setSliderIds] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [call, setCall] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, p] = await Promise.all([
        settingsService.get(),
        pujaService.list({ limit: 200 }),
      ]);
      const settings = s.data?.data ?? {};
      setSliderIds(settings.home_puja_slider_ids ?? []);
      setWhatsapp(settings.whatsapp_support_number ?? '');
      setCall(settings.call_support_number ?? '');
      setAllPujas(p.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const availablePujas = allPujas.filter((p) => !sliderIds.includes(p.id));
  const selectedPujas = sliderIds
    .map((id) => allPujas.find((p) => p.id === id))
    .filter(Boolean) as Puja[];

  const addToSlider = (pujaId: string) => {
    setSliderIds((prev) => (prev.includes(pujaId) ? prev : [...prev, pujaId]));
  };

  const removeFromSlider = (pujaId: string) => {
    setSliderIds((prev) => prev.filter((id) => id !== pujaId));
  };

  const move = (pujaId: string, dir: -1 | 1) => {
    setSliderIds((prev) => {
      const idx = prev.indexOf(pujaId);
      if (idx === -1) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setOk(false);
      await settingsService.update({
        home_puja_slider_ids: sliderIds,
        whatsapp_support_number: whatsapp,
        call_support_number: call,
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading settings…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Devotee App Settings</h1>
          <p className="text-xs text-muted-foreground">
            Controls what mobile + web devotees see on the home screen and in the support widget.
          </p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">{error}</div>}
      {ok && <div className="p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">Settings saved.</div>}

      {/* Home carousel */}
      <section className="border border-border rounded-lg p-5 bg-card space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Home Puja Carousel</h2>
          <p className="text-xs text-muted-foreground">
            Ordered list of pujas shown in the hero carousel on the devotee home screen.
            Drag-reorder (top to bottom = left to right on the device).
          </p>
        </div>

        {selectedPujas.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No pujas selected — carousel will be empty.</p>
        ) : (
          <div className="space-y-2">
            {selectedPujas.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 border border-border rounded-md p-3 bg-accent/30">
                <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  {p.temple_name && <p className="text-xs text-muted-foreground">{p.temple_name}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => move(p.id, -1)}
                    disabled={i === 0}
                    className="w-7 h-7 rounded border border-border hover:border-primary disabled:opacity-30 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(p.id, 1)}
                    disabled={i === selectedPujas.length - 1}
                    className="w-7 h-7 rounded border border-border hover:border-primary disabled:opacity-30 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFromSlider(p.id)}
                    className="w-7 h-7 rounded border border-red-300 text-red-500 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {availablePujas.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Add a puja</p>
            <div className="flex flex-wrap gap-2">
              {availablePujas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToSlider(p.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-full bg-accent hover:border-primary"
                >
                  <Plus className="w-3 h-3" /> {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Support numbers */}
      <section className="border border-border rounded-lg p-5 bg-card space-y-3">
        <h2 className="text-sm font-semibold">Support Contacts</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp Support Number</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="919876543210"
              className="w-full h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Call Support Number</label>
            <input
              type="tel"
              value={call}
              onChange={(e) => setCall(e.target.value)}
              placeholder="918234567890"
              className="w-full h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground mt-1 font-mono"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-background border-t border-border pt-4 -mx-6 px-6 pb-4">
        <OutlineButton onClick={load}>Reset</OutlineButton>
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </PrimaryButton>
      </div>
    </div>
  );
}
