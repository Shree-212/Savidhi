'use client';

import { useState, useEffect, useRef } from 'react';
import { hamperService } from '@/lib/services';
import { useDebouncedValue } from '@/lib/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';

interface Hamper {
  id: string;
  name: string;
  content_description: string;
  stock_qty: number;
  // Shipping dims/weight/value — used by booking-service when building the
  // Shiprocket /orders/create/adhoc payload. Defaults set in migration 024.
  length_cm?: number;
  breadth_cm?: number;
  height_cm?: number;
  weight_kg?: number;
  declared_value?: number;
}

export default function HampersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [hampers, setHampers] = useState<Hamper[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Hamper | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const breadthRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await hamperService.list({ search: debouncedSearch || undefined });
      setHampers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load hampers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch]);

  const handleAdd = () => {
    setIsNew(true);
    // Defaults mirror migration 024 so the create form doesn't leave the
    // Shiprocket payload with zero dims if the admin saves before editing.
    setEditing({
      id: '', name: '', content_description: '', stock_qty: 0,
      length_cm: 20, breadth_cm: 15, height_cm: 10, weight_kg: 0.5, declared_value: 100,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload = {
        name: nameRef.current?.value || '',
        content_description: descRef.current?.value || '',
        stock_qty: Number(qtyRef.current?.value) || 0,
        length_cm: Number(lengthRef.current?.value) || undefined,
        breadth_cm: Number(breadthRef.current?.value) || undefined,
        height_cm: Number(heightRef.current?.value) || undefined,
        weight_kg: Number(weightRef.current?.value) || undefined,
        declared_value: Number(valueRef.current?.value) || undefined,
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
    const attempt = async (force: boolean) => hamperService.delete(id, force ? { force: true } : undefined);
    try {
      const res = await attempt(false);
      alert(res.data?.message ?? 'Hamper deleted');
      await loadData();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.canForce) {
        const proceed = confirm(
          `${data.message}\n\nForce-delete will null the hamper link on archived pujas/chadhavas. This cannot be undone. Proceed?`,
        );
        if (!proceed) return;
        try {
          const res2 = await attempt(true);
          alert(res2.data?.message ?? 'Hamper deleted (force)');
          await loadData();
        } catch (err2: any) {
          alert(err2?.response?.data?.message || err2?.message || 'Force delete failed');
          console.error('Force delete failed', err2);
        }
        return;
      }
      alert(data?.message || err?.message || 'Failed to delete hamper');
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

      <Modal open={!!editing} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'New Hamper' : `Edit Hamper ${editing?.id?.slice(0, 8)}`}>
        {editing && (
          <div className="space-y-4">
            <input ref={nameRef} defaultValue={editing.name} placeholder="Hamper Name" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            <textarea ref={descRef} defaultValue={editing.content_description} placeholder="Content Description" className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none" />
            <input ref={qtyRef} defaultValue={editing.stock_qty || ''} placeholder="Quantity in Stock" className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />

            {/* Shipping dims / weight / declared value — required by Shiprocket
                /orders/create/adhoc when this hamper is shipped. */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Shipment dimensions (Shiprocket)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  ref={lengthRef}
                  type="number"
                  step="0.1"
                  defaultValue={editing.length_cm ?? 20}
                  placeholder="Length (cm)"
                  className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  ref={breadthRef}
                  type="number"
                  step="0.1"
                  defaultValue={editing.breadth_cm ?? 15}
                  placeholder="Breadth (cm)"
                  className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  ref={heightRef}
                  type="number"
                  step="0.1"
                  defaultValue={editing.height_cm ?? 10}
                  placeholder="Height (cm)"
                  className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  ref={weightRef}
                  type="number"
                  step="0.001"
                  defaultValue={editing.weight_kg ?? 0.5}
                  placeholder="Weight (kg)"
                  className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  ref={valueRef}
                  type="number"
                  step="0.01"
                  defaultValue={editing.declared_value ?? 100}
                  placeholder="Declared value (₹)"
                  className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
                />
              </div>
            </div>

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
