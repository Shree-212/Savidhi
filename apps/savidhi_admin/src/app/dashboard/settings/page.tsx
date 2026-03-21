'use client';

import { useState, useEffect, useRef } from 'react';
import { adminUserService, settingsService } from '@/lib/services';
import { TabToggle } from '@/components/shared/TabToggle';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface AppSettings {
  home_slider_pujas: string[];
  whatsapp_number: string;
  call_number: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState('Admin Users');
  const [search, setSearch] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ home_slider_pujas: [], whatsapp_number: '', call_number: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);

  const whatsappRef = useRef<HTMLInputElement>(null);
  const callRef = useRef<HTMLInputElement>(null);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const res = await adminUserService.list();
      setAdminUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load admin users', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await settingsService.get();
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  useEffect(() => {
    loadAdminUsers();
    loadSettings();
  }, []);

  const handleCreateUser = async () => {
    try {
      setSaving(true);
      await adminUserService.create({
        email: emailRef.current?.value || '',
        name: nameRef.current?.value || '',
        password: passwordRef.current?.value || '',
        role: roleRef.current?.value || 'VIEW_ONLY',
      });
      setShowNewUser(false);
      await loadAdminUsers();
    } catch (err) {
      console.error('Failed to create admin user', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin user?')) return;
    try {
      await adminUserService.delete(id);
      await loadAdminUsers();
    } catch (err) {
      console.error('Failed to delete admin user', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await settingsService.update({
        whatsapp_number: whatsappRef.current?.value || '',
        call_number: callRef.current?.value || '',
      });
      await loadSettings();
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  const adminColumns = [
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Access Role', render: (r: AdminUser) => <StatusBadge status={r.role} /> },
    { key: 'createdAt', label: 'Created' },
    { key: 'updatedAt', label: 'Updated' },
    { key: 'actions', label: 'Actions', render: (r: AdminUser) => (
      <div className="flex items-center gap-1">
        <ViewButton />
        <EditButton />
        <DeleteButton onClick={() => handleDeleteUser(r.id)} />
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
        <DataTable columns={adminColumns} data={adminUsers} />
      ) : (
        <div className="space-y-4 max-w-md">
          <select className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
            <option>Select Pujas for Home Page Slider (N)</option>
          </select>
          <input
            ref={whatsappRef}
            defaultValue={settings.whatsapp_number}
            placeholder="WhatsApp Support Number"
            className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
          />
          <input
            ref={callRef}
            defaultValue={settings.call_number}
            placeholder="Call Support Number"
            className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
          />
          <PrimaryButton onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </PrimaryButton>
        </div>
      )}

      {/* New Admin User Modal */}
      <Modal open={showNewUser} onClose={() => setShowNewUser(false)} title="New Admin User">
        <div className="space-y-4">
          <input ref={nameRef} placeholder="Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <input ref={emailRef} placeholder="Email" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <input ref={passwordRef} type="password" placeholder="Password" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
          <select ref={roleRef} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground">
            <option value="">Access Role</option>
            <option value="ADMIN">Admin</option>
            <option value="BOOKING_MANAGER">Booking Manager</option>
            <option value="VIEW_ONLY">View Only</option>
          </select>
          <div className="flex gap-3">
            <OutlineButton className="flex-1" onClick={() => setShowNewUser(false)}>Cancel</OutlineButton>
            <PrimaryButton className="flex-1" onClick={handleCreateUser} disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
