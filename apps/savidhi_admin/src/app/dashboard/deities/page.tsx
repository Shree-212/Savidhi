'use client';

import { useState } from 'react';
import { MOCK_DEITIES } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { Deity } from '@/types';

export default function DeitiesPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Deity | null>(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Type of Deity' },
    { key: 'action', label: 'Action', render: (r: Deity) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setEditing(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setEditing({ id: 'new', name: '' })} />
      <DataTable columns={columns} data={MOCK_DEITIES} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Type of Deity <${editing?.id}>`}>
        {editing && (
          <div className="space-y-4">
            <input defaultValue={editing.name} placeholder="Deity Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <p className="text-[10px] text-muted-foreground">Upload Image in Format 2525 x 3535</p>
            <div className="bg-accent border border-border rounded-lg h-48 flex items-center justify-center text-muted-foreground">
              <span className="text-primary cursor-pointer">✏️</span>
              <div className="text-center">
                <div className="text-4xl text-primary/50 mb-2">🙏</div>
                <span className="text-xs">Deity Image</span>
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
