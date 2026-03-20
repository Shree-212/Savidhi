'use client';

import { useState } from 'react';
import { MOCK_PUJARIS, MOCK_PUJARI_LEDGER } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, ScheduleButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { PujariAdmin, PujariLedgerEntry } from '@/types';

export default function PujarisPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PujariAdmin | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'pujaInQueue', label: 'Puja in Queue' },
    { key: 'action', label: 'Action', render: (r: PujariAdmin) => (
      <div className="flex items-center gap-1">
        <ScheduleButton onClick={() => setShowLedger(true)} />
        <ViewButton onClick={() => setEditing(r)} />
        <EditButton onClick={() => setEditing(r)} />
        <DeleteButton />
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
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing(MOCK_PUJARIS[0])} />

      {/* Extended columns for pujaris with rating/unsettled */}
      <DataTable columns={[
        ...columns.slice(0, 3),
        { key: 'rating', label: 'Rating', render: (r: PujariAdmin) => <span className="text-muted-foreground">{r.rating} Star</span> },
        { key: 'unsettled', label: 'Unsettled', render: (r: PujariAdmin) => <span className="text-primary">₹{r.unsettled}</span> },
        columns[3],
        columns[4],
      ]} data={MOCK_PUJARIS} />

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Pujari <${editing?.id}>`} statusBadge={<StatusBadge status="ACTIVE" className="text-status-completed" />} wide>
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.name} placeholder="Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Designation</option></select>
              <input type="date" placeholder="Start Date" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
            <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Temple</option></select>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Profile Pic</h4>
            <div className="w-24 h-24 bg-accent border border-border rounded-lg flex items-center justify-center text-muted-foreground">
              <span className="text-primary">✏️</span> 📷
            </div>

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
              <PrimaryButton className="flex-1" onClick={() => setEditing(null)}>Save</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Ledger Modal */}
      <Modal open={showLedger} onClose={() => setShowLedger(false)} title="Ledger <Pujari ID>" wide>
        <DataTable columns={ledgerColumns} data={MOCK_PUJARI_LEDGER} />
      </Modal>
    </div>
  );
}
