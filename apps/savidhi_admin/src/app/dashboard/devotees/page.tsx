'use client';

import { useState, useEffect, useCallback } from 'react';
import { devoteeService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton } from '@/components/shared/ActionButtons';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { DevoteeAdmin } from '@/types';

interface ApiDevotee {
  id: string;
  name: string;
  phone: string;
  gotra: string;
  image_url: string;
  level: number;
  gems: number;
  is_active: boolean;
  created_at: string;
}

export default function DevoteesPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DevoteeAdmin | null>(null);

  const [devotees, setDevotees] = useState<DevoteeAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevotees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devoteeService.list({ search: search || undefined });
      const raw: ApiDevotee[] = res.data?.data || res.data || [];

      const mapped: DevoteeAdmin[] = raw.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        gotra: d.gotra,
        level: d.level,
        joinedSince: d.created_at
          ? new Date(d.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : '-',
      }));
      setDevotees(mapped);
    } catch (err) {
      console.error('Failed to fetch devotees:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDevotees();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDevotees();
  }, [search]);  // eslint-disable-line react-hooks/exhaustive-deps

  const openView = async (devotee: DevoteeAdmin) => {
    try {
      const res = await devoteeService.getById(devotee.id);
      const detail = res.data?.data || res.data;
      setSelected({
        ...devotee,
        bookings: detail?.bookings || [],
      });
    } catch {
      setSelected(devotee);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'gotra', label: 'Gotra' },
    { key: 'level', label: 'Level' },
    { key: 'joinedSince', label: 'Joined Since' },
    { key: 'action', label: 'Action', render: (r: DevoteeAdmin) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => openView(r)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} />
      <DataTable columns={columns} data={devotees} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="">
        {selected && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 bg-accent rounded-full mx-auto flex items-center justify-center text-3xl">👤</div>
            <div>
              <span className="text-[10px] text-primary uppercase tracking-wider">Level {selected.level}</span>
              <h3 className="text-sm font-bold text-foreground mt-1">{selected.name}</h3>
              <p className="text-[10px] text-muted-foreground">Devotee Since {selected.joinedSince}</p>
            </div>

            <div className="text-left">
              <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2">Bookings</h4>
              {selected.bookings && selected.bookings.length > 0 ? (
                selected.bookings.map((b, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 mb-2">
                    <p className="text-xs font-bold text-foreground">{b.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-line">{b.details}</p>
                    <StatusBadge status={b.status} className="mt-1 block" />
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground">No bookings found.</p>
              )}
            </div>

            <PrimaryButton className="w-full" onClick={() => setSelected(null)}>Close</PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
