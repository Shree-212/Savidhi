'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { templeService, deityService } from '@/lib/services';
import { apiClient } from '@/lib/api';
import { PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle, MediaUploadMulti } from '@/components/shared/MediaUpload';
import { StatusBadge } from '@/components/shared/StatusBadge';

/**
 * Full-page Temple Edit matching the Figma wireframe (142:3801).
 * Complements the modal-based Edit on the /dashboard/temples list page — use
 * this route when you need more screen real estate for image galleries,
 * long-form About/History copy, and deity multi-select.
 *
 * Unlike the modal, this view persists BOTH "unedited" raw uploads (required
 * by the Admin Data Entry CSV contract) AND the polished post-edit media.
 */

interface Temple {
  id: string;
  name: string;
  address: string;
  pincode?: string;
  google_map_link?: string;
  about?: string;
  history_and_significance?: string;
  sample_video_url?: string;
  slider_images?: string[];
  sample_video_url_raw?: string;
  slider_images_raw?: string[];
  is_active: boolean;
  deities?: Array<{ id: string; name: string }>;
}

interface Deity { id: string; name: string }

export default function TempleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [temple, setTemple] = useState<Temple | null>(null);
  const [deities, setDeities] = useState<Deity[]>([]);
  const [selectedDeities, setSelectedDeities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [templeRes, deitiesRes] = await Promise.all([
        templeService.getById(id),
        deityService.list({ limit: 200 }),
      ]);
      const t = templeRes.data?.data ?? templeRes.data;
      setTemple(t);
      setSelectedDeities((t.deities ?? []).map((d: any) => d.id));
      setDeities(deitiesRes.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleDeity = (deityId: string) => {
    setSelectedDeities((prev) =>
      prev.includes(deityId) ? prev.filter((x) => x !== deityId) : [...prev, deityId],
    );
  };

  const handleSave = async () => {
    if (!temple) return;
    try {
      setSaving(true);
      await templeService.update(id, {
        name: temple.name,
        address: temple.address,
        pincode: temple.pincode,
        google_map_link: temple.google_map_link,
        about: temple.about,
        history_and_significance: temple.history_and_significance,
        sample_video_url: temple.sample_video_url,
        slider_images: temple.slider_images ?? [],
        sample_video_url_raw: temple.sample_video_url_raw,
        slider_images_raw: temple.slider_images_raw ?? [],
        deity_ids: selectedDeities,
      });
      // Optimistic redirect back to list
      router.push('/dashboard/temples');
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deactivate this temple? Associated pujas/chadhavas will remain but won\'t be bookable.')) return;
    try {
      await apiClient.delete(`/catalog/temples/${id}`);
      router.push('/dashboard/temples');
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Delete failed');
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading temple…</div>;
  if (error) return (
    <div className="p-6">
      <p className="text-sm text-red-500 mb-3">{error}</p>
      <OutlineButton onClick={load}>Retry</OutlineButton>
    </div>
  );
  if (!temple) return <div className="p-6 text-sm">Temple not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/temples" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Edit Temple</h1>
            <p className="text-xs text-muted-foreground">{temple.id.slice(0, 8)}</p>
          </div>
        </div>
        <StatusBadge status={temple.is_active ? 'ACTIVE' : 'INACTIVE'} />
      </div>

      {/* Basic info */}
      <section className="border border-border rounded-lg p-5 space-y-3 bg-card">
        <h2 className="text-sm font-semibold">Basic Information</h2>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temple Name</label>
          <input
            type="text"
            value={temple.name}
            onChange={(e) => setTemple({ ...temple, name: e.target.value })}
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Address</label>
          <textarea
            value={temple.address}
            onChange={(e) => setTemple({ ...temple, address: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-accent border border-border rounded-md text-sm text-foreground mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode</label>
            <input
              type="text"
              value={temple.pincode ?? ''}
              onChange={(e) => setTemple({ ...temple, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              className="w-full h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Maps Link</label>
            <input
              type="url"
              value={temple.google_map_link ?? ''}
              onChange={(e) => setTemple({ ...temple, google_map_link: e.target.value })}
              className="w-full h-10 px-3 bg-accent border border-border rounded-md text-sm text-foreground mt-1"
              placeholder="https://maps.google.com/..."
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="border border-border rounded-lg p-5 space-y-3 bg-card">
        <h2 className="text-sm font-semibold">About &amp; History</h2>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">About Temple (300–500 letters)</label>
          <textarea
            value={temple.about ?? ''}
            onChange={(e) => setTemple({ ...temple, about: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 bg-accent border border-border rounded-md text-sm text-foreground mt-1"
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1">{(temple.about ?? '').length} chars</p>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">History &amp; Significance (300–500 letters)</label>
          <textarea
            value={temple.history_and_significance ?? ''}
            onChange={(e) => setTemple({ ...temple, history_and_significance: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 bg-accent border border-border rounded-md text-sm text-foreground mt-1"
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1">{(temple.history_and_significance ?? '').length} chars</p>
        </div>
      </section>

      {/* Deities */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="text-sm font-semibold mb-3">Presiding Deities</h2>
        <div className="flex flex-wrap gap-2">
          {deities.map((d) => {
            const active = selectedDeities.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => toggleDeity(d.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  active ? 'bg-primary text-white border-primary' : 'bg-accent border-border hover:border-primary'
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Raw (unedited) media */}
      <section className="border border-border rounded-lg p-5 bg-card space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Unedited Media (Admin-Only Archive)</h2>
          <p className="text-xs text-muted-foreground">Original uploads — kept for audit. Not shown to devotees.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MediaUploadSingle
            label="Raw Puja Video"
            type="video"
            accept="video/*"
            value={temple.sample_video_url_raw ?? ''}
            onChange={(url) => setTemple({ ...temple, sample_video_url_raw: url })}
          />
          <MediaUploadMulti
            label="Raw Temple Photos (min 5)"
            value={temple.slider_images_raw ?? []}
            onChange={(urls) => setTemple({ ...temple, slider_images_raw: urls })}
          />
        </div>
      </section>

      {/* Post-edit media */}
      <section className="border border-border rounded-lg p-5 bg-card space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Post-Edit Media (Shown to Devotees)</h2>
          <p className="text-xs text-muted-foreground">Polished versions used on web + mobile temple pages.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MediaUploadSingle
            label="Sample Puja Video"
            type="video"
            accept="video/*"
            value={temple.sample_video_url ?? ''}
            onChange={(url) => setTemple({ ...temple, sample_video_url: url })}
          />
          <MediaUploadMulti
            label="Temple Slider Images"
            value={temple.slider_images ?? []}
            onChange={(urls) => setTemple({ ...temple, slider_images: urls })}
          />
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex gap-3 items-center sticky bottom-0 bg-background border-t border-border pt-4 -mx-6 px-6 pb-4">
        <button onClick={handleDelete} className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs">
          <Trash2 className="w-4 h-4" /> Deactivate
        </button>
        <div className="flex-1" />
        <OutlineButton onClick={() => router.push('/dashboard/temples')}>Cancel</OutlineButton>
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </PrimaryButton>
      </div>
    </div>
  );
}
