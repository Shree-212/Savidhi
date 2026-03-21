'use client';

import { useState, useEffect, useRef } from 'react';
import { deityService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

interface Deity {
  id: string;
  name: string;
  image_url: string;
}

export default function DeitiesPage() {
  const [search, setSearch] = useState('');
  const [deities, setDeities] = useState<Deity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Deity | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await deityService.list({ search: search || undefined });
      setDeities(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load deities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAdd = () => {
    setIsNew(true);
    setEditing({ id: '', name: '', image_url: '' });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload = {
        name: nameRef.current?.value || '',
        image_url: editing.image_url || '',
      };
      if (isNew) {
        await deityService.create(payload);
      } else {
        await deityService.update(editing.id, payload);
      }
      setEditing(null);
      setIsNew(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save deity', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deity?')) return;
    try {
      await deityService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete deity', err);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r: Deity) => r.id.slice(0, 8) },
    { key: 'name', label: 'Type of Deity' },
    { key: 'action', label: 'Action', render: (r: Deity) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => { setIsNew(false); setEditing(r); }} />
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={handleAdd} />
      <DataTable columns={columns} data={deities} />

      <Modal open={!!editing} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'New Deity' : `Edit Type of Deity <${editing?.id?.slice(0, 8)}>`}>
        {editing && (
          <div className="space-y-4">
            <input ref={nameRef} defaultValue={editing.name} placeholder="Deity Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <p className="text-[10px] text-muted-foreground">Upload Image in Format 2525 x 3535</p>
            <div className="bg-accent border border-border rounded-lg h-48 flex items-center justify-center text-muted-foreground">
              <span className="text-primary cursor-pointer">✏️</span>
              <div className="text-center">
                <div className="text-4xl text-primary/50 mb-2">🙏</div>
                <span className="text-xs">Deity Image</span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
