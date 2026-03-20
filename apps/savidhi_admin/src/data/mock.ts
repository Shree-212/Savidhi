import type {
  DashboardStats,
  PujaEvent,
  PujaBooking,
  ChadhavaEvent,
  ChadhavaBooking,
  Appointment,
  PujaCrud,
  ChadhavaCrud,
  TempleCrud,
  Deity,
  PujariAdmin,
  PujariLedgerEntry,
  AstrologerAdmin,
  AstrologerLedgerEntry,
  DevoteeAdmin,
  Hamper,
  AdminUser,
  PujaSankalpReport,
  ChadhavaSankalpReport,
  ChadhavaOfferingsReport,
  AppointmentsReport,
  LedgerReport,
  AllBookingsReport,
  SummaryReport,
  TempleWiseReport,
  DeityWiseReport,
  DevoteeWiseReport,
  TimelineEvent,
} from '@/types';

/* ── Dashboard ───────────────────────────────────────── */
export const MOCK_DASHBOARD: DashboardStats = {
  pujasBooked: 55,
  chadhavasBooked: 100,
  appointmentsBooked: 100,
  pujaRevenue: 18000,
  chadhavaRevenue: 8000,
  appointmentsRevenue: 6000,
  topServices: [
    { name: 'Devi Pooja - Kamakhya', count: 122 },
    { name: 'Bhuta Sudhi - Kashi', count: 92 },
    { name: 'Shani Grah Shanti', count: 82 },
    { name: '1008 Shiv Nam Jap', count: 40 },
    { name: 'Rudra Abhishek, Kashi', count: 35 },
  ],
};

