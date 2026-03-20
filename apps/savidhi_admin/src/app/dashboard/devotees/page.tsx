'use client';

import { useState } from 'react';
import { MOCK_DEVOTEES } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton } from '@/components/shared/ActionButtons';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { DevoteeAdmin } from '@/types';

export default function DevoteesPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DevoteeAdmin | null>(null);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'gotra', label: 'Gotra' },
    { key: 'level', label: 'Level' },
    { key: 'joinedSince', label: 'Joined Since' },
    { key: 'action', label: 'Action', render: (r: DevoteeAdmin) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setSelected(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} />
      <DataTable columns={columns} data={MOCK_DEVOTEES} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="">
        {selected && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 bg-accent rounded-full mx-auto flex items-center justify-center text-3xl">👤</div>
            <div>
              <span className="text-[10px] text-primary uppercase tracking-wider">Level {selected.level}</span>
              <h3 className="text-sm font-bold text-foreground mt-1">{selected.name.replace('Dash', 'Kumar')}</h3>
              <p className="text-[10px] text-muted-foreground">Devotee Since {selected.joinedSince.replace('Jan 2024', 'Dec 2025')}</p>
            </div>

            <div className="text-left">
              <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2">Bookings</h4>
              {selected.bookings?.map((b, i) => (
                <div key={i} className="border border-border rounded-lg p-3 mb-2">
                  <p className="text-xs font-bold text-foreground">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-line">{b.details}</p>
                  <StatusBadge status={b.status} className="mt-1 block" />
                </div>
              ))}
            </div>

            <PrimaryButton className="w-full" onClick={() => setSelected(null)}>Close</PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
