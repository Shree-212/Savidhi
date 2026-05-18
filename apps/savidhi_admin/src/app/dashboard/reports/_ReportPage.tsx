'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';
import JSZip from 'jszip';
import { reportService, downloadBlob } from '@/lib/services';
import { buildPdf, downloadBlob as downloadFileBlob } from '@/lib/reportPdf';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { sortRows, type SortDir } from '@/lib/sort';
import { StatusBadge } from '@/components/shared/StatusBadge';

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
  | 'chadhava-offerings-detail'
  | 'appointments'
  | 'payments'
  | 'ledger'
  | 'all-bookings'
  | 'summary'
  | 'daily-revenue'
  | 'cancellations'
  | 'workload'
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
  /** When true, the report page maintains a page state and reads `meta.totalPages` from the response. */
  paginated?: boolean;
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
    paginated: true,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'devoteeName', label: 'Devotee' },
      { key: 'phone', label: 'Phone', render: (r: any) => r.phone ? <span className="font-mono text-[11px]">+91 {r.phone}</span> : <span className="text-muted-foreground">—</span> },
      { key: 'sankalpDevotees', label: 'Sankalp Names' },
      { key: 'type', label: 'Type', render: (r: any) => <StatusBadge status={r.type} /> },
      { key: 'service', label: 'Service' },
      { key: 'dateTime', label: 'Date & Time' },
      { key: 'cost', label: 'Cost', render: (r: any) => <span className="text-primary">₹{r.cost}</span> },
      { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'paymentStatus', label: 'Payment', render: (r: any) => r.paymentStatus ? <StatusBadge status={r.paymentStatus} /> : <span className="text-muted-foreground">—</span> },
    ],
  },
  'summary': {
    title: 'Summary Report',
    fetcher: reportService.summary,
    exportFormat: 'xlsx',
    columns: [
      { key: 'variable', label: 'Variable' },
      { key: 'totalNumber', label: 'Total' },
      { key: 'completed', label: 'Completed', render: (r: any) => <span className="text-status-completed">{r.completed}</span> },
      { key: 'cancelled', label: 'Cancelled', render: (r: any) => <span className="text-destructive">{r.cancelled}</span> },
      { key: 'active', label: 'Active' },
      { key: 'totalCost', label: 'Revenue (₹)', render: (r: any) => <span className="text-primary">₹{r.totalCost}</span> },
    ],
  },
  'payments': {
    title: 'Payments Report',
    fetcher: reportService.payments,
    exportFormat: 'xlsx',
    paginated: true,
    columns: [
      { key: 'createdAt', label: 'Created' },
      { key: 'bookingType', label: 'Type', render: (r: any) => <StatusBadge status={r.bookingType} /> },
      { key: 'serviceName', label: 'Service' },
      { key: 'devoteeName', label: 'Devotee' },
      { key: 'phone', label: 'Phone', render: (r: any) => r.phone ? <span className="font-mono text-[11px]">+91 {r.phone}</span> : <span className="text-muted-foreground">—</span> },
      { key: 'amount', label: 'Amount', render: (r: any) => <span className="text-primary">₹{r.amount}</span> },
      { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
      { key: 'isStub', label: 'Stub?', render: (r: any) => r.isStub === 'Yes' ? <span className="text-status-not-started">Stub</span> : <span className="text-status-completed">Live</span> },
      { key: 'orderId', label: 'Order ID', render: (r: any) => <span className="font-mono text-[10px]">{r.orderId}</span> },
      { key: 'paymentId', label: 'Payment ID', render: (r: any) => r.paymentId ? <span className="font-mono text-[10px]">{r.paymentId}</span> : <span className="text-muted-foreground">—</span> },
      { key: 'lastUpdated', label: 'Last Updated' },
    ],
  },
  'daily-revenue': {
    title: 'Daily Revenue Report',
    fetcher: reportService.dailyRevenue,
    exportFormat: 'xlsx',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'pujaRevenue', label: 'Puja Revenue', render: (r: any) => <span className="text-primary">₹{r.pujaRevenue}</span> },
      { key: 'chadhavaRevenue', label: 'Chadhava Revenue', render: (r: any) => <span className="text-primary">₹{r.chadhavaRevenue}</span> },
      { key: 'apptRevenue', label: 'Appt Revenue', render: (r: any) => <span className="text-primary">₹{r.apptRevenue}</span> },
      { key: 'totalRevenue', label: 'Total Revenue', render: (r: any) => <span className="text-primary font-semibold">₹{r.totalRevenue}</span> },
      { key: 'bookings', label: 'Bookings' },
      { key: 'cancelled', label: 'Cancelled', render: (r: any) => <span className="text-destructive">{r.cancelled}</span> },
      { key: 'refunded', label: 'Refunded' },
    ],
  },
  'cancellations': {
    title: 'Cancellations & Refunds',
    fetcher: reportService.cancellations,
    exportFormat: 'xlsx',
    columns: [
      { key: 'bookingId', label: 'Booking ID', render: (r: any) => <span className="font-mono text-[10px]">{r.bookingId}</span> },
      { key: 'type', label: 'Type', render: (r: any) => <StatusBadge status={r.type} /> },
      { key: 'devotee', label: 'Devotee' },
      { key: 'phone', label: 'Phone', render: (r: any) => r.phone ? <span className="font-mono text-[11px]">+91 {r.phone}</span> : <span className="text-muted-foreground">—</span> },
      { key: 'service', label: 'Service' },
      { key: 'eventDate', label: 'Event Date' },
      { key: 'cost', label: 'Cost', render: (r: any) => <span className="text-primary">₹{r.cost}</span> },
      { key: 'cancelledAt', label: 'Cancelled At' },
      { key: 'paymentStatus', label: 'Payment Status', render: (r: any) => <StatusBadge status={r.paymentStatus} /> },
      { key: 'refundEligible', label: 'Refund Eligible', render: (r: any) => r.refundEligible === 'Yes' ? <span className="text-status-not-started font-semibold">Yes</span> : <span className="text-muted-foreground">No</span> },
    ],
  },
  'workload': {
    title: 'Pujari & Astrologer Workload',
    fetcher: reportService.workload,
    exportFormat: 'xlsx',
    columns: [
      { key: 'role', label: 'Role', render: (r: any) => <StatusBadge status={r.role} /> },
      { key: 'name', label: 'Name' },
      { key: 'pujaUpcoming', label: 'Puja Up.' },
      { key: 'pujaCompleted', label: 'Puja Done' },
      { key: 'chadhavaUpcoming', label: 'Chadh. Up.' },
      { key: 'chadhavaCompleted', label: 'Chadh. Done' },
      { key: 'apptUpcoming', label: 'Appt Up.' },
      { key: 'apptCompleted', label: 'Appt Done' },
      { key: 'totalUpcoming', label: 'Total Upcoming', render: (r: any) => <span className="font-semibold">{r.totalUpcoming}</span> },
      { key: 'totalCompleted', label: 'Total Completed', render: (r: any) => <span className="text-status-completed">{r.totalCompleted}</span> },
    ],
  },
  'chadhava-offerings-detail': {
    title: 'Chadhava Offerings Detail',
    fetcher: reportService.chadhavaOfferingsDetail,
    exportFormat: 'xlsx',
    columns: [
      { key: 'eventDate', label: 'Event Date' },
      { key: 'chadhavaName', label: 'Chadhava' },
      { key: 'temple', label: 'Temple' },
      { key: 'bookedBy', label: 'Booked By' },
      { key: 'phone', label: 'Phone', render: (r: any) => r.phone ? <span className="font-mono text-[11px]">+91 {r.phone}</span> : <span className="text-muted-foreground">—</span> },
      { key: 'sankalpDevotees', label: 'Sankalp Names' },
      { key: 'offering', label: 'Offering' },
      { key: 'quantity', label: 'Qty' },
      { key: 'unitPrice', label: 'Unit Price', render: (r: any) => <span className="text-primary">₹{r.unitPrice}</span> },
      { key: 'lineTotal', label: 'Line Total', render: (r: any) => <span className="text-primary">₹{r.lineTotal}</span> },
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

/** Column spec used by the per-row PDF export for grouped reports. */
function innerColumnsFor(key: ReportKey): { key: string; label: string }[] {
  if (key === 'puja-sankalp') {
    return [
      { key: 'sl', label: 'SL' },
      { key: 'name', label: 'Devotee Name' },
      { key: 'gotra', label: 'Gotra' },
    ];
  }
  if (key === 'chadhava-sankalp') {
    return [
      { key: 'sl', label: 'SL' },
      { key: 'name', label: 'Devotee Name' },
      { key: 'gotra', label: 'Gotra' },
      { key: 'offerings', label: 'Offerings (qty × item)' },
    ];
  }
  if (key === 'appointments') {
    return [
      { key: 'sl', label: 'SL' },
      { key: 'name', label: 'Devotee Name' },
      { key: 'gotra', label: 'Gotra' },
      { key: 'start', label: 'Start Time' },
      { key: 'duration', label: 'Duration' },
      { key: 'link', label: 'Meeting Link' },
    ];
  }
  return [];
}

/** Strip filesystem-hostile characters from a string for use as a filename. */
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 200) || 'export';
}