/* ── Puja Events ─────────────────────────────────────── */
export const MOCK_PUJA_EVENTS: PujaEvent[] = [
  { id: 'DAWE112', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath', bookings: '4/100', devoteeCount: 2, startTime: '27 Jan, 2:00 PM', status: 'NOT_STARTED', pujari: 'Ram Dash', stage: 'YET_TO_START' },
  { id: 'FB54FF4', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath S2', bookings: '99/100', devoteeCount: 52, startTime: '27 Jan, 2:00 PM', status: 'INPROGRESS', pujari: 'Ram Dash', stage: 'LIVE_ADDED' },
  { id: 'FB54FF5', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath S2', bookings: '90/100', devoteeCount: 52, startTime: '27 Jan, 2:00 PM', status: 'COMPLETED', pujari: 'Ram Dash', stage: 'SHIPPED' },
  { id: 'DAWE113', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath', bookings: '22/100', devoteeCount: 2, startTime: '27 Jan, 2:00 PM', status: 'NOT_STARTED', pujari: 'Ram Dash', stage: 'YET_TO_START' },
];

/* ── Puja Bookings (individual) ──────────────────────── */
export const MOCK_PUJA_BOOKINGS: PujaBooking[] = [
  {
    id: 'DAWE112', bookedBy: 'Bishnu Kumar', devoteeCount: 2, bookingTime: '27 Jan, 2:00 PM',
    cost: 2000, status: 'NOT_STARTED', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath',
    bookedAt: '27 Jan, 2:00 PM',
    devotees: [
      { name: 'Rama Prasad', relation: 'Booked By', gotra: 'Kashyap' },
      { name: 'Shyam Prasad', relation: 'Father', gotra: 'Kashyap' },
    ],
    sankalp: 'I wish for a better kahefkhkb e fhegyfhe e eqfqjf e fyuefqjf fqevfqje',
    prasadDeliveryAddress: 'NB 1554, Paradip, 754321',
    pujari: 'Gopal Dash',
  },
  {
    id: 'DAWE113', bookedBy: 'Bishnu Kumar', devoteeCount: 2, bookingTime: '27 Jan, 2:00 PM',
    cost: 2000, status: 'INPROGRESS', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath',
    bookedAt: '27 Jan, 2:00 PM',
    devotees: [
      { name: 'Rama Prasad', relation: 'Booked By', gotra: 'Kashyap' },
      { name: 'Shyam Prasad', relation: 'Father', gotra: 'Kashyap' },
    ],
    sankalp: 'I wish for a better kahefkhkb e fhegyfhe e eqfqjf e fyuefqjf fqevfqje',
    prasadDeliveryAddress: 'NB 1554, Paradip, 754321',
    pujari: 'Gopal Dash',
  },
  {
    id: 'DAWE114', bookedBy: 'Bishnu Kumar', devoteeCount: 2, bookingTime: '27 Jan, 2:00 PM',
    cost: 2000, status: 'COMPLETED', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath',
    bookedAt: '27 Jan, 2:00 PM',
    devotees: [
      { name: 'Rama Prasad', relation: 'Booked By', gotra: 'Kashyap' },
      { name: 'Shyam Prasad', relation: 'Father', gotra: 'Kashyap' },
    ],
    sankalp: 'I wish for a better kahefkhkb e fhegyfhe e eqfqjf e fyuefqjf fqevfqje',
    prasadDeliveryAddress: 'NB 1554, Paradip, 754321',
    pujari: 'Gopal Dash',
    sankalpVideoTimeStamp: '12 Min 30 Sec',
  },
];

/* ── Chadhava Events ─────────────────────────────────── */
export const MOCK_CHADHAVA_EVENTS: ChadhavaEvent[] = [
  { id: 'DAWE112', chadhavaName: 'Bhairav Dana Seva', temple: 'Kashi Vishwanath', bookings: '4/100', startTime: '27 Jan, 2:00 PM', status: 'NOT_STARTED', pujari: 'Ram Dash' },
  { id: 'FB54FF4', chadhavaName: 'Bhairav Dana Seva', temple: 'Kashi Vishwanath', bookings: '99/100', startTime: '27 Jan, 2:00 PM', status: 'INPROGRESS', pujari: 'Ram Dash' },
  { id: 'FB54FF5', chadhavaName: 'Bhairav Dana Seva', temple: 'Kashi Vishwanath', bookings: '90/100', startTime: '27 Jan, 2:00 PM', status: 'COMPLETED', pujari: 'Ram Dash' },
  { id: 'DAWE113', chadhavaName: 'Bhairav Dana Seva', temple: 'Kashi Vishwanath', bookings: '22/100', startTime: '27 Jan, 2:00 PM', status: 'NOT_STARTED', pujari: 'Ram Dash' },
];

/* ── Chadhava Bookings ───────────────────────────────── */
export const MOCK_CHADHAVA_BOOKINGS: ChadhavaBooking[] = [
  {
    id: 'DAWE112', bookedBy: 'Bishnu Kumar', devoteeCount: 1, bookingTime: '27 Jan, 2:00 PM',
    offerings: '1x Laddu, 2x 500gm Ghee, 1x Lotus', cost: 2000, status: 'NOT_STARTED',
    chadhavaName: 'Bhairav Dana Seva -Kashi', temple: 'Kashi Vishwanath',
    bookedAt: '27 Jan, 2:00 PM',
    devotees: [
      { name: 'Rama Prasad', gotra: 'Kashyap', offerings: '1x Laddu, 2x 500gm ghee, 1x Lotus' },
      { name: 'Shyam Prasad', gotra: 'Kashyap', offerings: '1x Laddu, 2x 500gm ghee, 1x lotus' },
    ],
    totalOfferings: [
      { name: 'Laddu', quantity: 122 },
      { name: '250ml Milk Abhisekh', quantity: 32 },
      { name: 'Lotus', quantity: 12 },
      { name: '500gm Ghee', quantity: 98 },
    ],
    sankalp: 'I wish for a better kahefkhkb e fhegyfhe e eqfqjf e fyuefqjf fqevfqje',
    prasadDeliveryAddress: 'NB 1554, Paradip, 754321',
    pujari: 'Gopal Dash',
  },
];

/* ── Appointments ────────────────────────────────────── */
export const MOCK_APPOINTMENTS: Appointment[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  astrologerName: 'Jaswant Mishra',
  dateTime: '27 Jan, 2:00 PM - 22:30 PM',
  cost: 2000,
  status: (i === 0 || i === 3 ? 'LINK_YET_TO_BE_GENERATED' : i === 1 ? 'INPROGRESS' : 'COMPLETED') as Appointment['status'],
  meetLink: i === 1 ? 'https://meet.com/6b35tty' : undefined,
  devotee: { name: 'Rama Prasad', relation: 'Booked By', gotra: 'Kashyap' },
}));

/* ── Puja CRUD ───────────────────────────────────────── */
export const MOCK_PUJAS_CRUD: PujaCrud[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  pujaName: 'Bhuta Sudhi Kashi',
  temple: 'Kashi Vishwanath',
  day: i % 3 === 0 ? 'Sun, Sat' : 'Everyday',
  time: '2:00 PM - 2:30 PM',
  maxBookings: 200,
  bookingMode: (['ONE_TIME', 'SUBSCRIPTION', 'BOTH'] as const)[i % 3],
  isActive: true,
}));

