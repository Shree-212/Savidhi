/* ── Puja ─────────────────────────────────────────────── */
export interface Puja {
  id: string;
  name: string;
  templeName: string;
  templeLocation: string;
  imageUrl: string;
  sliderImages?: string[];
  date: string;
  time: string;
  countdown: string;
  benefits: string[];
  ritualsIncluded: string[];
  howToDo: string[];
  videoThumbnail: string;
  parcelContents: string[];
  pricePerDevotee: number;
  isWeekly?: boolean;
  isMonthly?: boolean;
  templeId: string;
}

/* ── Chadhava ─────────────────────────────────────────── */
export interface ChadhavaOffering {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface Chadhava {
  id: string;
  name: string;
  templeName: string;
  templeLocation: string;
  imageUrl: string;
  sliderImages?: string[];
  date: string;
  time: string;
  countdown: string;
  benefits: string[];
  ritualsIncluded: string[];
  howToOffer: string[];
  videoThumbnail: string;
  parcelContents: string[];
  offerings: ChadhavaOffering[];
  templeId: string;
  isWeekly?: boolean;
  startingPrice: number;
}

/* ── Temple ────────────────────────────────────────────── */
export interface Pujari {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

export interface Temple {
  id: string;
  name: string;
  location: string;
  pincode: string;
  images: string[];
  pujaris: Pujari[];
  about: string;
  history: string;
  videoThumbnail: string;
  pujaCount: number;
  pujasOffered: string[];
  chadhavasOffered: string[];
}

/* ── Astrologer ───────────────────────────────────────── */
export interface Astrologer {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  pricePerMin: number;
  imageUrl: string;
  images: string[];
  appointmentsBooked: number;
  languages: string[];
  expertise: string[];
  about: string;
  isBookmarked?: boolean;
}

export type AppointmentDuration = '15min' | '30min' | '1hour' | '2hour';

export interface DurationOption {
  key: AppointmentDuration;
  label: string;
  price: number;
}

/* ── Bookings ─────────────────────────────────────────── */
export type PujaBookingStatus =
  | 'PRASAD_SHIPPED'
  | 'YET_TO_START'
  | 'CANCELLED'
  | 'ONGOING'
  | 'VIDEO_PROCESSING'
  | 'COMPLETE';

export interface PujaBooking {
  id: string;
  pujaName: string;
  templeName: string;
  bookedOn: string;
  pujaOn: string;
  status: PujaBookingStatus;
  isWeekly?: boolean;
  bookingId: string;
}

export type AppointmentBookingStatus =
  | 'YET_TO_START'
  | 'MEET_IN_PROGRESS'
  | 'COMPLETE'
  | 'CANCELLED';

export interface AppointmentBooking {
  id: string;
  astrologerName: string;
  astrologerImage: string;
  date: string;
  timeSlot: string;
  status: AppointmentBookingStatus;
  bookingId: string;
}

/* ── Puja Status Timeline ─────────────────────────────── */
export interface PujaStatusStep {
  label: string;
  subtitle?: string;
  details?: string[];
  completed: boolean;
  videoThumbnail?: string;
}

export interface PujaStatusDetail {
  bookingId: string;
  pujaName: string;
  templeName: string;
  pujaId: string;
  steps: PujaStatusStep[];
}

/* ── Appointment Status ───────────────────────────────── */
export interface AppointmentStatusStep {
  label: string;
  subtitle?: string;
  completed: boolean;
  actionLabel?: string;
}

export interface AppointmentStatusDetail {
  bookingId: string;
  astrologerName: string;
  astrologerImage: string;
  pujaId: string;
  steps: AppointmentStatusStep[];
}

/* ── Panchang ─────────────────────────────────────────── */
export interface PanchangTime {
  name: string;
  time: string;
}

export interface PanchangData {
  date: string;
  day: string;
  tithi: string;
  location: string;
  moonPhase: string;
  festivals: string[];
  auspiciousTimes: PanchangTime[];
  inauspiciousTimes: PanchangTime[];
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  karna: PanchangTime[];
  yoga: PanchangTime[];
}

export interface CalendarEvent {
  date: string;
  title: string;
  tithi: string;
  timings: string;
  details: string[];
  pujaImageUrl?: string;
  pujaName?: string;
  pujaTemple?: string;
}

/* ── User / Points ────────────────────────────────────── */
export interface Achievement {
  id: string;
  name: string;
  imageUrl: string;
  unlocked: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  imageUrl: string;
  level: number;
  gems: number;
  pujaBooked: number;
  appointments: number;
  pujaForOthers: number;
  devoteeSince: string;
  achievements: Achievement[];
}

/* ── Devotee (booking form) ───────────────────────────── */
export interface DevoteeInfo {
  name: string;
  gotra: string;
}

export interface DeliveryAddress {
  houseNo: string;
  pincode: string;
  address: string;
}
