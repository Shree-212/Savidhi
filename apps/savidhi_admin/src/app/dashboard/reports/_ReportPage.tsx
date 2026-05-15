'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';
import JSZip from 'jszip';
import { reportService, downloadBlob } from '@/lib/services';
import { buildPdf, downloadPdfBlob } from '@/lib/reportPdf';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type SortDir } from '@/components/shared/DataTable';
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
  if (key === 'puja-sankalp' || key === 'chadhava-sankalp') {
    return [
      { key: 'sl', label: 'SL' },
      { key: 'name', label: 'Devotee Name' },
      { key: 'gotra', label: 'Gotra' },
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

/**
 * Sort a list of plain rows by a key in ascending or descending order. Numbers
 * are compared numerically, parseable date strings by their timestamp, and
 * everything else as case-insensitive strings. Null/undefined values sink to
 * the end regardless of direction.
 */
function sortRows(rows: any[], key: string | null, dir: SortDir): any[] {
  if (!key) return rows;
  const out = [...rows];
  out.sort((a, b) => {
    const va = a?.[key];
    const vb = b?.[key];
    const aMissing = va === null || va === undefined || va === '';
    const bMissing = vb === null || vb === undefined || vb === '';
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;

    if (typeof va === 'number' && typeof vb === 'number') {
      return dir === 'asc' ? va - vb : vb - va;
    }
    // Try date comparison if both look like parseable dates.
    const da = Date.parse(String(va));
    const db = Date.parse(String(vb));
    if (!Number.isNaN(da) && !Number.isNaN(db) && /[-/:]/.test(String(va))) {
      return dir === 'asc' ? da - db : db - da;
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    if (sa < sb) return dir === 'asc' ? -1 : 1;
    if (sa > sb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return out;
}

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
        const blob = buildPdf(meta.title, visible, pdfCols);
        downloadPdfBlob(blob, `${meta.title}.pdf`);
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
        const blob = buildPdf(`${meta.title} — ${label}`, inner, innerCols);
        const arr = await blob.arrayBuffer();
        zip.file(`${sanitizeFilename(label)}.pdf`, arr);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadPdfBlob(zipBlob, `${meta.title}.zip`);
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
      const blob = buildPdf(`${meta.title} — ${label}`, inner, innerCols);
      downloadPdfBlob(blob, `${meta.title} - ${label}.pdf`);
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
          {exporting && <div className="px-6 pb-6 text-xs text-muted-foreground">Preparing export…</div>}
        </>
      )}
    </div>
  );
}