/* ── Chadhava CRUD ───────────────────────────────────── */
export const MOCK_CHADHAVAS_CRUD: ChadhavaCrud[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  chadhavaName: 'Bhuta Sudhi Kashi',
  temple: 'Kashi Vishwanath',
  day: i % 3 === 0 ? 'Sun, Sat' : 'Everyday',
  time: '2:00 PM - 2:30 PM',
  maxBookings: 200,
  bookingMode: (['ONE_TIME', 'SUBSCRIPTION', 'BOTH'] as const)[i % 3],
  isActive: true,
}));

/* ── Temples CRUD ────────────────────────────────────── */
export const MOCK_TEMPLES_CRUD: TempleCrud[] = Array.from({ length: 14 }, () => ({
  id: 'DAWE112',
  templeName: 'Kashi Vishwanath',
  address: 'Ganga Ghat, Kashi, UP, 765575',
  pujaris: 5,
  pujas: 10,
}));

/* ── Deities ─────────────────────────────────────────── */
export const MOCK_DEITIES: Deity[] = [
  { id: 'DAWE112', name: 'Shree Rama' },
  { id: 'DAWE113', name: 'Hanuman' },
  { id: 'DAWE114', name: 'Shiva' },
  ...Array.from({ length: 12 }, (_, i) => ({ id: `DAWE${115 + i}`, name: 'Hanuman' })),
];

/* ── Pujaris ─────────────────────────────────────────── */
export const MOCK_PUJARIS: PujariAdmin[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  name: 'Sanjay Dixit',
  temple: 'Kashi Visanath, UP',
  pujaInQueue: i % 4 === 0 ? 6 : i % 3 === 0 ? 0 : 3,
  isActive: true,
  rating: 2,
  unsettled: 30000,
}));

/* ── Pujari Ledger ────────────────────────────────────── */
export const MOCK_PUJARI_LEDGER: PujariLedgerEntry[] = Array.from({ length: 8 }, (_, i) => ({
  id: `DAWE11${i}`,
  eventName: i % 2 === 0 ? 'Vharav Sadhana-Vishnanath' : 'Chandi Dana Seva',
  type: (i % 2 === 0 ? 'PUJA' : 'CHADHAVA') as PujariLedgerEntry['type'],
  dateTime: '26 Jan, 12:20 PM',
  temple: 'Kashi Visanath, UP',
  fee: 2000,
  settled: i % 3 !== 0,
}));

/* ── Astrologers ─────────────────────────────────────── */
export const MOCK_ASTROLOGERS: AstrologerAdmin[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  name: 'Sanjay Dixit',
  designation: i % 2 === 0 ? 'Tarot Card Reader' : 'Vedic Astrologer',
  appointmentsInQueue: i % 4 === 0 ? 6 : 3,
  isActive: true,
  rating: 2,
  unsettled: 30000,
}));

