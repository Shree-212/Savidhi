'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { astrologerService } from '@/lib/services';
import { apiClient } from '@/lib/api';
import { PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

const DAYS = [
  { key: 'SUN', label: 'Sun' },
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
];

interface Blackout { blackout_date: string; reason?: string; created_at: string }

export default function AstrologerOffDaysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [astrologer, setAstrologer] = useState<any>(null);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [aRes, bRes] = await Promise.all([
        astrologerService.getById(id),
        apiClient.get(`/catalog/astrologers/${id}/blackouts`),
      ]);
      const a = aRes.data?.data ?? aRes.data;
      setAstrologer(a);
      setOffDays(a.off_days ?? []);
      setBlackouts(bRes.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (d: string) => {
    setOffDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const saveOffDays = async () => {
    try {
      setSaving(true);
      await apiClient.patch(`/catalog/astrologers/${id}/off-days`, { off_days: offDays });
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addBlackout = async () => {
    if (!newDate) return;
    try {
      setSaving(true);
      await apiClient.post(`/catalog/astrologers/${id}/blackouts`, { dates: [newDate], reason: newReason || null });
      setNewDate('');
      setNewReason('');
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Add failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteBlackout = async (date: string) => {
    if (!confirm(`Remove blackout for ${date}?`)) return;
    try {
      await apiClient.delete(`/catalog/astrologers/${id}/blackouts/${date}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Delete failed');
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (error) return (
    <div className="p-6">
      <p className="text-sm text-red-500 mb-3">{error}</p>
      <OutlineButton onClick={load}>Retry</OutlineButton>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/astrologers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Off-Day Management — {astrologer?.name}</h1>
          <p className="text-xs text-muted-foreground">
            Off-days block appointment slots. Weekly recurring days apply every week; blackout dates apply to a single specific date (holidays, travel).
          </p>
        </div>
      </div>

      {/* Recurring off-days */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Recurring Weekly Off-Days</h2>
        <div className="flex gap-2 mb-4">
          {DAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => toggleDay(d.key)}
              className={`flex-1 h-10 rounded-md border text-xs font-medium transition ${
                offDays.includes(d.key)
                  ? 'bg-primary text-white border-primary'
                  : 'border-border bg-accent hover:border-primary'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={saveOffDays} disabled={saving}>
          {saving ? 'Saving…' : 'Save Off-Days'}
        </PrimaryButton>
      </div>

      {/* One-off blackouts */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Specific Blackout Dates</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground flex-1"
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground flex-1"
          />
          <PrimaryButton onClick={addBlackout} disabled={!newDate || saving}>
            Add
          </PrimaryButton>
        </div>

        {blackouts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No blackout dates set.</p>
        ) : (
          <div className="space-y-2">
            {blackouts.map((b) => (
              <div key={b.blackout_date} className="flex items-center justify-between border border-border rounded-md p-2 text-xs">
                <span className="font-medium">
                  {new Date(b.blackout_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-muted-foreground flex-1 mx-3 truncate">{b.reason ?? '—'}</span>
                <button onClick={() => deleteBlackout(b.blackout_date)} className="text-red-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
