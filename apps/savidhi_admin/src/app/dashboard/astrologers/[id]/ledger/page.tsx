'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { astrologerService } from '@/lib/services';
import { apiClient } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function AstrologerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await astrologerService.getLedger(id, { limit: 100 });
      setData(res.data?.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSettleAll = async () => {
    if (!confirm(`Mark ₹${data?.unsettled?.toLocaleString() ?? 0} as paid out?`)) return;
    try {
      setSettling(true);
      await apiClient.post(`/catalog/astrologers/${id}/ledger/settle`);
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

  const columns = [
    { key: 'created_at', label: 'Date', render: (r: any) => new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) },
    { key: 'event_type', label: 'Type' },
    { key: 'devotee_name', label: 'Devotee' },
    { key: 'appointment_duration', label: 'Duration' },
    { key: 'event_time', label: 'Scheduled', render: (r: any) => r.event_time ? new Date(r.event_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
    { key: 'fee', label: 'Fee', render: (r: any) => <span className="text-primary font-semibold">₹{Number(r.fee).toLocaleString()}</span> },
    { key: 'settled', label: 'Status', render: (r: any) => <StatusBadge status={r.settled ? 'SETTLED' : 'UNSETTLED'} /> },
    { key: 'settled_at', label: 'Settled On', render: (r: any) => r.settled_at ? new Date(r.settled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/astrologers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Ledger — {data.astrologer.name}</h1>
          <p className="text-xs text-muted-foreground">Consultation fees. Settle to mark as paid out.</p>
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
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Settled</p>
          <p className="text-2xl font-bold text-status-completed mt-1">₹{Number(data.settled).toLocaleString()}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-accent/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Earned</p>
          <p className="text-2xl font-bold text-foreground mt-1">₹{Number(data.total_earned).toLocaleString()}</p>
        </div>
      </div>

      <DataTable columns={columns} data={data.entries ?? []} />
    </div>
  );
}
