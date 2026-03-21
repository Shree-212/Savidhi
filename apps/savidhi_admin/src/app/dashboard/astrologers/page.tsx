'use client';

import { useState, useEffect, useCallback } from 'react';
import { astrologerService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, ScheduleButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { AstrologerAdmin, AstrologerLedgerEntry } from '@/types';

interface ApiAstrologer {
  id: string;
  name: string;
  designation: string;
  languages: string[];
  expertise: string;
  about: string;
  profile_pic: string;
  slider_images: string[];
  price_15min: number;
  price_30min: number;
  price_1hour: number;
  price_2hour: number;
  rating: number;
  start_date: string;
  off_days: string[];
  is_active: boolean;
}

interface ApiLedgerEntry {
  id: string;
  party_id: string;
  party_type: string;
  event_type: string;
  event_id: string;
  fee: number;
  settled: boolean;
  created_at: string;
}

export default function AstrologersPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AstrologerAdmin | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showOffDays, setShowOffDays] = useState(false);
  const [ledgerAstrologerId, setLedgerAstrologerId] = useState<string | null>(null);
  const [offDaysAstrologer, setOffDaysAstrologer] = useState<AstrologerAdmin | null>(null);

  const [astrologers, setAstrologers] = useState<AstrologerAdmin[]>([]);
  const [ledgerData, setLedgerData] = useState<AstrologerLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formLanguages, setFormLanguages] = useState('');
  const [formExpertise, setFormExpertise] = useState('');
  const [formAbout, setFormAbout] = useState('');
  const [formPrice15, setFormPrice15] = useState('');
  const [formPrice30, setFormPrice30] = useState('');
  const [formPrice1h, setFormPrice1h] = useState('');
  const [formPrice2h, setFormPrice2h] = useState('');
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const fetchAstrologers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await astrologerService.list({ search: search || undefined });
      const raw: ApiAstrologer[] = res.data?.data || res.data || [];

      const mapped: AstrologerAdmin[] = await Promise.all(
        raw.map(async (a) => {
          let unsettled = 0;
          try {
            const ledgerRes = await astrologerService.getLedger(a.id);
            const entries: ApiLedgerEntry[] = ledgerRes.data?.data || ledgerRes.data || [];
            unsettled = entries
              .filter((e) => !e.settled)
              .reduce((sum, e) => sum + (e.fee || 0), 0);
          } catch { /* ignore */ }

          return {
            id: a.id,
            name: a.name,
            designation: a.designation,
            appointmentsInQueue: 0,
            isActive: a.is_active,
            languages: a.languages,
            expertise: a.expertise,
            about: a.about,
            profilePic: a.profile_pic,
            sliderImages: a.slider_images,
            prices: {
              for15min: a.price_15min,
              for30min: a.price_30min,
              for1hour: a.price_1hour,
              for2hour: a.price_2hour,
            },
            startDate: a.start_date,
            rating: a.rating,
            unsettled,
            offDays: a.off_days,
          };
        })
      );
      setAstrologers(mapped);
    } catch (err) {
      console.error('Failed to fetch astrologers:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAstrologers();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAstrologers();
  }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLedger = async (astrologerId: string) => {
    try {
      const res = await astrologerService.getLedger(astrologerId);
      const entries: ApiLedgerEntry[] = res.data?.data || res.data || [];
      setLedgerData(
        entries.map((e) => ({
          id: e.id,
          customerName: e.event_id,
          duration: '-',
          dateTime: new Date(e.created_at).toLocaleString(),
          fee: e.fee,
          settled: e.settled,
        }))
      );
    } catch {
      setLedgerData([]);
    }
  };

  const openLedger = (astrologerId: string) => {
    setLedgerAstrologerId(astrologerId);
    setShowLedger(true);
    fetchLedger(astrologerId);
  };

  const openEdit = (astrologer: AstrologerAdmin) => {
    setIsNew(false);
    setEditing(astrologer);
    setFormName(astrologer.name);
    setFormDesignation(astrologer.designation || '');
    setFormStartDate(astrologer.startDate || '');
    setFormLanguages((astrologer.languages || []).join(', '));
    setFormExpertise(astrologer.expertise || '');
    setFormAbout(astrologer.about || '');
    setFormPrice15(String(astrologer.prices?.for15min || ''));
    setFormPrice30(String(astrologer.prices?.for30min || ''));
    setFormPrice1h(String(astrologer.prices?.for1hour || ''));
    setFormPrice2h(String(astrologer.prices?.for2hour || ''));
  };

  const openCreate = () => {
    setIsNew(true);
    setEditing({
      id: 'NEW',
      name: '',
      designation: '',
      appointmentsInQueue: 0,
      isActive: true,
    });
    setFormName('');
    setFormDesignation('');
    setFormStartDate('');
    setFormLanguages('');
    setFormExpertise('');
    setFormAbout('');
    setFormPrice15('');
    setFormPrice30('');
    setFormPrice1h('');
    setFormPrice2h('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: any = {
        name: formName,
        designation: formDesignation,
        start_date: formStartDate,
        languages: formLanguages.split(',').map((l) => l.trim()).filter(Boolean),
        expertise: formExpertise,
        about: formAbout,
        price_15min: Number(formPrice15) || 0,
        price_30min: Number(formPrice30) || 0,
        price_1hour: Number(formPrice1h) || 0,
        price_2hour: Number(formPrice2h) || 0,
      };

      if (isNew) {
        await astrologerService.create(payload);
      } else {
        await astrologerService.update(editing.id, payload);
      }
      setEditing(null);
      fetchAstrologers();
    } catch (err) {
      console.error('Failed to save astrologer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this astrologer?')) return;
    try {
      await astrologerService.delete(id);
      fetchAstrologers();
    } catch (err) {
      console.error('Failed to delete astrologer:', err);
    }
  };

  const openOffDays = (astrologer: AstrologerAdmin) => {
    setOffDaysAstrologer(astrologer);
    setShowOffDays(true);
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation', render: (r: AstrologerAdmin) => <span className="text-status-shipped">{r.designation}</span> },
    { key: 'rating', label: 'Rating', render: (r: AstrologerAdmin) => <span>{r.rating ?? '-'} Star</span> },
    { key: 'unsettled', label: 'Unsettled', render: (r: AstrologerAdmin) => <span className="text-primary">₹{r.unsettled ?? 0}</span> },
    { key: 'appointmentsInQueue', label: 'Appointments in Queue', render: () => <span>-</span> },
    { key: 'action', label: 'Action', render: (r: AstrologerAdmin) => (
      <div className="flex items-center gap-1">
        <ScheduleButton onClick={() => openLedger(r.id)} />
        <ViewButton onClick={() => openEdit(r)} />
        <EditButton onClick={() => openEdit(r)} />
        <button onClick={() => openOffDays(r)} className="w-6 h-6 rounded flex items-center justify-center text-status-inprogress hover:bg-primary/10 text-[10px]">📅</button>
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  const ledgerColumns = [
    { key: 'id', label: 'ID' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'duration', label: 'Duration', render: (r: AstrologerLedgerEntry) => <span className="text-status-shipped">{r.duration}</span> },
    { key: 'dateTime', label: 'Date & Time' },
    { key: 'fee', label: 'Fee', render: (r: AstrologerLedgerEntry) => <span className="text-primary">₹{r.fee}</span> },
    { key: 'settled', label: '', render: (r: AstrologerLedgerEntry) => (
      <ViewButton className={r.settled ? 'text-status-completed' : 'text-status-not-started'} />
    )},
  ];

  // Parse off days for calendar rendering
  const offDayNumbers = (offDaysAstrologer?.offDays || [])
    .map((d) => new Date(d).getDate())
    .filter((n) => !isNaN(n));

  const offDaysList = (offDaysAstrologer?.offDays || [])
    .map((d) => {
      const date = new Date(d);
      return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    })
    .join(', ');

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={openCreate} />
      <DataTable columns={columns} data={astrologers} />

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Add Astrologer' : `Edit Astrologer <${editing?.id}>`} statusBadge={!isNew ? <StatusBadge status="ACTIVE" className="text-status-completed" /> : undefined} wide>
        {editing && (
          <div className="space-y-4">
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)} className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option value="">Designation</option>
                <option value="Vedic Astrologer">Vedic Astrologer</option>
                <option value="Numerologist">Numerologist</option>
                <option value="Tarot Reader">Tarot Reader</option>
              </select>
              <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} placeholder="Start Date" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <input value={formLanguages} onChange={(e) => setFormLanguages(e.target.value)} placeholder="Languages (comma separated)" className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground" />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Expertise</h4>
            <textarea value={formExpertise} onChange={(e) => setFormExpertise(e.target.value)} placeholder="Health & Graha Dosa, Love and Relationship Advice..." className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">About</h4>
            <textarea value={formAbout} onChange={(e) => setFormAbout(e.target.value)} placeholder="About the astrologer..." className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-2">Profile Pic <span className="text-primary">✏️</span></p>
                <div className="bg-accent rounded-lg h-20 flex items-center justify-center text-muted-foreground text-xs">📷</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-2">Astro Slider Images</p>
                <div className="bg-accent rounded-lg h-20 flex items-center justify-center text-muted-foreground text-xs">📷 +</div>
              </div>
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Identity Proof</h4>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Aadhar Number" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="Pan Number" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-1">Aadhar Pic <span className="text-primary">✏️</span></p>
                <div className="bg-accent rounded h-16 flex items-center justify-center text-xs text-muted-foreground">ID</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-1">Pan Pic <span className="text-primary">✏️</span></p>
                <div className="bg-accent rounded h-16 flex items-center justify-center text-xs text-muted-foreground">Pan</div>
              </div>
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Prices</h4>
            <div className="grid grid-cols-2 gap-3">
              <input value={formPrice15} onChange={(e) => setFormPrice15(e.target.value)} placeholder="For 15 Min" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input value={formPrice30} onChange={(e) => setFormPrice30(e.target.value)} placeholder="For 30 Min" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input value={formPrice1h} onChange={(e) => setFormPrice1h(e.target.value)} placeholder="For 1 Hour" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input value={formPrice2h} onChange={(e) => setFormPrice2h(e.target.value)} placeholder="For 2 Hour" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Bank Account Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Select Bank</option></select>
              <input placeholder="IFSC" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <input placeholder="Account Number" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            {editing && !isNew && editing.offDays && editing.offDays.length > 0 && (
              <p className="text-[11px] text-status-not-started">
                {editing.offDays.map((d) => {
                  const date = new Date(d);
                  return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                }).join(', ')} Marked Off
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => setEditing(null)}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Ledger Modal */}
      <Modal open={showLedger} onClose={() => setShowLedger(false)} title={`Ledger <${ledgerAstrologerId || 'Astrologer ID'}>`} wide>
        <DataTable columns={ledgerColumns} data={ledgerData} />
      </Modal>

      {/* Off Days Modal */}
      <Modal open={showOffDays} onClose={() => setShowOffDays(false)} title="Off Days" onBack={() => setShowOffDays(false)}>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs font-bold mb-3">January 2026</p>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="py-1 text-muted-foreground font-semibold">{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className={`py-1.5 rounded cursor-pointer ${
                  offDayNumbers.includes(i + 1) ? 'bg-status-not-started text-white' :
                  'bg-status-completed/20 text-status-completed border border-status-completed/30'
                }`}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs">
            <p className="font-bold">{offDayNumbers.length} Off Days</p>
            <p className="text-muted-foreground">{offDaysList || 'None'}</p>
            <p className="text-[10px] text-muted-foreground mt-2">Note: Bookings made already will remain as it is</p>
          </div>

          <div className="flex gap-3">
            <OutlineButton className="flex-1" onClick={() => setShowOffDays(false)}>Cancel</OutlineButton>
            <PrimaryButton className="flex-1" onClick={() => setShowOffDays(false)}>Save</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
