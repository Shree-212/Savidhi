'use client';

import { useState, useEffect, useRef } from 'react';
import { templeService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle, MediaUploadMulti } from '@/components/shared/MediaUpload';

interface Temple {
  id: string;
  name: string;
  address: string;
  pincode: string;
  about: string;
  history_and_significance: string;
  sample_video_url: string;
  slider_images: string[];
  is_active: boolean;
  pujaris_count: number;
  pujas_count: number;
}

export default function TemplesPage() {
  const [search, setSearch] = useState('');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Temple | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const pincodeRef = useRef<HTMLInputElement>(null);
  const mapLinkRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await templeService.list({ search: search || undefined });
      setTemples(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load temples', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAdd = () => {
    setIsNew(true);
    setEditing({
      id: '', name: '', address: '', pincode: '', about: '',
      history_and_significance: '', sample_video_url: '', slider_images: [],
      is_active: true, pujaris_count: 0, pujas_count: 0,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload = {
        name: nameRef.current?.value || '',
        address: addressRef.current?.value || '',
        pincode: pincodeRef.current?.value || '',
        google_map_link: mapLinkRef.current?.value || '',
        about: aboutRef.current?.value || '',
        history_and_significance: historyRef.current?.value || '',
        sample_video_url: editing.sample_video_url || '',
        slider_images: editing.slider_images || [],
      };
      if (isNew) {
        await templeService.create(payload);
      } else {
        await templeService.update(editing.id, payload);
      }
      setEditing(null);
      setIsNew(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save temple', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this temple?')) return;
    try {
      await templeService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete temple', err);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r: Temple) => r.id.slice(0, 8) },
    { key: 'name', label: 'Temple Name' },
    { key: 'address', label: 'Address' },
    { key: 'pujaris_count', label: 'Pujaris' },
    { key: 'pujas_count', label: 'Pujas' },
    { key: 'action', label: 'Action', render: (r: Temple) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => { setIsNew(false); setEditing(r); }} />
        <EditButton onClick={() => { setIsNew(false); setEditing(r); }} />
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={handleAdd} />
      <DataTable columns={columns} data={temples} />

      <Modal open={!!editing} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'New Temple' : `Edit Temple <${editing?.id?.slice(0, 8)}>`}>
        {editing && (
          <div className="space-y-4">
            <input ref={nameRef} defaultValue={editing.name} placeholder="Temple Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <input ref={addressRef} defaultValue={editing.address} placeholder="Full Address" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <input ref={pincodeRef} defaultValue={editing.pincode} placeholder="Pincode" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <input ref={mapLinkRef} placeholder="Google Map Link" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">About Temple</h4>
            <textarea ref={aboutRef} defaultValue={editing.about} placeholder="About temple description..." className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">History & Significance</h4>
            <textarea ref={historyRef} defaultValue={editing.history_and_significance} placeholder="Type Here" className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

            <div className="grid grid-cols-2 gap-3">
              <MediaUploadSingle
                label="Sample Video"
                type="video"
                accept="video/*"
                value={editing.sample_video_url ?? ''}
                onChange={(url) => setEditing(prev => prev ? { ...prev, sample_video_url: url } : prev)}
              />
              <MediaUploadMulti
                label="Slider Images"
                value={editing.slider_images ?? []}
                onChange={(urls) => setEditing(prev => prev ? { ...prev, slider_images: urls } : prev)}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