/* ── Astrologer Ledger ────────────────────────────────── */
export const MOCK_ASTROLOGER_LEDGER: AstrologerLedgerEntry[] = Array.from({ length: 8 }, (_, i) => ({
  id: `DAWE11${i}`,
  customerName: 'Shyam Kumar Dash',
  duration: i % 3 === 0 ? '30 MIN' : i % 2 === 0 ? '1 HR' : '15 MIN',
  dateTime: '26 Jan, 12:20 PM',
  fee: 2000,
  settled: i % 3 !== 0,
}));

/* ── Devotees ────────────────────────────────────────── */
export const MOCK_DEVOTEES: DevoteeAdmin[] = Array.from({ length: 14 }, (_, i) => ({
  id: `676UGG${i}`,
  name: i % 2 === 0 ? 'Ram Dash' : 'Shyam Dash',
  phone: i % 2 === 0 ? '6555877756' : '6556678889',
  gotra: 'Kashyap',
  level: 5,
  joinedSince: '13 Jan 2024',
  bookings: [
    { title: 'Bhoota Shanti Puja -Kashi', details: 'Booked on : 20 Jan 2025\nPuja on : 23 Jan 2025, Wed', status: 'Prasad Shipped' },
    { title: 'Appointment with Ravi Das', details: 'Date : 25 Jan 2025, 3:30 PM', status: 'Meet Not Started' },
  ],
}));

/* ── Hampers ─────────────────────────────────────────── */
export const MOCK_HAMPERS: Hamper[] = [
  { id: '655GR6535', name: 'Basic Puja Hamper', contentDescription: '1 Photo of Deity, 1 Packet of Sindoor, Lai Prasad, Sankalp Thread', stockQty: 200 },
  { id: '655GR6536', name: 'Premium Puja Hamper', contentDescription: '1 Photo of Deity, 1 Packet of Sindoor, Lai Prasad, Sankalp Thread', stockQty: 200 },
  { id: '655GR6537', name: 'Basic Chadhava Hamper', contentDescription: '1 Photo of Deity, 1 Packet of Sindoor, Lai Prasad, Sankalp Thread', stockQty: 200 },
  { id: '655GR6538', name: 'Premium Chadhava Hamper', contentDescription: '1 Photo of Deity, 1 Packet of Sindoor, Lai Prasad, Sankalp Thread', stockQty: 200 },
];

/* ── Settings - Admin Users ──────────────────────────── */
export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: '1', email: 'jayram@savidhi.in', name: 'Jayram', role: 'ADMIN', createdAt: '27 Jan 2024, 2:00 PM', updatedAt: '27 Jan 2025, 2:00 PM' },
  { id: '2', email: 'yyyyzzzz@savidhi.in', name: 'Test', role: 'BOOKING_MANAGER', createdAt: '27 Jan 2024, 2:00 PM', updatedAt: '27 Jan 2025, 2:00 PM' },
  { id: '3', email: 'test123@savidhi.in', name: 'Test', role: 'BOOKING_MANAGER', createdAt: '27 Jan 2024, 2:00 PM', updatedAt: '27 Jan 2025, 2:00 PM' },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `${4 + i}`,
    email: `yyyyzzzz${i}@savidhi.in`,
    name: 'Test',
    role: (i % 2 === 0 ? 'VIEW_ONLY' : 'BOOKING_MANAGER') as AdminUser['role'],
    createdAt: '27 Jan 2024, 2:00 PM',
    updatedAt: '27 Jan 2025, 2:00 PM',
  })),
];

