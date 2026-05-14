'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { reportService, downloadBlob } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DownloadButton } from '@/components/shared/ActionButtons';

/**
 * Shared page body used by each /dashboard/reports/<slug> route.
 * Each report fetches JSON, renders columns from `REPORTS[key]`, and supports:
 *   - text search (client-side filter on visible rows)
 *   - date range with arrow nav and from/to picker
 *   - top-right export to xlsx/zip
 *   - per-row download (only on grouped reports — puja/chadhava sankalp + appointments)
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
  /** Format used by the top-right export icon. */
  exportFormat?: 'xlsx' | 'zip';
  /** Field on each row that holds the row's ID for per-row download (e.g. `event_id`, `astrologer_id`). When undefined the per-row download icon is hidden. */
  rowDownloadKey?: string;
}

const REPORTS: Record<ReportKey, ReportMeta> = {
  'puja-sankalp': {
    title: 'Puja Sankalp Report',
    fetcher: reportService.pujaSankalp,
    exportFormat: 'zip',
    rowDownloadKey: 'event_id',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'pujaName', label: 'Puja Name' },
      { key: 'temple', label: 'Temple' },
      { key: 'devotee', label: 'Devotee' },
      { key: 'startTime', label: 'Start Time' },
      { key: 'received', label: 'Received', render: (r: any) => <span className="text-primary">₹{r.received}</span> },
      { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'pujari', label: 'Pujari' },
    ],
  },
  'chadhava-sankalp': {
    title: 'Chadhava Sankalp Report',
    fetcher: reportService.chadhavaSankalp,
    exportFormat: 'zip',
    rowDownloadKey: 'event_id',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'chadhavaName', label: 'Chadhava Name' },
      { key: 'temple', label: 'Temple' },
      { key: 'devotee', label: 'Devotee' },
      { key: 'startTime', label: 'Start Time' },
      { key: 'received', label: 'Received', render: (r: any) => <span className="text-primary">₹{r.received}</span> },
      { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'pujari', label: 'Pujari' },
    ],
  },
  'chadhava-offerings': {
    title: 'Chadhava Offerings Report',
    fetcher: reportService.chadhavaOfferings,
    exportFormat: 'xlsx',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'chadhavaName', label: 'Chadhava Name' },
      { key: 'temple', label: 'Temple' },
      { key: 'startTime', label: 'Start Time' },
      {
        key: 'offeringsAndQuantity', label: 'Offerings & Quantity',
        render: (r: any) => <pre className="text-[10px] text-muted-foreground whitespace-pre-line">{r.offeringsAndQuantity}</pre>,
      },
    ],
  },
  'appointments': {
    title: 'Appointments Report',
    fetcher: reportService.appointments,
    exportFormat: 'zip',
    rowDownloadKey: 'astrologer_id',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'astrologerName', label: 'Astrologer Name' },
      { key: 'bookings', label: 'Bookings' },
      {
        key: 'meetLinkAvailable', label: 'Meet Link Available',
        render: (r: any) => {
          const [got, total] = String(r.meetLinkAvailable ?? '0/0').split('/').map(Number);
          const ok = got >= total;
          return <span className={ok ? 'text-status-completed' : 'text-status-not-started'}>{r.meetLinkAvailable}</span>;
        },
      },
      { key: 'received', label: 'Received', render: (r: any) => <span className="text-primary">₹{r.received}</span> },
    ],
  },
  'ledger': {
    title: 'Ledger',
    fetcher: reportService.ledger,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'party_name', label: 'Party Name' },
      { key: 'party_type', label: 'Role', render: (r: any) => <StatusBadge status={r.party_type} /> },
      { key: 'booking_type', label: 'Booking Type' },
      { key: 'fee', label: 'Fee', render: (r: any) => <span className="text-primary">₹{r.fee}</span> },
      { key: 'settled', label: 'Settled', render: (r: any) => <StatusBadge status={r.settled ? 'COMPLETED' : 'PENDING'} /> },
    ],
  },
  'all-bookings': {
    title: 'All Bookings Report',
    fetcher: reportService.allBookings,
    exportFormat: 'xlsx',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'devoteeName', label: 'Devotee Name' },
      { key: 'type', label: 'Type', render: (r: any) => <StatusBadge status={r.type} /> },
      { key: 'service', label: 'Service' },
      { key: 'dateTime', label: 'Date & Time' },
      { key: 'cost', label: 'Cost', render: (r: any) => <span className="text-primary">₹{r.cost}</span> },
      { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    ],
  },
  'summary': {
    title: 'Summary Report',
    fetcher: reportService.summary,
    exportFormat: 'xlsx',
    columns: [
      { key: 'variable', label: 'Variable' },
      { key: 'totalNumber', label: 'Total Number' },
      { key: 'totalCost', label: 'Total Cost', render: (r: any) => <span className="text-status-not-started">₹{r.totalCost}</span> },
      { key: 'totalFee', label: 'Total Fee', render: (r: any) => <span className="text-primary">₹{r.totalFee}</span> },
      { key: 'netProfit', label: 'Net Profit', render: (r: any) => <span className="text-status-completed">₹{r.netProfit}</span> },
    ],
  },
  'temple-wise': {
    title: 'Temple Wise Bookings Report',
    fetcher: reportService.templeWise,
    exportFormat: 'xlsx',
    columns: [
      { key: 'temple', label: 'Temple' },
      { key: 'pujaBookings', label: 'Puja Bookings' },
      { key: 'pujaCost', label: 'Puja Cost', render: (r: any) => <span className="text-primary">₹{r.pujaCost}</span> },
      { key: 'chadhavasBookings', label: 'Chadhavas Bookings' },
      { key: 'chadhavaCost', label: 'Chadhava Cost', render: (r: any) => <span className="text-primary">₹{r.chadhavaCost}</span> },
    ],
  },
  'deity-wise': {
    title: 'Deity Wise Bookings Report',
    fetcher: reportService.deityWise,
    exportFormat: 'xlsx',
    columns: [
      { key: 'deity', label: 'Deity' },
      { key: 'pujaBookings', label: 'Puja Bookings' },
      { key: 'pujaCost', label: 'Puja Cost', render: (r: any) => <span className="text-primary">₹{r.pujaCost}</span> },
      { key: 'chadhavasBookings', label: 'Chadhavas Bookings' },
      { key: 'chadhavaCost', label: 'Chadhava Cost', render: (r: any) => <span className="text-primary">₹{r.chadhavaCost}</span> },
    ],
  },
  'devotee-wise': {
    title: 'Devotee Wise Bookings Report',
    fetcher: reportService.devoteeWise,
    exportFormat: 'xlsx',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'pujas', label: 'Pujas' },
      { key: 'chadhavas', label: 'Chadhavas' },
      { key: 'appointments', label: 'Appointments' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'totalCost', label: 'Total Cost', render: (r: any) => <span className="text-primary">₹{r.totalCost}</span> },
    ],
  },
};

