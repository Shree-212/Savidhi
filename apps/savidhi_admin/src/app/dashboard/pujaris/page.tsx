'use client';

import { useState, useEffect, useCallback } from 'react';
import { pujariService, templeService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, ScheduleButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle } from '@/components/shared/MediaUpload';
import type { PujariAdmin, PujariLedgerEntry } from '@/types';

interface ApiPujari {
  id: string;
  name: string;
  temple_id: string;
  designation: string;
  profile_pic: string;
  rating: number;
  start_date: string;
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

export default function PujarisPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PujariAdmin | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerPujariId, setLedgerPujariId] = useState<string | null>(null);

  const [pujaris, setPujaris] = useState<PujariAdmin[]>([]);
  const [ledgerData, setLedgerData] = useState<PujariLedgerEntry[]>([]);
  const [templeMap, setTempleMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formTempleId, setFormTempleId] = useState('');
  const [formProfilePic, setFormProfilePic] = useState('');
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const fetchTemples = useCallback(async () => {
    try {
      const res = await templeService.list({ limit: 200 });
      const temples = res.data?.data || res.data || [];
      const map: Record<string, string> = {};
      temples.forEach((t: any) => { map[t.id] = t.name || t.templeName || t.temple_name || t.id; });
      setTempleMap(map);
      return map;
    } catch {
      return {};
    }
  }, []);

  const fetchPujaris = useCallback(async (tMap?: Record<string, string>) => {
    setLoading(true);
    try {
      const temples = tMap || templeMap;
      const res = await pujariService.list({ search: search || undefined });
      const raw: ApiPujari[] = res.data?.data || res.data || [];

      // For each pujari, compute unsettled from ledger
      const mapped: PujariAdmin[] = await Promise.all(
        raw.map(async (p) => {
          let unsettled = 0;
          try {
            const ledgerRes = await pujariService.getLedger(p.id);
            const entries: ApiLedgerEntry[] = ledgerRes.data?.data || ledgerRes.data || [];
            unsettled = entries
              .filter((e) => !e.settled)
              .reduce((sum, e) => sum + (e.fee || 0), 0);
          } catch { /* ignore ledger errors */ }

          return {
            id: p.id,
            name: p.name,
            temple: temples[p.temple_id] || p.temple_id || '-',
            pujaInQueue: 0,
            isActive: p.is_active,
            designation: p.designation,
            startDate: p.start_date,
            profilePic: p.profile_pic,
            rating: p.rating,
            unsettled,
          };
        })
      );
      setPujaris(mapped);
    } catch (err) {
      console.error('Failed to fetch pujaris:', err);
    } finally {
      setLoading(false);
    }
  }, [search, templeMap]);

  useEffect(() => {
    fetchTemples().then((tMap) => fetchPujaris(tMap));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Object.keys(templeMap).length > 0) {
      fetchPujaris();
    }
  }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLedger = async (pujariId: string) => {
    try {
      const res = await pujariService.getLedger(pujariId);
      const entries: ApiLedgerEntry[] = res.data?.data || res.data || [];
      setLedgerData(
        entries.map((e) => ({
          id: e.id,
          eventName: e.event_id,
          type: e.event_type as 'PUJA' | 'CHADHAVA',
          dateTime: new Date(e.created_at).toLocaleString(),
          temple: '-',
          fee: e.fee,
          settled: e.settled,
        }))
      );
    } catch {
      setLedgerData([]);
    }
  };

  const openLedger = (pujariId: string) => {
    setLedgerPujariId(pujariId);
    setShowLedger(true);
    fetchLedger(pujariId);
  };

  const openEdit = (pujari: PujariAdmin) => {
    setIsNew(false);
    setEditing(pujari);
    setFormName(pujari.name);
    setFormDesignation(pujari.designation || '');
    setFormStartDate(pujari.startDate || '');
    setFormTempleId('');
    setFormProfilePic(pujari.profilePic ?? '');
  };

  const openCreate = () => {
    setIsNew(true);
    setEditing({
      id: 'NEW',
      name: '',
      temple: '',
      pujaInQueue: 0,
      isActive: true,
    });
    setFormName('');
    setFormDesignation('');
    setFormStartDate('');
    setFormTempleId('');
    setFormProfilePic('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: any = {
        name: formName,
        designation: formDesignation,
        start_date: formStartDate,
        profile_pic: formProfilePic,
      };
      if (formTempleId) payload.temple_id = formTempleId;

      if (isNew) {
        await pujariService.create(payload);
      } else {
        await pujariService.update(editing.id, payload);
      }
      setEditing(null);
      fetchPujaris();
    } catch (err) {
      console.error('Failed to save pujari:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pujari?')) return;
    try {
      await pujariService.delete(id);
      fetchPujaris();
    } catch (err) {
      console.error('Failed to delete pujari:', err);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'pujaInQueue', label: 'Puja in Queue', render: () => <span>-</span> },
    { key: 'action', label: 'Action', render: (r: PujariAdmin) => (
      <div className="flex items-center gap-1">
        <ScheduleButton
          onClick={() => { window.location.href = `/dashboard/pujaris/${r.id}/ledger`; }}
          title="Ledger History"
        />
        <ViewButton onClick={() => openEdit(r)} />
        <EditButton onClick={() => openEdit(r)} />
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  const ledgerColumns = [
    { key: 'id', label: 'ID' },
    { key: 'eventName', label: 'Event Name' },
    { key: 'type', label: 'Type', render: (r: PujariLedgerEntry) => <StatusBadge status={r.type} /> },
    { key: 'dateTime', label: 'Date & Time' },
    { key: 'temple', label: 'Temple' },
    { key: 'fee', label: 'Fee', render: (r: PujariLedgerEntry) => <span className="text-primary">₹{r.fee}</span> },
    { key: 'settled', label: '', render: (r: PujariLedgerEntry) => (
      <ViewButton onClick={() => {}} className={r.settled ? 'text-status-completed' : 'text-status-not-started'} />
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={openCreate} />

      {/* Extended columns for pujaris with rating/unsettled */}
      <DataTable columns={[
        ...columns.slice(0, 3),
        { key: 'rating', label: 'Rating', render: (r: PujariAdmin) => <span className="text-muted-foreground">{r.rating ?? '-'} Star</span> },
        { key: 'unsettled', label: 'Unsettled', render: (r: PujariAdmin) => <span className="text-primary">₹{r.unsettled ?? 0}</span> },
        columns[3],
        columns[4],
      ]} data={pujaris} />

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Add Pujari' : `Edit Pujari <${editing?.id}>`} statusBadge={!isNew ? <StatusBadge status="ACTIVE" className="text-status-completed" /> : undefined} wide>
        {editing && (
          <div className="space-y-4">
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)} className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option value="">Designation</option>
                <option value="Head Pujari">Head Pujari</option>
                <option value="Senior Pujari">Senior Pujari</option>
                <option value="Pujari">Pujari</option>
              </select>
              <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} placeholder="Start Date" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <select value={formTempleId} onChange={(e) => setFormTempleId(e.target.value)} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
              <option value="">Temple</option>
              {Object.entries(templeMap).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Profile Pic</h4>
            <MediaUploadSingle
              label="Profile Picture"
              type="image"
              accept="image/*"
              value={formProfilePic}
              onChange={setFormProfilePic}
            />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Identity Proof</h4>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Aadhar Number" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="Pan Number" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-1">Aadhar Pic <span className="text-primary">✏️</span></p>
                <div className="bg-accent rounded h-16 flex items-center justify-center text-xs text-muted-foreground">ID Card</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-1">Pan Pic <span className="text-primary">✏️</span></p>
                <div className="bg-accent rounded h-16 flex items-center justify-center text-xs text-muted-foreground">Pan Card</div>
              </div>
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Bank Account Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Select Bank</option></select>
              <input placeholder="IFSC" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <input placeholder="Account Number" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => setEditing(null)}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Ledger Modal */}
      <Modal open={showLedger} onClose={() => setShowLedger(false)} title={`Ledger <${ledgerPujariId || 'Pujari ID'}>`} wide>
        <DataTable columns={ledgerColumns} data={ledgerData} />
      </Modal>
    </div>
  );
}