/* ── Reports ─────────────────────────────────────────── */
export const MOCK_PUJA_SANKALP_REPORT: PujaSankalpReport[] = [
  { id: 'DAWE112', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath', devotee: 102, startTime: '27 Jan, 2:00 PM', received: 20000, status: 'NOT_STARTED', pujari: 'Ram Dash' },
  { id: 'FB54FF4', pujaName: 'Devi Puja-Adishakti', temple: 'Devi Peetha', devotee: 99, startTime: '27 Jan, 2:00 PM', received: 18000, status: 'INPROGRESS', pujari: 'Ram Dash' },
  { id: 'FB54FF5', pujaName: 'Devi Puja-Adishakti', temple: 'Devi Peetha', devotee: 99, startTime: '27 Jan, 2:00 PM', received: 18000, status: 'COMPLETED', pujari: 'Ram Dash' },
  { id: 'DAWE113', pujaName: 'Bhuta Sudhi Kashi', temple: 'Kashi Vishwanath', devotee: 102, startTime: '27 Jan, 2:00 PM', received: 20000, status: 'NOT_STARTED', pujari: 'Shyam Mishra' },
];

export const MOCK_CHADHAVA_SANKALP_REPORT: ChadhavaSankalpReport[] = [
  { id: 'DAWE112', chadhavaName: 'Bharav Dana Seva', temple: 'Kashi Vishwanath', devotee: 102, startTime: '27 Jan, 2:00 PM', received: 20000, status: 'NOT_STARTED', pujari: 'Ram Dash' },
  { id: 'FB54FF4', chadhavaName: 'Bharav Dana Seva', temple: 'Devi Peetha', devotee: 99, startTime: '27 Jan, 2:00 PM', received: 18000, status: 'INPROGRESS', pujari: 'Ram Dash' },
  { id: 'FB54FF5', chadhavaName: 'Bharav Dana Seva', temple: 'Devi Peetha', devotee: 99, startTime: '27 Jan, 2:00 PM', received: 18000, status: 'COMPLETED', pujari: 'Ram Dash' },
];

export const MOCK_CHADHAVA_OFFERINGS_REPORT: ChadhavaOfferingsReport[] = Array.from({ length: 6 }, () => ({
  id: 'DAWE112',
  chadhavaName: 'Bharav Dana Seva',
  temple: 'Kashi Vishwanath',
  startTime: '27 Jan, 2:00 PM',
  offeringsAndQuantity: 'Laddu Packet --- 20x\nTulsi Mala --- 107x\n1008 Nama Japa --- 20x\n500ml Ghee --- 25x\n250ml Milk Abhisekh --- 75x',
}));

export const MOCK_APPOINTMENTS_REPORT: AppointmentsReport[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  astrologerName: i % 2 === 0 ? 'Hrishikesh Mishra' : 'Ramakanta Nayak',
  bookings: i % 2 === 0 ? 10 : 6,
  meetLinkAvailable: i % 2 === 0 ? '8/10' : '6/6',
  received: i % 2 === 0 ? 20000 : 20000,
}));

export const MOCK_LEDGER_REPORT: LedgerReport[] = Array.from({ length: 14 }, (_, i) => ({
  id: `DAWE11${i}`,
  partyName: i % 2 === 0 ? 'Hrishikesh Mishra' : 'Ramakanta Nayak',
  role: (i % 2 === 0 ? 'PUJARI' : 'ASTROLOGER') as LedgerReport['role'],
  puja: i % 2 === 0 ? 12 : 0,
  chadhava: 22,
  appointment: i % 2 === 0 ? 0 : 25,
  totalFee: 80000,
  paid: i % 2 === 0 ? 60000 : 60000,
  pending: i % 2 === 0 ? 12000 : 0,
  status: (i % 2 === 0 ? 'UNSETTLED' : 'SETTLED') as LedgerReport['status'],
}));

