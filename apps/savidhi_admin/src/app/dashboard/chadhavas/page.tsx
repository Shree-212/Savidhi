'use client';

import { useState } from 'react';
import { MOCK_CHADHAVAS_CRUD } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { ChadhavaCrud } from '@/types';

export default function ChadhavasPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ChadhavaCrud | null>(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'chadhavaName', label: 'Chadhava Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'day', label: 'Day' },
    { key: 'time', label: 'Time' },
    { key: 'maxBookings', label: 'Max B.' },
    { key: 'bookingMode', label: 'Booking Mode', render: (r: ChadhavaCrud) => <StatusBadge status={r.bookingMode} /> },
    { key: 'action', label: 'Action', render: (r: ChadhavaCrud) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setEditing(r)} />
        <EditButton onClick={() => setEditing(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing(MOCK_CHADHAVAS_CRUD[0])} />
      <DataTable columns={columns} data={MOCK_CHADHAVAS_CRUD} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Chadhava <${editing?.id}>`} statusBadge={<StatusBadge status="ACTIVE" className="text-status-completed" />} wide>
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.chadhavaName} placeholder="Chadhava Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Temple</option></select>
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Type Of Deity</option></select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Max Devotee Per Event" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Default Pujari</option></select>
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Date & Time</h4>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input type="time" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Event Repeats</span>
              <div className="w-8 h-4 bg-primary rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" /></div>
            </div>

            <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
              <option>Booking Mode: Both</option>
            </select>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Offerings</h4>
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input placeholder="Item Name" className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
                <input placeholder="Benefit" className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
                <input placeholder="Price" className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 bg-accent border border-border rounded flex items-center justify-center text-[10px] text-muted-foreground">📷</div>
                  <DeleteButton />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-2">Sample Puja Video</p>
                <div className="bg-accent rounded-lg h-20 flex items-center justify-center text-muted-foreground text-xs">▶</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold mb-2">Slider Images</p>
                <div className="bg-accent rounded-lg h-20 flex items-center justify-center text-muted-foreground text-xs">📷 +</div>
              </div>
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Benefits of Chadhava</h4>
            <textarea placeholder="Benefits..." className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rituals Included</h4>
            <textarea placeholder="Type Here" className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Send Hamper to Devotee</span>
              <div className="w-8 h-4 bg-primary rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" /></div>
            </div>
            <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"><option>Select Hamper</option></select>

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => setEditing(null)}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={() => setEditing(null)}>Save</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