function filterRows(rows: any[], search: string) {
  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter((r) =>
    Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)),
  );
}

export function ReportPage({ reportKey }: { reportKey: ReportKey }) {
  const meta = REPORTS[reportKey];
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingRow, setDownloadingRow] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;
      const res = await meta.fetcher(params);
      setData(res.data?.data ?? res.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load report');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [meta, fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    if (!meta.exportFormat) return;
    try {
      setExporting(true);
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;
      const res = await reportService.downloadReport(reportKey, meta.exportFormat, params);
      downloadBlob(res, `${meta.title}.${meta.exportFormat}`);
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleRowDownload = async (row: any) => {
    if (!meta.rowDownloadKey) return;
    const rowId = row[meta.rowDownloadKey];
    if (!rowId) return;
    try {
      setDownloadingRow(rowId);
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;
      const res = await reportService.downloadRow(reportKey, rowId, params);
      downloadBlob(res, `${meta.title} - ${rowId}.zip`);
    } catch (err: any) {
      alert(err.response?.data?.message ?? err.message ?? 'Download failed');
    } finally {
      setDownloadingRow(null);
    }
  };

  // Build the columns we'll actually render, appending the action column when
  // the report supports per-row download.
  const columns = meta.rowDownloadKey
    ? [
        ...meta.columns,
        {
          key: 'action',
          label: '',
          render: (row: any) => (
            <DownloadButton
              onClick={() => handleRowDownload(row)}
              disabled={downloadingRow === row[meta.rowDownloadKey!]}
              title="Download for this row"
            />
          ),
        },
      ]
    : meta.columns;

  const visible = filterRows(data, search);

  return (
    <div>
      <div className="px-6 pt-4 flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">{meta.title}</h1>
      </div>
      <PageHeader
        search={search}
        onSearchChange={setSearch}
        showDateNav
        showExport={!!meta.exportFormat}
        fromDate={fromDate}
        toDate={toDate}
        onDateChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
        onExport={meta.exportFormat ? handleExport : undefined}
      />
      {loading && <div className="px-6 pb-6 text-sm text-muted-foreground">Loading report…</div>}
      {error && <div className="px-6 pb-6 text-sm text-red-500">{error}</div>}
      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground">No data for the selected filters.</div>
          ) : (
            <DataTable columns={columns} data={visible} />
          )}
          {exporting && <div className="px-6 pb-6 text-xs text-muted-foreground">Preparing export…</div>}
        </>
      )}
    </div>
  );
}
