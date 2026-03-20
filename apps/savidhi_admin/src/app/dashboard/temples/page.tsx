'use client';

import { useState } from 'react';
import { MOCK_TEMPLES_CRUD } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { TempleCrud } from '@/types';

export default function TemplesPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TempleCrud | null>(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'templeName', label: 'Temple Name' },
    { key: 'address', label: 'Address' },
    { key: 'pujaris', label: 'Pujaris' },
    { key: 'pujas', label: 'Pujas' },
    { key: 'action', label: 'Action', render: (r: TempleCrud) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setEditing(r)} />
        <EditButton onClick={() => setEditing(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing(MOCK_TEMPLES_CRUD[0])} />
      <DataTable columns={columns} data={MOCK_TEMPLES_CRUD} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Temple <${editing?.id}>`}>
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.templeName} placeholder="Temple Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <input defaultValue={editing.address} placeholder="Full Address" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <input placeholder="Google Map Link" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">About Temple</h4>
            <textarea placeholder="About temple description..." className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">History & Significance</h4>
            <textarea placeholder="Type Here" className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />

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
