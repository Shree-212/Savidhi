'use client';

import { useState } from 'react';
import {
  MOCK_PUJA_SANKALP_REPORT, MOCK_CHADHAVA_SANKALP_REPORT, MOCK_CHADHAVA_OFFERINGS_REPORT,
  MOCK_APPOINTMENTS_REPORT, MOCK_LEDGER_REPORT, MOCK_ALL_BOOKINGS_REPORT,
  MOCK_SUMMARY_REPORT, MOCK_TEMPLE_WISE_REPORT, MOCK_DEITY_WISE_REPORT, MOCK_DEVOTEE_WISE_REPORT,
} from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DownloadButton } from '@/components/shared/ActionButtons';
import type {
  PujaSankalpReport, ChadhavaSankalpReport, AppointmentsReport,
  LedgerReport, AllBookingsReport, SummaryReport, TempleWiseReport, DeityWiseReport, DevoteeWiseReport,
  ChadhavaOfferingsReport,
} from '@/types';

const REPORT_TYPES = [
  'Puja Sankalp Report', 'Chadhava Sankalp Report', 'Chadhava Offerings Report',
  'Appointments Report', 'Ledger', 'All Bookings Report',
  'Summary Report', 'Temple Wise Bookings Report', 'Deity Wise Bookings Report', 'Devotee Wise Bookings Report',
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [search, setSearch] = useState('');

  const renderReport = () => {
    switch (reportType) {
      case 'Puja Sankalp Report':
        return <DataTable columns={[
          { key: 'id', label: 'ID' },
          { key: 'pujaName', label: 'Puja Name' },
          { key: 'temple', label: 'Temple' },
          { key: 'devotee', label: 'Devotee' },
          { key: 'startTime', label: 'Start Time' },
          { key: 'received', label: 'Received', render: (r: PujaSankalpReport) => <span className="text-primary">₹{r.received}</span> },
          { key: 'status', label: 'Status', render: (r: PujaSankalpReport) => <StatusBadge status={r.status} /> },
          { key: 'pujari', label: 'Pujari' },
          { key: 'action', label: '', render: () => <DownloadButton /> },
        ]} data={MOCK_PUJA_SANKALP_REPORT} />;

      case 'Chadhava Sankalp Report':
        return <DataTable columns={[
          { key: 'id', label: 'ID' },
          { key: 'chadhavaName', label: 'Chadhava Name' },
          { key: 'temple', label: 'Temple' },
          { key: 'devotee', label: 'Devotee' },
          { key: 'startTime', label: 'Start Time' },
          { key: 'received', label: 'Received', render: (r: ChadhavaSankalpReport) => <span className="text-primary">₹{r.received}</span> },
          { key: 'status', label: 'Status', render: (r: ChadhavaSankalpReport) => <StatusBadge status={r.status} /> },
          { key: 'pujari', label: 'Pujari' },
          { key: 'action', label: '', render: () => <DownloadButton /> },
        ]} data={MOCK_CHADHAVA_SANKALP_REPORT} />;

      case 'Chadhava Offerings Report':
        return <DataTable columns={[
          { key: 'id', label: 'ID' },
          { key: 'chadhavaName', label: 'Chadhava Name' },
          { key: 'temple', label: 'Temple' },
          { key: 'startTime', label: 'Start Time' },
          { key: 'offeringsAndQuantity', label: 'Offerings & Quantity', render: (r: ChadhavaOfferingsReport) => (
            <pre className="text-[10px] text-muted-foreground whitespace-pre-line">{r.offeringsAndQuantity}</pre>
          )},
        ]} data={MOCK_CHADHAVA_OFFERINGS_REPORT} />;

      case 'Appointments Report':
        return <DataTable columns={[
          { key: 'id', label: 'ID' },
          { key: 'astrologerName', label: 'Astrologer Name' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'meetLinkAvailable', label: 'Meet Link Available', render: (r: AppointmentsReport) => (
            <span className={r.meetLinkAvailable.startsWith('8') ? 'text-status-not-started' : 'text-status-completed'}>{r.meetLinkAvailable}</span>
          )},
          { key: 'received', label: 'Received', render: (r: AppointmentsReport) => <span className="text-primary">₹{r.received}</span> },
          { key: 'action', label: '', render: () => <DownloadButton /> },
        ]} data={MOCK_APPOINTMENTS_REPORT} />;

      case 'Ledger':
        return <DataTable columns={[
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
        ]} data={MOCK_LEDGER_REPORT} />;

      case 'All Bookings Report':
        return <DataTable columns={[
          { key: 'id', label: 'ID' },
          { key: 'devoteeName', label: 'Devotee Name' },
          { key: 'type', label: 'Type', render: (r: AllBookingsReport) => <StatusBadge status={r.type} /> },
          { key: 'service', label: 'Service' },
          { key: 'dateTime', label: 'Date & Time' },
          { key: 'cost', label: 'Cost', render: (r: AllBookingsReport) => <span className="text-primary">₹{r.cost}</span> },
          { key: 'status', label: 'Status', render: (r: AllBookingsReport) => <StatusBadge status={r.status} /> },
        ]} data={MOCK_ALL_BOOKINGS_REPORT} />;

      case 'Summary Report':
        return <DataTable columns={[
          { key: 'variable', label: 'Variable' },
          { key: 'totalNumber', label: 'Total Number' },
          { key: 'totalCost', label: 'Total Cost', render: (r: SummaryReport) => <span className="text-status-not-started">₹{r.totalCost}</span> },
          { key: 'totalFee', label: 'Total Fee', render: (r: SummaryReport) => <span className="text-primary">₹{r.totalFee}</span> },
          { key: 'netProfit', label: 'Net Profit', render: (r: SummaryReport) => <span className="text-status-completed">₹{r.netProfit}</span> },
        ]} data={MOCK_SUMMARY_REPORT} />;

      case 'Temple Wise Bookings Report':
        return <DataTable columns={[
          { key: 'temple', label: 'Temple' },
          { key: 'pujaBookings', label: 'Puja Bookings' },
          { key: 'pujaCost', label: 'Puja Cost', render: (r: TempleWiseReport) => <span className="text-primary">₹{r.pujaCost}</span> },
          { key: 'chadhavasBookings', label: 'Chadhavas Bookings' },
          { key: 'chadhavaCost', label: 'Chadhava Cost', render: (r: TempleWiseReport) => <span className="text-primary">₹{r.chadhavaCost}</span> },
        ]} data={MOCK_TEMPLE_WISE_REPORT} />;

      case 'Deity Wise Bookings Report':
        return <DataTable columns={[
          { key: 'deity', label: 'Deity' },
          { key: 'pujaBookings', label: 'Puja Bookings' },
          { key: 'pujaCost', label: 'Puja Cost', render: (r: DeityWiseReport) => <span className="text-primary">₹{r.pujaCost}</span> },
          { key: 'chadhavasBookings', label: 'Chadhavas Bookings' },
          { key: 'chadhavaCost', label: 'Chadhava Cost', render: (r: DeityWiseReport) => <span className="text-primary">₹{r.chadhavaCost}</span> },
        ]} data={MOCK_DEITY_WISE_REPORT} />;

      case 'Devotee Wise Bookings Report':
        return <DataTable columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'pujas', label: 'Pujas' },
          { key: 'chadhavas', label: 'Chadhavas' },
          { key: 'appointments', label: 'Appointments' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalCost', label: 'Total Cost', render: (r: DevoteeWiseReport) => <span className="text-primary">₹{r.totalCost}</span> },
        ]} data={MOCK_DEVOTEE_WISE_REPORT} />;

      default:
        return null;
    }
  };

  return (
    <div>
      <PageHeader
        dropdownLabel={reportType}
        dropdownOptions={REPORT_TYPES}
        onDropdownChange={setReportType}
        search={search}
        onSearchChange={setSearch}
        showFilters
        showDateNav
        showExport
      />
      {renderReport()}
    </div>
  );
}
