'use client';

import { useState, useEffect, useRef } from 'react';
import { adminUserService, settingsService, pujaService, chadhavaService, mediaService } from '@/lib/services';
import { TabToggle } from '@/components/shared/TabToggle';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { Trash2, Upload, Loader2 } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface HomeBanner {
  image_url: string;
  target_type: 'puja' | 'chadhava';
  target_id: string;
}

interface AppSettings {
  home_puja_slider_ids: string[];
  whatsapp_support_number: string;
  call_support_number: string;
  home_banners: HomeBanner[];
}

interface CatalogOption {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState('Admin Users');
  const [search, setSearch] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    home_puja_slider_ids: [],
    whatsapp_support_number: '',
    call_support_number: '',
    home_banners: [],
  });
  const [whatsappValue, setWhatsappValue] = useState('');
  const [callValue, setCallValue] = useState('');
  const [sliderPujaIds, setSliderPujaIds] = useState<string[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [pujas, setPujas] = useState<CatalogOption[]>([]);
  const [chadhavas, setChadhavas] = useState<CatalogOption[]>([]);
  const [uploadingBannerIdx, setUploadingBannerIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const res = await adminUserService.list();
      setAdminUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load admin users', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await settingsService.get();
      const data = res.data?.data;
      if (data) {
        const normalised: AppSettings = {
          home_puja_slider_ids: Array.isArray(data.home_puja_slider_ids) ? data.home_puja_slider_ids : [],
          whatsapp_support_number: data.whatsapp_support_number ?? '',
          call_support_number: data.call_support_number ?? '',
          home_banners: Array.isArray(data.home_banners) ? data.home_banners : [],
        };
        setSettings(normalised);
        setWhatsappValue(normalised.whatsapp_support_number);
        setCallValue(normalised.call_support_number);
        setSliderPujaIds(normalised.home_puja_slider_ids);
        setBanners(normalised.home_banners);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const loadCatalog = async () => {
    try {
      const [pujasRes, chadhavasRes] = await Promise.all([
        pujaService.list({ limit: 200 }),
        chadhavaService.list({ limit: 200 }),
      ]);
      setPujas((pujasRes.data?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })));
      setChadhavas((chadhavasRes.data?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error('Failed to load catalog', err);
    }
  };

  useEffect(() => {
    loadAdminUsers();
    loadSettings();
    loadCatalog();
  }, []);

  const handleCreateUser = async () => {
    try {
      setSaving(true);
      await adminUserService.create({
        email: emailRef.current?.value || '',
        name: nameRef.current?.value || '',
        password: passwordRef.current?.value || '',
        role: roleRef.current?.value || 'VIEW_ONLY',
      });
      setShowNewUser(false);
      await loadAdminUsers();
    } catch (err) {
      console.error('Failed to create admin user', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin user?')) return;
    try {
      await adminUserService.delete(id);
      await loadAdminUsers();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 409 && msg) alert(msg);
      else {
        console.error('Failed to delete admin user', err);
        alert('Failed to delete admin user');
      }
    }
  };

  const handleSaveSettings = async () => {
    // Don't ship half-built banners — strip rows missing image or target.
    const validBanners = banners.filter((b) => b.image_url && b.target_id);
    if (validBanners.length !== banners.length) {
      const ok = confirm(`${banners.length - validBanners.length} banner row(s) are incomplete and will be dropped. Continue?`);
      if (!ok) return;
    }
    try {
      setSaving(true);
      await settingsService.update({
        whatsapp_support_number: whatsappValue,
        call_support_number: callValue,
        home_puja_slider_ids: sliderPujaIds,
        home_banners: validBanners,
      });
      await loadSettings();
    } catch (err: any) {
      console.error('Failed to save settings', err);
      alert(err?.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSliderPuja = (id: string) => {
    setSliderPujaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addBanner = () => {
    setBanners((prev) => [...prev, { image_url: '', target_type: 'puja', target_id: '' }]);
  };

  const updateBanner = (idx: number, patch: Partial<HomeBanner>) => {
    setBanners((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const removeBanner = (idx: number) => {
    setBanners((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadBannerImage = async (idx: number, file: File) => {
    try {
      setUploadingBannerIdx(idx);
      const res = await mediaService.uploadLocal(file);
      const url: string = res.data?.fileUrl ?? res.data?.url ?? '';
      if (!url) throw new Error('Upload returned no URL');
      updateBanner(idx, { image_url: url });
    } catch (err: any) {
      alert(err?.message ?? 'Image upload failed');
    } finally {
      setUploadingBannerIdx(null);
    }
  };

  const adminColumns = [
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Access Role', render: (r: AdminUser) => <StatusBadge status={r.role} /> },
    { key: 'createdAt', label: 'Created' },
    { key: 'updatedAt', label: 'Updated' },
    { key: 'actions', label: 'Actions', render: (r: AdminUser) => (
      <div className="flex items-center gap-1">
        <ViewButton />
        <EditButton />
        <DeleteButton onClick={() => handleDeleteUser(r.id)} />
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <TabToggle tabs={['Admin Users', 'Devotee App']} active={tab} onChange={setTab} />
        {tab === 'Admin Users' && (
          <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setShowNewUser(true)} />
        )}
      </div>

      {tab === 'Admin Users' ? (
        <DataTable columns={adminColumns} data={adminUsers} />
      ) : (
        <div className="space-y-6 max-w-xl">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Select Pujas for Home Page Slider ({sliderPujaIds.length})
            </label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-md bg-accent p-2 space-y-1">
              {pujas.length === 0 ? (
                <div className="text-xs text-muted-foreground px-1 py-2">No pujas available.</div>
              ) : (
                pujas.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer px-1 py-1 hover:bg-background rounded">
                    <input
                      type="checkbox"
                      checked={sliderPujaIds.includes(p.id)}
                      onChange={() => toggleSliderPuja(p.id)}
                    />
                    <span>{p.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Home Page Banners ({banners.length})</label>
              <button
                onClick={addBanner}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                + Add banner
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Each banner shows on the devotee home page and links to its puja/chadhava. If the linked item is set inactive, the banner is hidden automatically.
            </p>
            <div className="space-y-3">
              {banners.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">
                  No banners yet. Click "+ Add banner" to create one.
                </div>
              ) : (
                banners.map((b, i) => {
                  const options = b.target_type === 'puja' ? pujas : chadhavas;
                  return (
                    <div key={i} className="border border-border rounded-md bg-accent p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <select
                            value={b.target_type}
                            onChange={(e) => updateBanner(i, { target_type: e.target.value as 'puja' | 'chadhava', target_id: '' })}
                            className="h-8 bg-background border border-border rounded-md px-2 text-xs text-foreground"
                          >
                            <option value="puja">Puja</option>
                            <option value="chadhava">Chadhava</option>
                          </select>
                          <select
                            value={b.target_id}
                            onChange={(e) => updateBanner(i, { target_id: e.target.value })}
                            className="flex-1 h-8 bg-background border border-border rounded-md px-2 text-xs text-foreground"
                          >
                            <option value="">— Select {b.target_type} —</option>
                            {options.map((o) => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => removeBanner(i)}
                          className="w-8 h-8 rounded-md text-red-500 hover:bg-red-500/10 flex items-center justify-center"
                          aria-label="Remove banner"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {b.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.image_url} alt="banner" className="w-24 h-14 object-cover rounded border border-border" />
                        ) : (
                          <div className="w-24 h-14 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
                        )}
                        <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer">
                          {uploadingBannerIdx === i ? (
                            <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                          ) : (
                            <><Upload size={12} /> {b.image_url ? 'Replace image' : 'Upload image'}</>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingBannerIdx === i}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadBannerImage(i, f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              value={whatsappValue}
              onChange={(e) => setWhatsappValue(e.target.value)}
              placeholder="WhatsApp Support Number"
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
            />
            <input
              value={callValue}
              onChange={(e) => setCallValue(e.target.value)}
              placeholder="Call Support Number"
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
            />
          </div>

          <PrimaryButton onClick={handleSaveSettings} disabled={saving || uploadingBannerIdx !== null}>
            {saving ? 'Saving...' : 'Save Settings'}
          </PrimaryButton>
        </div>
      )}

      {/* New Admin User Modal */}
      <Modal open={showNewUser} onClose={() => setShowNewUser(false)} title="New Admin User">
        <div className="space-y-4">
          <input ref={nameRef} placeholder="Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <input ref={emailRef} placeholder="Email" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <input ref={passwordRef} type="password" placeholder="Password" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <select ref={roleRef} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
            <option value="">Access Role</option>
            <option value="ADMIN">Admin</option>
            <option value="BOOKING_MANAGER">Booking Manager</option>
            <option value="VIEW_ONLY">View Only</option>
          </select>
          <div className="flex gap-3">
            <OutlineButton className="flex-1" onClick={() => setShowNewUser(false)}>Cancel</OutlineButton>
            <PrimaryButton className="flex-1" onClick={handleCreateUser} disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
