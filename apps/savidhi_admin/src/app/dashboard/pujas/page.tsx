'use client';

import { useState } from 'react';
import { MOCK_PUJAS_CRUD } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { PujaCrud } from '@/types';

export default function PujasPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PujaCrud | null>(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'pujaName', label: 'Puja Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'day', label: 'Day' },
    { key: 'time', label: 'Time' },
    { key: 'maxBookings', label: 'Max B.' },
    { key: 'bookingMode', label: 'Booking Mode', render: (r: PujaCrud) => <StatusBadge status={r.bookingMode} /> },
    { key: 'action', label: 'Action', render: (r: PujaCrud) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setEditing(r)} />
        <EditButton onClick={() => setEditing(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing(MOCK_PUJAS_CRUD[0])} />
      <DataTable columns={columns} data={MOCK_PUJAS_CRUD} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit Puja <${editing?.id}>`}
        statusBadge={<StatusBadge status="ACTIVE" className="text-status-completed" />}
        wide
      >
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.pujaName} placeholder="Puja Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option>Temple</option>
              </select>
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option>Type Of Deity</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Max Devotee Per Event" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option>Default Pujari</option>
              </select>
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
            <div className="grid grid-cols-2 gap-3">
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option>Lunar Phase Wise</option>
              </select>
              <select className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
                <option>Saptami, Navami</option>
              </select>
            </div>

            <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
              <option>Booking Mode: Both (One Time & Subscription)</option>
            </select>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Prices</h4>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="For 1" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="For 2" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="For 4" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="For 6" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>

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

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Benefits of Puja</h4>
            <textarea placeholder="Bhuta Sudhi for Peace, Good Health, Solve Family Issues" className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rituals Included</h4>
            <textarea placeholder="Type Here" className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Send Hamper to Devotee</span>
              <div className="w-8 h-4 bg-primary rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" /></div>
            </div>
            <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
              <option>Select Hamper</option>
            </select>

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
