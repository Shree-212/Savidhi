'use client';

import { useState } from 'react';
import { MOCK_ADMIN_USERS } from '@/data';
import { TabToggle } from '@/components/shared/TabToggle';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { AdminUser } from '@/types';

export default function SettingsPage() {
  const [tab, setTab] = useState('Admin Users');
  const [search, setSearch] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);

  const adminColumns = [
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Access Role', render: (r: AdminUser) => <StatusBadge status={r.role} /> },
    { key: 'createdAt', label: 'Created' },
    { key: 'updatedAt', label: 'Updated' },
    { key: 'actions', label: 'Actions', render: () => (
      <div className="flex items-center gap-1">
        <ViewButton />
        <EditButton />
        <DeleteButton />
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <TabToggle tabs={['Admin Users', 'Devotee App']} active={tab} onChange={setTab} />
        {tab === 'Admin Users' && (
          <PageHeader search={search} onSearchChange={setSearch} onAdd={() => setShowNewUser(true)} />
        )}
      </div>

      {tab === 'Admin Users' ? (
        <DataTable columns={adminColumns} data={MOCK_ADMIN_USERS} />
      ) : (
        <div className="space-y-4 max-w-md">
          <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
            <option>Select Pujas for Home Page Slider (N)</option>
          </select>
          <input placeholder="WhatsApp Support Number" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <input placeholder="Call Support Number" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
        </div>
      )}

      {/* New Admin User Modal */}
      <Modal open={showNewUser} onClose={() => setShowNewUser(false)} title="New Admin User">
        <div className="space-y-4">
          <input placeholder="Email" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <input type="password" placeholder="Password" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
            <option>Access Role</option>
            <option value="ADMIN">Admin</option>
            <option value="BOOKING_MANAGER">Booking Manager</option>
            <option value="VIEW_ONLY">View Only</option>
          </select>
          <div className="flex gap-3">
            <OutlineButton className="flex-1" onClick={() => setShowNewUser(false)}>Cancel</OutlineButton>
            <PrimaryButton className="flex-1" onClick={() => setShowNewUser(false)}>Create</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
