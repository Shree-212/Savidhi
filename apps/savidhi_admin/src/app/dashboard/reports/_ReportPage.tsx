'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { reportService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DownloadButton } from '@/components/shared/ActionButtons';
import type {
  PujaSankalpReport, ChadhavaSankalpReport, AppointmentsReport,
  LedgerReport, AllBookingsReport, SummaryReport, TempleWiseReport, DeityWiseReport, DevoteeWiseReport,
  ChadhavaOfferingsReport,
} from '@/types';

/**
 * Shared page body used by each /dashboard/reports/<slug> route.
 * Keeps a single definition of columns + fetcher per report while giving
 * every report its own shareable URL (filter state persists in the URL bar).
 */

export type ReportKey =
  | 'puja-sankalp'
  | 'chadhava-sankalp'
  | 'chadhava-offerings'
  | 'appointments'
  | 'ledger'
  | 'all-bookings'
  | 'summary'
  | 'temple-wise'
  | 'deity-wise'
  | 'devotee-wise';

interface ReportMeta {
  title: string;
  fetcher: (params?: any) => Promise<any>;
  columns: any[];
}

const REPORTS: Record<ReportKey, ReportMeta> = {
  'puja-sankalp': {
    title: 'Puja Sankalp Report',
    fetcher: reportService.pujaSankalp,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'pujaName', label: 'Puja Name' },
      { key: 'temple', label: 'Temple' },
      { key: 'devotee', label: 'Devotee' },
      { key: 'startTime', label: 'Start Time' },
      { key: 'received', label: 'Received', render: (r: PujaSankalpReport) => <span className="text-primary">₹{r.received}</span> },
      { key: 'status', label: 'Status', render: (r: PujaSankalpReport) => <StatusBadge status={r.status} /> },
      { key: 'pujari', label: 'Pujari' },
      { key: 'action', label: '', render: () => <DownloadButton /> },
    ],
  },
  'chadhava-sankalp': {
    title: 'Chadhava Sankalp Report',
    fetcher: reportService.chadhavaSankalp,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'chadhavaName', label: 'Chadhava Name' },
      { key: 'temple', label: 'Temple' },
      { key: 'devotee', label: 'Devotee' },
      { key: 'startTime', label: 'Start Time' },
      { key: 'received', label: 'Received', render: (r: ChadhavaSankalpReport) => <span className="text-primary">₹{r.received}</span> },
      { key: 'status', label: 'Status', render: (r: ChadhavaSankalpReport) => <StatusBadge status={r.status} /> },
      { key: 'pujari', label: 'Pujari' },
      { key: 'action', label: '', render: () => <DownloadButton /> },
    ],
  },
  'chadhava-offerings': {
    title: 'Chadhava Offerings Report',
    fetcher: reportService.chadhavaOfferings,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'chadhavaName', label: 'Chadhava Name' },
      { key: 'temple', label: 'Temple' },
      { key: 'startTime', label: 'Start Time' },
      {
        key: 'offeringsAndQuantity', label: 'Offerings & Quantity',
        render: (r: ChadhavaOfferingsReport) => <pre className="text-[10px] text-muted-foreground whitespace-pre-line">{r.offeringsAndQuantity}</pre>,
      },
    ],
  },
  'appointments': {
    title: 'Appointments Report',
    fetcher: reportService.appointments,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'astrologerName', label: 'Astrologer Name' },
      { key: 'bookings', label: 'Bookings' },
      {
        key: 'meetLinkAvailable', label: 'Meet Link Available',
        render: (r: AppointmentsReport) => (
          <span className={(r.meetLinkAvailable ?? '').startsWith('8') ? 'text-status-not-started' : 'text-status-completed'}>
            {r.meetLinkAvailable}
          </span>
        ),
      },
      { key: 'received', label: 'Received', render: (r: AppointmentsReport) => <span className="text-primary">₹{r.received}</span> },
      { key: 'action', label: '', render: () => <DownloadButton /> },
    ],
  },
  'ledger': {
    title: 'Ledger',
    fetcher: reportService.ledger,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'partyName', label: 'Party Name' },
      { key: 'role', label: 'Role', render: (r: LedgerReport) => <StatusBadge status={r.role} /> },
      { key: 'puja', label: 'Puja' },
      { key: 'chadhava', label: 'Chadhava' },
      { key: 'appointment', label: 'Appointment' },
      { key: 'totalFee', label: 'Total Fee', render: (r: LedgerReport) => <span className="text-primary">₹{r.totalFee}</span> },
      { key: 'paid', label: 'Paid', render: (r: LedgerReport) => <span className="text-status-completed">₹{r.paid}</span> },
      { key: 'pending', label: 'Pending', render: (r: LedgerReport) => <span className="text-status-not-started">₹{r.pending}</span> },
      { key: 'status', label: 'Status', render: (r: LedgerReport) => <StatusBadge status={r.status} /> },
    ],
  },
  'all-bookings': {
    title: 'All Bookings Report',
    fetcher: reportService.allBookings,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'devoteeName', label: 'Devotee Name' },
      { key: 'type', label: 'Type', render: (r: AllBookingsReport) => <StatusBadge status={r.type} /> },
      { key: 'service', label: 'Service' },
      { key: 'dateTime', label: 'Date & Time' },
      { key: 'cost', label: 'Cost', render: (r: AllBookingsReport) => <span className="text-primary">₹{r.cost}</span> },
      { key: 'status', label: 'Status', render: (r: AllBookingsReport) => <StatusBadge status={r.status} /> },
    ],
  },
  'summary': {
    title: 'Summary Report',
    fetcher: reportService.summary,
    columns: [
      { key: 'variable', label: 'Variable' },
      { key: 'totalNumber', label: 'Total Number' },
      { key: 'totalCost', label: 'Total Cost', render: (r: SummaryReport) => <span className="text-status-not-started">₹{r.totalCost}</span> },
      { key: 'totalFee', label: 'Total Fee', render: (r: SummaryReport) => <span className="text-primary">₹{r.totalFee}</span> },
      { key: 'netProfit', label: 'Net Profit', render: (r: SummaryReport) => <span className="text-status-completed">₹{r.netProfit}</span> },
    ],
  },
  'temple-wise': {
    title: 'Temple Wise Bookings Report',
    fetcher: reportService.templeWise,
    columns: [
      { key: 'temple', label: 'Temple' },
      { key: 'pujaBookings', label: 'Puja Bookings' },
      { key: 'pujaCost', label: 'Puja Cost', render: (r: TempleWiseReport) => <span className="text-primary">₹{r.pujaCost}</span> },
      { key: 'chadhavasBookings', label: 'Chadhavas Bookings' },
      { key: 'chadhavaCost', label: 'Chadhava Cost', render: (r: TempleWiseReport) => <span className="text-primary">₹{r.chadhavaCost}</span> },
    ],
  },
  'deity-wise': {
    title: 'Deity Wise Bookings Report',
    fetcher: reportService.deityWise,
    columns: [
      { key: 'deity', label: 'Deity' },
      { key: 'pujaBookings', label: 'Puja Bookings' },
      { key: 'pujaCost', label: 'Puja Cost', render: (r: DeityWiseReport) => <span className="text-primary">₹{r.pujaCost}</span> },
      { key: 'chadhavasBookings', label: 'Chadhavas Bookings' },
      { key: 'chadhavaCost', label: 'Chadhava Cost', render: (r: DeityWiseReport) => <span className="text-primary">₹{r.chadhavaCost}</span> },
    ],
  },
  'devotee-wise': {
    title: 'Devotee Wise Bookings Report',
    fetcher: reportService.devoteeWise,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'pujas', label: 'Pujas' },
      { key: 'chadhavas', label: 'Chadhavas' },
      { key: 'appointments', label: 'Appointments' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'totalCost', label: 'Total Cost', render: (r: DevoteeWiseReport) => <span className="text-primary">₹{r.totalCost}</span> },
    ],
  },
};

export function ReportPage({ reportKey }: { reportKey: ReportKey }) {
  const meta = REPORTS[reportKey];
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await meta.fetcher({ search: search || undefined });
      setData(res.data?.data ?? res.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load report');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [meta, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="px-6 pt-4 flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">{meta.title}</h1>
      </div>
      <PageHeader search={search} onSearchChange={setSearch} showFilters showDateNav showExport />
      {loading && <div className="px-6 pb-6 text-sm text-muted-foreground">Loading report…</div>}
      {error && <div className="px-6 pb-6 text-sm text-red-500">{error}</div>}
      {!loading && !error && <DataTable columns={meta.columns} data={data} />}
    </div>
  );
}
