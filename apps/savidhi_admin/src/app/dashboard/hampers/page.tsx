'use client';

import { useState, useEffect, useRef } from 'react';
import { hamperService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

interface Hamper {
  id: string;
  name: string;
  content_description: string;
  stock_qty: number;
}

export default function HampersPage() {
  const [search, setSearch] = useState('');
  const [hampers, setHampers] = useState<Hamper[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Hamper | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await hamperService.list({ search: search || undefined });
      setHampers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load hampers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAdd = () => {
    setIsNew(true);
    setEditing({ id: '', name: '', content_description: '', stock_qty: 0 });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload = {
        name: nameRef.current?.value || '',
        content_description: descRef.current?.value || '',
        stock_qty: Number(qtyRef.current?.value) || 0,
      };
      if (isNew) {
        await hamperService.create(payload);
      } else {
        await hamperService.update(editing.id, payload);
      }
      setEditing(null);
      setIsNew(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save hamper', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hamper?')) return;
    try {
      await hamperService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete hamper', err);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r: Hamper) => r.id.slice(0, 8) },
    { key: 'name', label: 'Name' },
    { key: 'content_description', label: 'Content Description' },
    { key: 'stock_qty', label: 'Stock Qty' },
    { key: 'actions', label: 'Actions', render: (r: Hamper) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => { setIsNew(false); setEditing(r); }} />
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={handleAdd} />
      <DataTable columns={columns} data={hampers} />

      <Modal open={!!editing} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'New Hamper' : `Edit Hamper <${editing?.id?.slice(0, 8)}>`}>
        {editing && (
          <div className="space-y-4">
            <input ref={nameRef} defaultValue={editing.name} placeholder="Hamper Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <textarea ref={descRef} defaultValue={editing.content_description} placeholder="Content Description" className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <input ref={qtyRef} defaultValue={editing.stock_qty || ''} placeholder="Quantity in Stock" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            <div className="flex gap-3">
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