function filterRows(rows: any[], search: string) {
  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter((r) =>
    Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)),
  );
}

// sortRows extracted to @/lib/sort so the bookings list pages share the same
// implementation. Imported above.

export function ReportPage({ reportKey, reportPicker }: { reportKey: ReportKey; reportPicker?: React.ReactNode }) {
  const meta = REPORTS[reportKey];
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingRow, setDownloadingRow] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  // Pagination — only consulted when `meta.paginated`. Page resets to 1 when
  // the report changes or filters change.
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 100;

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;
      if (meta.paginated) {
        params.page = page;
        params.limit = PAGE_SIZE;
      }
      const res = await meta.fetcher(params);
      setData(res.data?.data ?? res.data ?? []);
      if (meta.paginated) {
        const tp = Number(res.data?.meta?.totalPages ?? 1);
        setTotalPages(Math.max(1, tp));
      } else {
        setTotalPages(1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load report');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [meta, fromDate, toDate, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 whenever the report key, search, or date range changes.
  useEffect(() => { setPage(1); }, [reportKey, fromDate, toDate]);

  // The download endpoints use responseType:'blob' so axios returns the error
  // body as a Blob. Read it as text and try to parse the JSON message so the
  // alert shows the real reason instead of "Request failed with status code 500".
  const extractBlobError = async (err: any): Promise<string> => {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        try {
          const parsed = JSON.parse(text);
          return parsed?.message ?? text;
        } catch {
          return text || err.message || 'Download failed';
        }
      } catch {
        return err.message || 'Download failed';
      }
    }
    return data?.message ?? err.message ?? 'Download failed';
  };

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
      alert(await extractBlobError(err));
    } finally {
      setExporting(false);
    }
  };

  /**
   * Top-of-report PDF export.
   * Single-file reports → render `visible` rows directly using `meta.columns`.
   * Multi-file reports (per-row download) → fetch the inner data per row as
   * JSON, build one PDF per row, zip them with JSZip, save as `.zip`.
   */
  const handleExportPdf = async () => {
    try {
      setExporting(true);
      const pdfCols = meta.columns.map((c: any) => ({ key: c.key, label: c.label }));

      if (!meta.rowDownloadKey) {
        const blob = await buildPdf(meta.title, visible, pdfCols);
        downloadFileBlob(blob, `${meta.title}.pdf`);
        return;
      }

      // Multi-file: build one PDF per row in-browser, then zip.
      const zip = new JSZip();
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;

      for (const row of visible) {
        const rowId = row[meta.rowDownloadKey];
        if (!rowId) continue;
        const res = await reportService.rowJson(reportKey, rowId, params);
        const payload = res.data?.data ?? {};
        const label = payload.label ?? rowId;
        const inner: any[] = payload.devotees ?? payload.appointments ?? [];
        const innerCols = innerColumnsFor(reportKey);
        const blob = await buildPdf(`${meta.title} — ${label}`, inner, innerCols);
        const arr = await blob.arrayBuffer();
        zip.file(`${sanitizeFilename(label)}.pdf`, arr);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFileBlob(zipBlob, `${meta.title}.zip`);
    } catch (err: any) {
      alert(err?.message ?? 'PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleRowDownloadXlsx = async (row: any) => {
    if (!meta.rowDownloadKey) return;
    const rowId = row[meta.rowDownloadKey];
    if (!rowId) return;
    try {
      setDownloadingRow(rowId);
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;
      const res = await reportService.downloadRow(reportKey, rowId, 'xlsx', params);
      downloadBlob(res, `${meta.title} - ${rowId}.xlsx`);
    } catch (err: any) {
      alert(await extractBlobError(err));
    } finally {
      setDownloadingRow(null);
    }
  };

  const handleRowDownloadPdf = async (row: any) => {
    if (!meta.rowDownloadKey) return;
    const rowId = row[meta.rowDownloadKey];
    if (!rowId) return;
    try {
      setDownloadingRow(rowId);
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate)   params.to_date   = toDate;
      const res = await reportService.rowJson(reportKey, rowId, params);
      const payload = res.data?.data ?? {};
      const label = payload.label ?? rowId;
      const inner: any[] = payload.devotees ?? payload.appointments ?? [];
      const innerCols = innerColumnsFor(reportKey);
      const blob = await buildPdf(`${meta.title} — ${label}`, inner, innerCols);
      downloadFileBlob(blob, `${meta.title} - ${label}.pdf`);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err?.message ?? 'PDF export failed');
    } finally {
      setDownloadingRow(null);
    }
  };

  // Build the columns we'll actually render, appending the action column when
  // the report supports per-row download. Two icons per row: XLSX + PDF.
  const columns = meta.rowDownloadKey
    ? [
        ...meta.columns,
        {
          key: 'action',
          label: '',
          sortable: false as const,
          render: (row: any) => {
            const rowId = row[meta.rowDownloadKey!];
            const busy = downloadingRow === rowId;
            return (
              <div className="flex items-center gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => handleRowDownloadXlsx(row)}
                  disabled={busy}
                  title="Download XLSX"
                  className="h-7 w-7 rounded-md border border-border bg-accent text-primary hover:bg-primary/10 flex items-center justify-center disabled:opacity-40"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRowDownloadPdf(row)}
                  disabled={busy}
                  title="Download PDF"
                  className="h-7 w-7 rounded-md border border-border bg-accent text-primary hover:bg-primary/10 flex items-center justify-center disabled:opacity-40"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          },
        },
      ]
    : meta.columns;

  const visible = sortRows(filterRows(data, search), sortKey, sortDir);

  return (
    <div>
      {reportPicker ? (
        <div className="px-6 pt-4">{reportPicker}</div>
      ) : (
        <div className="px-6 pt-4 flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">{meta.title}</h1>
        </div>
      )}
      <PageHeader
        search={search}
        onSearchChange={setSearch}
        showDateNav
        showExport={!!meta.exportFormat}
        fromDate={fromDate}
        toDate={toDate}
        onDateChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
        onExport={meta.exportFormat ? handleExport : undefined}
        onExportPdf={handleExportPdf}
        onRefresh={fetchData}
        refreshing={loading}
      />
      {loading && <div className="px-6 pb-6 text-sm text-muted-foreground">Loading report…</div>}
      {error && <div className="px-6 pb-6 text-sm text-red-500">{error}</div>}
      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground">No data for the selected filters.</div>
          ) : (
            <DataTable
              columns={columns}
              data={visible}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
            />
          )}
          {meta.paginated && totalPages > 1 && (
            <div className="px-6 py-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 rounded border border-border bg-accent hover:text-foreground disabled:opacity-40 flex items-center justify-center"
                title="Previous page"
              >‹</button>
              <span>Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 w-7 rounded border border-border bg-accent hover:text-foreground disabled:opacity-40 flex items-center justify-center"
                title="Next page"
              >›</button>
            </div>
          )}
          {exporting && <div className="px-6 pb-6 text-xs text-muted-foreground">Preparing export…</div>}
        </>
      )}
    </div>
  );
}