export const MOCK_ALL_BOOKINGS_REPORT: AllBookingsReport[] = [
  { id: 'DAWE112', devoteeName: 'Hrishikesh Mishra', type: 'PUJA', service: 'Vairav Sadhana Puja - Kashi', dateTime: '27 Jan, 2:00 PM', cost: 802, status: 'NOT STARTED' },
  { id: 'DAWE113', devoteeName: 'Ramakanta Nayak', type: 'CHADHAVA', service: 'Punya Dana Seva-Devi Peetm', dateTime: '27 Jan, 2:00 PM', cost: 201, status: 'INPROGRESS' },
  { id: 'DAWE114', devoteeName: 'Ramakanta Nayak', type: 'APPOINTMENT', service: '30 Min with Shyam Dash', dateTime: '27 Jan, 2:00 PM', cost: 501, status: 'COMPLETE' },
  { id: 'DAWE115', devoteeName: 'Ramakanta Nayak', type: 'CHADHAVA', service: 'Punya Dana Seva-Devi Peetm', dateTime: '27 Jan, 2:00 PM', cost: 201, status: 'NOT STARTED' },
];

export const MOCK_SUMMARY_REPORT: SummaryReport[] = [
  { variable: 'Pujas', totalNumber: 100, totalCost: 80000, totalFee: 50000, netProfit: 30000 },
  { variable: 'Chadhavas', totalNumber: 200, totalCost: 20000, totalFee: 10000, netProfit: 10000 },
  { variable: 'Appointments', totalNumber: 70, totalCost: 20000, totalFee: 10000, netProfit: 10000 },
  { variable: 'Total', totalNumber: 370, totalCost: 120000, totalFee: 70000, netProfit: 50000 },
];

export const MOCK_TEMPLE_WISE_REPORT: TempleWiseReport[] = [
  { temple: 'Kashi Vishwanath Temple, Kashi, UP', pujaBookings: 100, pujaCost: 80000, chadhavasBookings: 400, chadhavaCost: 10000 },
  { temple: 'Kashi Vishwanath Temple, Kashi, UP', pujaBookings: 100, pujaCost: 80000, chadhavasBookings: 400, chadhavaCost: 10000 },
  { temple: 'Devi Temple, Vindyavashini, JK', pujaBookings: 70, pujaCost: 70000, chadhavasBookings: 300, chadhavaCost: 20000 },
  { temple: 'Devi Temple, Vindyavashini, JK', pujaBookings: 70, pujaCost: 70000, chadhavasBookings: 300, chadhavaCost: 20000 },
];

export const MOCK_DEITY_WISE_REPORT: DeityWiseReport[] = [
  { deity: 'Vishnu', pujaBookings: 100, pujaCost: 80000, chadhavasBookings: 400, chadhavaCost: 10000 },
  { deity: 'Hanuman', pujaBookings: 100, pujaCost: 80000, chadhavasBookings: 400, chadhavaCost: 10000 },
  { deity: 'Shiva', pujaBookings: 70, pujaCost: 70000, chadhavasBookings: 300, chadhavaCost: 20000 },
  { deity: 'Laxmi', pujaBookings: 70, pujaCost: 70000, chadhavasBookings: 300, chadhavaCost: 20000 },
  { deity: 'Shani', pujaBookings: 100, pujaCost: 80000, chadhavasBookings: 400, chadhavaCost: 10000 },
  { deity: 'Radha Krishna', pujaBookings: 70, pujaCost: 70000, chadhavasBookings: 300, chadhavaCost: 20000 },
  { deity: 'Narshimha', pujaBookings: 70, pujaCost: 70000, chadhavasBookings: 300, chadhavaCost: 20000 },
];

export const MOCK_DEVOTEE_WISE_REPORT: DevoteeWiseReport[] = Array.from({ length: 14 }, (_, i) => ({
  id: `676UGG${i}`,
  name: i % 2 === 0 ? 'Ram Dash' : 'Shyam Dash',
  phone: i % 2 === 0 ? '6555877756' : '6555877756',
  pujas: 100,
  chadhavas: 100,
  appointments: 100,
  totalBookings: 300,
  totalCost: 10000,
}));

