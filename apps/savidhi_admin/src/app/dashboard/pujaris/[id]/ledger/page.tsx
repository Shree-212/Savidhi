'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { pujariService } from '@/lib/services';
import { apiClient } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface LedgerEntry {
  id: string;
  event_type: string;
  event_id: string;
  event_name?: string;
  temple_name?: string;
  event_time?: string;
  fee: string | number;
  settled: boolean;
  settled_at?: string | null;
  created_at: string;
}

export default function PujariLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pujariService.getLedger(id, { limit: 100 });
      setData(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSettleAll = async () => {
    if (!confirm(`Mark all ₹${data?.unsettled?.toLocaleString() ?? 0} of unsettled earnings as paid?`)) return;
    try {
      setSettling(true);
      await apiClient.post(`/catalog/pujaris/${id}/ledger/settle`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Settle failed');
    } finally {
      setSettling(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading ledger…</div>;
  if (error) return (
    <div className="p-6">
      <p className="text-sm text-red-500 mb-3">{error}</p>
      <OutlineButton onClick={load}>Retry</OutlineButton>
    </div>
  );
  if (!data) return null;

  const entries: LedgerEntry[] = data.entries ?? [];

  const columns = [
    { key: 'created_at', label: 'Date', render: (r: LedgerEntry) => new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) },
    { key: 'event_type', label: 'Type' },
    { key: 'event_name', label: 'Event', render: (r: LedgerEntry) => r.event_name ?? r.event_id.slice(0, 8) },
    { key: 'temple_name', label: 'Temple' },
    { key: 'event_time', label: 'Scheduled', render: (r: LedgerEntry) => r.event_time ? new Date(r.event_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—' },
    { key: 'fee', label: 'Fee', render: (r: LedgerEntry) => <span className="text-primary font-semibold">₹{Number(r.fee).toLocaleString()}</span> },
    { key: 'settled', label: 'Status', render: (r: LedgerEntry) => <StatusBadge status={r.settled ? 'SETTLED' : 'UNSETTLED'} /> },
    { key: 'settled_at', label: 'Settled On', render: (r: LedgerEntry) => r.settled_at ? new Date(r.settled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/pujaris" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Ledger — {data.pujari.name}</h1>
          <p className="text-xs text-muted-foreground">All earnings from pujas and chadhavas. Settle to mark as paid out.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-lg p-4 bg-accent/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unsettled</p>
          <p className="text-2xl font-bold text-primary mt-1">₹{Number(data.unsettled).toLocaleString()}</p>
          {data.unsettled > 0 && (
            <PrimaryButton className="mt-3 w-full" onClick={handleSettleAll} disabled={settling}>
              {settling ? 'Settling…' : 'Settle All'}
            </PrimaryButton>
          )}
        </div>
        <div className="border border-border rounded-lg p-4 bg-accent/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Settled (all time)</p>
          <p className="text-2xl font-bold text-status-completed mt-1">₹{Number(data.settled).toLocaleString()}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-accent/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Earned</p>
          <p className="text-2xl font-bold text-foreground mt-1">₹{Number(data.total_earned).toLocaleString()}</p>
        </div>
      </div>

      <DataTable columns={columns} data={entries} />
    </div>
  );
}
