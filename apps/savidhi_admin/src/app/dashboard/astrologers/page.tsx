'use client';

import { useState } from 'react';
import { MOCK_ASTROLOGERS, MOCK_ASTROLOGER_LEDGER } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, ScheduleButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { AstrologerAdmin, AstrologerLedgerEntry } from '@/types';

export default function AstrologersPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AstrologerAdmin | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showOffDays, setShowOffDays] = useState(false);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation', render: (r: AstrologerAdmin) => <span className="text-status-shipped">{r.designation}</span> },
    { key: 'rating', label: 'Rating', render: (r: AstrologerAdmin) => <span>{r.rating} Star</span> },
    { key: 'unsettled', label: 'Unsettled', render: (r: AstrologerAdmin) => <span className="text-primary">₹{r.unsettled}</span> },
    { key: 'appointmentsInQueue', label: 'Appointments in Queue' },
    { key: 'action', label: 'Action', render: (r: AstrologerAdmin) => (
      <div className="flex items-center gap-1">
        <ScheduleButton onClick={() => setShowLedger(true)} />
        <ViewButton onClick={() => setEditing(r)} />
        <EditButton onClick={() => setEditing(r)} />
        <button onClick={() => setShowOffDays(true)} className="w-6 h-6 rounded flex items-center justify-center text-status-inprogress hover:bg-primary/10 text-[10px]">📅</button>
        <DeleteButton />
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

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing(MOCK_ASTROLOGERS[0])} />
      <DataTable columns={columns} data={MOCK_ASTROLOGERS} />

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Astrologer <${editing?.id}>`} statusBadge={<StatusBadge status="ACTIVE" className="text-status-completed" />} wide>
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.name} placeholder="Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Designation</option></select>
              <input type="date" placeholder="Start Date" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Languages (N)</option></select>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Expertise</h4>
            <textarea placeholder="Health & Graha Dosa, Love and Relationship Advice..." className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">About</h4>
            <textarea placeholder="About the astrologer..." className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

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
              <input placeholder="For 15 Min" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="For 30 Min" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="For 1 Hour" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="For 2 Hour" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Bank Account Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Select Bank</option></select>
              <input placeholder="IFSC" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <input placeholder="Account Number" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <p className="text-[11px] text-status-not-started">26 Jan, 3 Feb Marked Off</p>

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => setEditing(null)}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={() => setEditing(null)}>Save</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Ledger Modal */}
      <Modal open={showLedger} onClose={() => setShowLedger(false)} title="Ledger <Astrologer ID>" wide>
        <DataTable columns={ledgerColumns} data={MOCK_ASTROLOGER_LEDGER} />
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
                  [8, 24].includes(i + 1) ? 'bg-status-not-started text-white' :
                  'bg-status-completed/20 text-status-completed border border-status-completed/30'
                }`}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs">
            <p className="font-bold">2 Off Days</p>
            <p className="text-muted-foreground">9 Jan, 25 Jan.</p>
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
