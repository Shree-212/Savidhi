'use client';

import { useState } from 'react';
import { MOCK_HAMPERS } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { Hamper } from '@/types';

export default function HampersPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Hamper | null>(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'contentDescription', label: 'Content Description' },
    { key: 'stockQty', label: 'Stock Qty' },
    { key: 'actions', label: 'Actions', render: (r: Hamper) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setEditing(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing({ id: 'new', name: '', contentDescription: '', stockQty: 0 })} />
      <DataTable columns={columns} data={MOCK_HAMPERS} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id === 'new' ? 'New Hamper' : `Edit Hamper <${editing?.id}>`}>
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.name} placeholder="Hamper Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <textarea defaultValue={editing.contentDescription} placeholder="Content Description" className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <input defaultValue={editing.stockQty || ''} placeholder="Quantity in Stock" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <div className="flex gap-3">
              <OutlineButton className="flex-1" onClick={() => setEditing(null)}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={() => setEditing(null)}>
                {editing.id === 'new' ? 'Create' : 'Save'}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