/* ── Timeline Events ─────────────────────────────────── */
export const MOCK_PUJA_TIMELINE: TimelineEvent[] = [
  { id: '1', title: 'Bhoota Shanti Puja -Kashi', subtitle: 'Devotee: 22/100', startHour: 9, durationHours: 2, day: 22, color: 'orange' },
  { id: '2', title: 'Devi Puja at Kal Vairavi, Nainital', subtitle: 'Devotee: 40/100', startHour: 11, durationHours: 3, day: 23, color: 'teal' },
  { id: '3', title: 'Bhoota Shanti Puja -Kashi', subtitle: 'Devotee: 12/100', startHour: 10, durationHours: 2, day: 24, color: 'green' },
  { id: '4', title: 'Bhoota Shanti Puja -Kashi', subtitle: 'Devotee: 94/100', startHour: 13, durationHours: 2.5, day: 25, color: 'orange' },
  { id: '5', title: 'Bhoota Shanti Puja -Kashi', subtitle: 'Devotee: 94/100', startHour: 12, durationHours: 2, day: 26, color: 'blue' },
  { id: '6', title: 'Devi Puja at Kal Vairavi, Nainital', subtitle: 'Devotee: 40/100', startHour: 14, durationHours: 3, day: 26, color: 'teal' },
  { id: '7', title: 'Bhoota Shanti Puja -Kashi', subtitle: 'Devotee: 80/100', startHour: 16, durationHours: 2, day: 27, color: 'red' },
];

export const MOCK_CHADHAVA_TIMELINE: TimelineEvent[] = [
  { id: '1', title: 'Bhairav Dana Seva -Kashi', subtitle: 'Bookings: 22/100', startHour: 9, durationHours: 2, day: 22, color: 'orange' },
  { id: '2', title: 'Chandi Maha Dans Seva, Nainital', subtitle: 'Bookings: 40/100', startHour: 11, durationHours: 3, day: 23, color: 'teal' },
  { id: '3', title: 'Bhairav Dana Seva -Kashi', subtitle: 'Bookings: 12/100', startHour: 10, durationHours: 2, day: 24, color: 'green' },
  { id: '4', title: 'Bhairav Dana Seva -Kashi', subtitle: 'Bookings: 94/100', startHour: 13, durationHours: 2.5, day: 25, color: 'orange' },
  { id: '5', title: 'Bhairav Dana Seva -Kashi', subtitle: 'Bookings: 94/100', startHour: 12, durationHours: 2, day: 26, color: 'blue' },
  { id: '6', title: 'Chandi Maha Dans Seva, Nainital', subtitle: 'Bookings: 40/100', startHour: 14, durationHours: 3, day: 26, color: 'teal' },
  { id: '7', title: 'Bhairav Dana Seva -Kashi', subtitle: 'Bookings: 80/100', startHour: 16, durationHours: 2, day: 27, color: 'red' },
];

export const MOCK_APPOINTMENT_TIMELINE: TimelineEvent[] = [
  { id: '1', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Debjani Seth', startHour: 9, durationHours: 1.5, day: 22, color: 'orange' },
  { id: '2', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Ram Dash', startHour: 11, durationHours: 1.5, day: 23, color: 'teal' },
  { id: '3', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Debjani Seth', startHour: 10, durationHours: 1.5, day: 24, color: 'green' },
  { id: '4', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Debjani Seth', startHour: 13, durationHours: 2, day: 25, color: 'orange' },
  { id: '5', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Debjani Seth', startHour: 12, durationHours: 2, day: 26, color: 'blue' },
  { id: '6', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Ram Dash', startHour: 14, durationHours: 2.5, day: 26, color: 'teal' },
  { id: '7', title: 'Astro Jaswant Mishra', subtitle: 'Devotee: Debjani Seth', startHour: 16, durationHours: 2, day: 27, color: 'red' },
];
