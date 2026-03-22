/* ── API Response ─────────────────────────────────────── */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/* ── Admin User ──────────────────────────────────────── */
export type AdminRole = 'ADMIN' | 'BOOKING_MANAGER' | 'VIEW_ONLY';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

/* ── Puja Booking Status ─────────────────────────────── */
export type PujaEventStatus =
  | 'NOT_STARTED'
  | 'INPROGRESS'
  | 'COMPLETED';

export type PujaBookingStatus =
  | 'NOT_STARTED'
  | 'INPROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PujaEventStage =
  | 'YET_TO_START'
  | 'LIVE_ADDED'
  | 'SHORT_VIDEO_ADDED'
  | 'SANKALP_VIDEO_ADDED'
  | 'TO_BE_SHIPPED'
  | 'SHIPPED';

/* ── Puja Event (top-level puja booking row) ─────────── */
export interface PujaEvent {
  id: string;
  pujaName: string;
  temple: string;
  bookings: string;       // e.g. "4/100"
  devoteeCount: number;
  startTime: string;
  status: PujaEventStatus;
  pujari: string;
  stage: PujaEventStage;
}

/* ── Individual Puja Booking (nested under event) ────── */
export interface DevoteeDetail {
  name: string;
  relation?: string;      // e.g. "Booked By", "Father"
  gotra: string;
}

export interface PujaBooking {
  id: string;
  bookedBy: string;
  devoteeCount: number;
  bookingTime: string;
  cost: number;
  status: PujaBookingStatus;
  pujaName: string;
  temple: string;
  bookedAt: string;
  devotees: DevoteeDetail[];
  sankalp: string;
  prasadDeliveryAddress: string;
  pujari: string;
  sankalpVideoTimeStamp?: string;
}

/* ── Chadhava Booking Status ─────────────────────────── */
export type ChadhavaEventStatus = PujaEventStatus;
export type ChadhavaBookingStatus = PujaBookingStatus;

/* ── Chadhava Event ──────────────────────────────────── */
export interface ChadhavaEvent {
  id: string;
  chadhavaName: string;
  temple: string;
  bookings: string;
  startTime: string;
  status: ChadhavaEventStatus;
  pujari: string;
}

/* ── Chadhava Individual Booking ─────────────────────── */
export interface ChadhavaOfferingItem {
  name: string;
  quantity: number;
}

export interface ChadhavaDevoteeDetail {
  name: string;
  gotra: string;
  offerings: string;
}

export interface ChadhavaBooking {
  id: string;
  bookedBy: string;
  devoteeCount: number;
  bookingTime: string;
  offerings: string;
  cost: number;
  status: ChadhavaBookingStatus;
  chadhavaName: string;
  temple: string;
  bookedAt: string;
  devotees: ChadhavaDevoteeDetail[];
  totalOfferings: ChadhavaOfferingItem[];
  sankalp: string;
  prasadDeliveryAddress: string;
  pujari: string;
  sankalpVideoTimeStamp?: string;
}

/* ── Appointment ─────────────────────────────────────── */
export type AppointmentStatus =
  | 'LINK_YET_TO_BE_GENERATED'
  | 'INPROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Appointment {
  id: string;
  astrologerName: string;
  dateTime: string;
  cost: number;
  status: AppointmentStatus;
  meetLink?: string;
  devotee: {
    name: string;
    relation?: string;
    gotra: string;
  };
}

/* ── Puja CRUD ───────────────────────────────────────── */
export type BookingMode = 'ONE_TIME' | 'SUBSCRIPTION' | 'BOTH';

export interface PujaCrud {
  id: string;
  pujaName: string;
  temple: string;
  day: string;
  time: string;
  maxBookings: number;
  bookingMode: BookingMode;
  isActive: boolean;
  // Edit form fields
  templeId?: string;
  deityType?: string;
  maxDevoteePerEvent?: number;
  defaultPujari?: string;
  dateTime?: string;
  eventRepeats?: boolean;
  lunarPhase?: string;
  prices?: { for1: number; for2: number; for4: number; for6: number };
  sampleVideoUrl?: string;
  sliderImages?: string[];
  benefits?: string;
  ritualsIncluded?: string;
  sendHamper?: boolean;
  hamperId?: string;
}

/* ── Chadhava CRUD ───────────────────────────────────── */
export interface ChadhavaCrudOffering {
  itemName: string;
  benefit: string;
  price: number;
  images: string[];
}

export interface ChadhavaCrud {
  id: string;
  chadhavaName: string;
  temple: string;
  day: string;
  time: string;
  maxBookings: number;
  bookingMode: BookingMode;
  isActive: boolean;
  offerings?: ChadhavaCrudOffering[];
  sampleVideoUrl?: string;
  sliderImages?: string[];
  benefits?: string;
  ritualsIncluded?: string;
  sendHamper?: boolean;
  hamperId?: string;
}

/* ── Temple CRUD ─────────────────────────────────────── */
export interface TempleCrud {
  id: string;
  templeName: string;
  address: string;
  pujaris: number;
  pujas: number;
  googleMapLink?: string;
  aboutTemple?: string;
  historyAndSignificance?: string;
  sampleVideoUrl?: string;
  sliderImages?: string[];
}

/* ── Deity ────────────────────────────────────────────── */
export interface Deity {
  id: string;
  name: string;
  imageUrl?: string;
}

