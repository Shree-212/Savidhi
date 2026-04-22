'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminUserService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PrimaryButton, OutlineButton, EditButton, DeleteButton } from '@/components/shared/ActionButtons';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'BOOKING_MANAGER' | 'VIEW_ONLY';
  is_active: boolean;
  created_at: string;
}

const ROLES: Array<AdminUser['role']> = ['ADMIN', 'BOOKING_MANAGER', 'VIEW_ONLY'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminUser['role']>('VIEW_ONLY');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminUserService.list();
      setUsers(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setIsNew(true);
    setEditing({ id: '', email: '', name: '', role: 'VIEW_ONLY', is_active: true, created_at: '' });
    setEmail(''); setName(''); setPassword(''); setRole('VIEW_ONLY');
  };

  const openEdit = (u: AdminUser) => {
    setIsNew(false);
    setEditing(u);
    setEmail(u.email); setName(u.name); setPassword(''); setRole(u.role);
  };

  const handleSave = async () => {
    if (!email.trim() || !name.trim()) return alert('Email and name are required');
    if (isNew && !password.trim()) return alert('Password is required for new users');
    try {
      setSaving(true);
      if (isNew) {
        await adminUserService.create({ email, name, password, role });
      } else if (editing) {
        await adminUserService.update(editing.id, { name, role, ...(password ? { password } : {}) });
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Deactivate ${u.email}?`)) return;
    try {
      await adminUserService.delete(u.id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Delete failed');
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role', render: (r: AdminUser) => <StatusBadge status={r.role} /> },
    { key: 'is_active', label: 'Status', render: (r: AdminUser) => <StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'created_at', label: 'Created', render: (r: AdminUser) => new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) },
    { key: 'action', label: 'Action', render: (r: AdminUser) => (
      <div className="flex items-center gap-1">
        <EditButton onClick={() => openEdit(r)} />
        <DeleteButton onClick={() => handleDelete(r)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader onAdd={openCreate} />
      {loading && <p className="p-4 text-xs text-muted-foreground">Loading…</p>}
      {error && <p className="p-4 text-xs text-red-500">{error}</p>}
      <DataTable columns={columns} data={users} />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? 'New Admin User' : `Edit ${editing?.email}`}
      >
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              disabled={!isNew}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">
              Password {!isNew && <span className="text-muted-foreground text-[9px]">(leave blank to keep)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isNew ? 'Min 6 characters' : '••••••'}
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUser['role'])}
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              ADMIN = full access · BOOKING_MANAGER = events + bookings · VIEW_ONLY = read-only reports
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <OutlineButton className="flex-1" onClick={() => setEditing(null)}>Cancel</OutlineButton>
            <PrimaryButton className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
