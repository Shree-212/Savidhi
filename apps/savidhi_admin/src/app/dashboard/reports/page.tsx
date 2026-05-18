'use client';

import { useState } from 'react';
import { ReportPage, type ReportKey } from './_ReportPage';

const REPORT_OPTIONS: { key: ReportKey; label: string }[] = [
  { key: 'summary',                    label: 'Summary Report' },
  { key: 'daily-revenue',              label: 'Daily Revenue' },
  { key: 'all-bookings',               label: 'All Bookings Report' },
  { key: 'payments',                   label: 'Payments Report' },
  { key: 'cancellations',              label: 'Cancellations & Refunds' },
  { key: 'puja-sankalp',               label: 'Puja Sankalp Report' },
  { key: 'chadhava-sankalp',           label: 'Chadhava Sankalp Report' },
  { key: 'chadhava-offerings',         label: 'Chadhava Offerings (by event)' },
  { key: 'chadhava-offerings-detail',  label: 'Chadhava Offerings Detail (by booking)' },
  { key: 'appointments',               label: 'Appointments Report' },
  { key: 'workload',                   label: 'Pujari & Astrologer Workload' },
  { key: 'temple-wise',                label: 'Temple Wise Bookings Report' },
  { key: 'deity-wise',                 label: 'Deity Wise Bookings Report' },
  { key: 'devotee-wise',               label: 'Devotee Wise Bookings Report' },
];

export default function ReportsPage() {
  const [reportKey, setReportKey] = useState<ReportKey>('puja-sankalp');

  return (
    <ReportPage
      key={reportKey}
      reportKey={reportKey}
      reportPicker={
        <select
          className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={reportKey}
          onChange={(e) => setReportKey(e.target.value as ReportKey)}
        >
          {REPORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      }
    />
  );
}
