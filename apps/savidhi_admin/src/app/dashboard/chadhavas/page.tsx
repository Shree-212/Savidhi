'use client';

import { useState, useEffect, useRef } from 'react';
import { chadhavaService, templeService, deityService, hamperService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle, MediaUploadMulti } from '@/components/shared/MediaUpload';

interface Offering {
  item_name: string;
  benefit: string;
  price: number;
  image_url: string;
}

interface Chadhava {
  id: string;
  name: string;
  temple_id: string;
  temple_name: string;
  deity_id: string;
  deity_name: string;
  schedule_day: string;
  schedule_time: string;
  max_bookings_per_event: number;
  booking_mode: string;
  benefits: string;
  rituals_included: string;
  sample_video_url: string;
  slider_images: string[];
  offerings: Offering[];
  hamper_id: string;
  send_hamper: boolean;
}

interface SelectOption {
  id: string;
  name: string;
}

export default function ChadhavasPage() {
  const [search, setSearch] = useState('');
  const [chadhavas, setChadhavas] = useState<Chadhava[]>([]);
  const [temples, setTemples] = useState<SelectOption[]>([]);
  const [deities, setDeities] = useState<SelectOption[]>([]);
  const [hampers, setHampers] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Chadhava | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [sendHamper, setSendHamper] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const templeRef = useRef<HTMLSelectElement>(null);
  const deityRef = useRef<HTMLSelectElement>(null);
  const maxBookingsRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const bookingModeRef = useRef<HTMLSelectElement>(null);
  const benefitsRef = useRef<HTMLTextAreaElement>(null);
  const ritualsRef = useRef<HTMLTextAreaElement>(null);
  const hamperRef = useRef<HTMLSelectElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await chadhavaService.list({ search: search || undefined });
      setChadhavas(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load chadhavas', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [templesRes, deitiesRes, hampersRes] = await Promise.all([
        templeService.list({ limit: 200 }),
        deityService.list({ limit: 200 }),
        hamperService.list({ limit: 200 }),
      ]);
      setTemples(templesRes.data?.data || []);
      setDeities(deitiesRes.data?.data || []);
      setHampers(hampersRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  useEffect(() => {
    loadData();
    loadDropdowns();
  }, []);

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAdd = () => {
    setIsNew(true);
    setSendHamper(false);
    setOfferings([{ item_name: '', benefit: '', price: 0, image_url: '' }]);
    setEditing({
      id: '', name: '', temple_id: '', temple_name: '', deity_id: '', deity_name: '',
      schedule_day: '', schedule_time: '', max_bookings_per_event: 0, booking_mode: 'BOTH',
      benefits: '', rituals_included: '', sample_video_url: '', slider_images: [],
      offerings: [], hamper_id: '', send_hamper: false,
    });
  };

  const handleEdit = (chadhava: Chadhava) => {
    setIsNew(false);
    setSendHamper(chadhava.send_hamper);
    setOfferings(chadhava.offerings?.length ? chadhava.offerings : [{ item_name: '', benefit: '', price: 0, image_url: '' }]);
    setEditing(chadhava);
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload = {
        name: nameRef.current?.value || '',
        temple_id: templeRef.current?.value || '',
        deity_id: deityRef.current?.value || '',
        schedule_day: dayRef.current?.value || '',
        schedule_time: timeRef.current?.value || '',
        max_bookings_per_event: Number(maxBookingsRef.current?.value) || 0,
        booking_mode: bookingModeRef.current?.value || 'BOTH',
        benefits: benefitsRef.current?.value || '',
        rituals_included: ritualsRef.current?.value || '',
        sample_video_url: editing.sample_video_url || '',
        slider_images: editing.slider_images || [],
        offerings,
        send_hamper: sendHamper,
        hamper_id: hamperRef.current?.value || '',
      };
      if (isNew) {
        await chadhavaService.create(payload);
      } else {
        await chadhavaService.update(editing.id, payload);
      }
      setEditing(null);
      setIsNew(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save chadhava', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chadhava?')) return;
    try {
      await chadhavaService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete chadhava', err);
    }
  };

  const updateOffering = (index: number, field: keyof Offering, value: string | number) => {
    setOfferings(prev => prev.map((o, i) => i === index ? { ...o, [field]: value } : o));
  };

  const removeOffering = (index: number) => {
    setOfferings(prev => prev.filter((_, i) => i !== index));
  };

  const addOffering = () => {
    setOfferings(prev => [...prev, { item_name: '', benefit: '', price: 0, image_url: '' }]);
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r: Chadhava) => r.id.slice(0, 8) },
    { key: 'name', label: 'Chadhava Name' },
    { key: 'temple_name', label: 'Temple' },
    { key: 'schedule_day', label: 'Day' },
    { key: 'schedule_time', label: 'Time' },
    { key: 'max_bookings_per_event', label: 'Max B.' },
    { key: 'booking_mode', label: 'Booking Mode', render: (r: Chadhava) => <StatusBadge status={r.booking_mode} /> },
    { key: 'action', label: 'Action', render: (r: Chadhava) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => handleEdit(r)} />
        <EditButton onClick={() => handleEdit(r)} />
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={handleAdd} />
      <DataTable columns={columns} data={chadhavas} />

      <Modal open={!!editing} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'New Chadhava' : `Edit Chadhava <${editing?.id?.slice(0, 8)}>`} statusBadge={!isNew ? <StatusBadge status="ACTIVE" className="text-status-completed" /> : undefined} wide>
        {editing && (
          <div className="space-y-4">
            <input ref={nameRef} defaultValue={editing.name} placeholder="Chadhava Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select ref={templeRef} defaultValue={editing.temple_id} className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option value="">Temple</option>
                {temples.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select ref={deityRef} defaultValue={editing.deity_id} className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option value="">Type Of Deity</option>
                {deities.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input ref={maxBookingsRef} defaultValue={editing.max_bookings_per_event || ''} placeholder="Max Devotee Per Event" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Default Pujari</option></select>
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Date & Time</h4>
            <div className="grid grid-cols-2 gap-3">
              <input ref={dayRef} defaultValue={editing.schedule_day} type="date" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input ref={timeRef} defaultValue={editing.schedule_time} type="time" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Event Repeats</span>
              <div className="w-8 h-4 bg-primary rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" /></div>
            </div>

            <select ref={bookingModeRef} defaultValue={editing.booking_mode} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
              <option value="BOTH">Booking Mode: Both</option>
              <option value="ONE_TIME">Booking Mode: One Time</option>
              <option value="SUBSCRIPTION">Booking Mode: Subscription</option>
            </select>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Offerings</h4>
            {offerings.map((offering, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input
                  value={offering.item_name}
                  onChange={(e) => updateOffering(i, 'item_name', e.target.value)}
                  placeholder="Item Name"
                  className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  value={offering.benefit}
                  onChange={(e) => updateOffering(i, 'benefit', e.target.value)}
                  placeholder="Benefit"
                  className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  value={offering.price || ''}
                  onChange={(e) => updateOffering(i, 'price', Number(e.target.value))}
                  placeholder="Price"
                  className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <div className="flex items-center gap-1">
                  <MediaUploadSingle
                    label="Offering Image"
                    type="image"
                    accept="image/*"
                    value={offering.image_url ?? ''}
                    onChange={(url) => {
                      const updated = [...offerings];
                      updated[i] = { ...updated[i], image_url: url };
                      setOfferings(updated);
                    }}
                  />
                  <DeleteButton onClick={() => removeOffering(i)} />
                </div>
              </div>
            ))}
            <button onClick={addOffering} className="text-xs text-primary hover:underline">+ Add Offering</button>

            <div className="grid grid-cols-2 gap-3">
              <MediaUploadSingle
                label="Sample Puja Video"
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

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Benefits of Chadhava</h4>
            <textarea ref={benefitsRef} defaultValue={editing.benefits} placeholder="Benefits..." className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rituals Included</h4>
            <textarea ref={ritualsRef} defaultValue={editing.rituals_included} placeholder="Type Here" className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Send Hamper to Devotee</span>
              <div
                className={`w-8 h-4 ${sendHamper ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer`}
                onClick={() => setSendHamper(!sendHamper)}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 ${sendHamper ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>
            <select ref={hamperRef} defaultValue={editing.hamper_id} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
              <option value="">Select Hamper</option>
              {hampers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

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