/* ── Pujari ───────────────────────────────────────────── */
export interface PujariAdmin {
  id: string;
  name: string;
  temple: string;
  pujaInQueue: number;
  isActive: boolean;
  designation?: string;
  startDate?: string;
  profilePic?: string;
  aadharNumber?: string;
  panNumber?: string;
  aadharPic?: string;
  panPic?: string;
  bankName?: string;
  ifsc?: string;
  accountNumber?: string;
  rating?: number;
  unsettled?: number;
}

/* ── Pujari Ledger ────────────────────────────────────── */
export interface PujariLedgerEntry {
  id: string;
  eventName: string;
  type: 'PUJA' | 'CHADHAVA';
  dateTime: string;
  temple: string;
  fee: number;
  settled: boolean;
}

/* ── Astrologer ──────────────────────────────────────── */
export interface AstrologerAdmin {
  id: string;
  name: string;
  designation: string;
  appointmentsInQueue: number;
  isActive: boolean;
  languages?: string[];
  expertise?: string;
  about?: string;
  profilePic?: string;
  sliderImages?: string[];
  aadharNumber?: string;
  panNumber?: string;
  aadharPic?: string;
  panPic?: string;
  prices?: { for15min: number; for30min: number; for1hour: number; for2hour: number };
  bankName?: string;
  ifsc?: string;
  accountNumber?: string;
  startDate?: string;
  rating?: number;
  unsettled?: number;
  offDays?: string[];
}

/* ── Astrologer Ledger ────────────────────────────────── */
export interface AstrologerLedgerEntry {
  id: string;
  customerName: string;
  duration: string;
  dateTime: string;
  fee: number;
  settled: boolean;
}

/* ── Devotee ─────────────────────────────────────────── */
export interface DevoteeAdmin {
  id: string;
  name: string;
  phone: string;
  gotra: string;
  level: number;
  joinedSince: string;
  bookings?: DevoteeBookingSummary[];
}

export interface DevoteeBookingSummary {
  title: string;
  details: string;
  status: string;
}

/* ── Hamper ───────────────────────────────────────────── */
export interface Hamper {
  id: string;
  name: string;
  contentDescription: string;
  stockQty: number;
}

/* ── Reports ─────────────────────────────────────────── */
export type ReportType =
  | 'PUJA_SANKALP'
  | 'CHADHAVA_SANKALP'
  | 'CHADHAVA_OFFERINGS'
  | 'APPOINTMENTS'
  | 'LEDGER'
  | 'ALL_BOOKINGS'
  | 'SUMMARY'
  | 'TEMPLE_WISE'
  | 'DEITY_WISE'
  | 'DEVOTEE_WISE';

export interface PujaSankalpReport {
  id: string;
  pujaName: string;
  temple: string;
  devotee: number;
  startTime: string;
  received: number;
  status: PujaEventStatus;
  pujari: string;
}

export interface ChadhavaSankalpReport {
  id: string;
  chadhavaName: string;
  temple: string;
  devotee: number;
  startTime: string;
  received: number;
  status: ChadhavaEventStatus;
  pujari: string;
}

export interface ChadhavaOfferingsReport {
  id: string;
  chadhavaName: string;
  temple: string;
  startTime: string;
  offeringsAndQuantity: string;
}

export interface AppointmentsReport {
  id: string;
  astrologerName: string;
  bookings: number;
  meetLinkAvailable: string;
  received: number;
}

export interface LedgerReport {
  id: string;
  partyName: string;
  role: 'PUJARI' | 'ASTROLOGER';
  puja: number;
  chadhava: number;
  appointment: number;
  totalFee: number;
  paid: number;
  pending: number;
  status: 'SETTLED' | 'UNSETTLED';
}

export interface AllBookingsReport {
  id: string;
  devoteeName: string;
  type: 'PUJA' | 'CHADHAVA' | 'APPOINTMENT';
  service: string;
  dateTime: string;
  cost: number;
  status: string;
}

export interface SummaryReport {
  variable: string;
  totalNumber: number;
  totalCost: number;
  totalFee: number;
  netProfit: number;
}

export interface TempleWiseReport {
  temple: string;
  pujaBookings: number;
  pujaCost: number;
  chadhavasBookings: number;
  chadhavaCost: number;
}

export interface DeityWiseReport {
  deity: string;
  pujaBookings: number;
  pujaCost: number;
  chadhavasBookings: number;
  chadhavaCost: number;
}

export interface DevoteeWiseReport {
  id: string;
  name: string;
  phone: string;
  pujas: number;
  chadhavas: number;
  appointments: number;
  totalBookings: number;
  totalCost: number;
}

/* ── Settings ────────────────────────────────────────── */
export interface DevoteeAppSettings {
  homePujaSlider: string[];
  whatsappSupportNumber: string;
  callSupportNumber: string;
}

/* ── Timeline Event (for calendar/timeline view) ─────── */
export interface TimelineEvent {
  id: string;
  title: string;
  subtitle: string;
  startHour: number;
  durationHours: number;
  day: number;
  color: 'orange' | 'teal' | 'green' | 'red' | 'blue';
  /** ISO date string for real date positioning */
  date?: string;
  status?: string;
  stage?: string;
}

/* ── Dashboard Stats ─────────────────────────────────── */
export interface DashboardStats {
  pujasBooked: number;
  chadhavasBooked: number;
  appointmentsBooked: number;
  pujaRevenue: number;
  chadhavaRevenue: number;
  appointmentsRevenue: number;
  topServices: { name: string; count: number }[];
}
