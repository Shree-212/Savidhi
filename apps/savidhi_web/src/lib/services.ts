import api from './api';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authService = {
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/otp/verify', { phone, otp }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// ─── User Profile ────────────────────────────────────────────────────────────
export const userService = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { name?: string; gotra?: string; image_url?: string }) =>
    api.patch('/users/me', data),
  getGems: (params?: { page?: number }) => api.get('/users/me/gems', { params }),
  getAchievements: () => api.get('/users/me/achievements'),
  getBookingSummary: () => api.get('/users/me/bookings'),
};

// ─── Catalog (public) ────────────────────────────────────────────────────────
export const templeService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/catalog/temples', { params }),
  getById: (id: string) => api.get(`/catalog/temples/${id}`),
};

export const pujaService = {
  list: (params?: { page?: number; limit?: number; temple_id?: string; search?: string }) =>
    api.get('/catalog/pujas', { params }),
  getById: (id: string) => api.get(`/catalog/pujas/${id}`),
};

export const chadhavaService = {
  list: (params?: { page?: number; limit?: number; temple_id?: string }) =>
    api.get('/catalog/chadhavas', { params }),
  getById: (id: string) => api.get(`/catalog/chadhavas/${id}`),
};

export const astrologerService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/catalog/astrologers', { params }),
  getById: (id: string) => api.get(`/catalog/astrologers/${id}`),
};

export const deityService = {
  list: () => api.get('/catalog/deities'),
};

// ─── Events (upcoming instances of a puja / chadhava) ────────────────────────
export const pujaEventService = {
  list: (params?: { puja_id?: string; upcoming?: boolean; limit?: number }) =>
    api.get('/bookings/puja-events', { params }),
  getById: (id: string) => api.get(`/bookings/puja-events/${id}`),
};

export const chadhavaEventService = {
  list: (params?: { chadhava_id?: string; upcoming?: boolean; limit?: number }) =>
    api.get('/bookings/chadhava-events', { params }),
  getById: (id: string) => api.get(`/bookings/chadhava-events/${id}`),
};

// ─── Bookings ────────────────────────────────────────────────────────────────
export const pujaBookingService = {
  list: (params?: { page?: number; status?: string }) =>
    api.get('/bookings/puja-bookings', { params }),
  getById: (id: string) => api.get(`/bookings/puja-bookings/${id}`),
  create: (data: {
    puja_event_id: string;
    devotee_count: number;
    sankalp?: string;
    prasad_delivery_address?: string;
    devotees: Array<{ name: string; relation?: string; gotra: string }>;
    // Subscription Phase A — backend validates against puja.booking_mode
    // and persists subscription_count / subscription_remaining.
    booking_type?: 'ONE_TIME' | 'SUBSCRIPTION';
    subscription_count?: number;
    idempotency_key?: string;
  }) => api.post('/bookings/puja-bookings', data),
  cancel: (id: string) => api.patch(`/bookings/puja-bookings/${id}/cancel`),
  // Stop a SUBSCRIPTION booking from re-occurring on future events without
  // cancelling the already-booked one. Phase C extends to cancel Razorpay mandate.
  cancelRepeat: (id: string) => api.patch(`/bookings/puja-bookings/${id}/cancel-repeat`),
};

export const chadhavaBookingService = {
  list: (params?: { page?: number; status?: string }) =>
    api.get('/bookings/chadhava-bookings', { params }),
  getById: (id: string) => api.get(`/bookings/chadhava-bookings/${id}`),
  create: (data: {
    chadhava_event_id: string;
    sankalp?: string;
    prasad_delivery_address?: string;
    devotees: Array<{ name: string; gotra: string }>;
    offerings: Array<{ offering_id: string; quantity: number }>;
    booking_type?: 'ONE_TIME' | 'SUBSCRIPTION';
    subscription_count?: number;
    idempotency_key?: string;
  }) => api.post('/bookings/chadhava-bookings', data),
  cancel: (id: string) => api.patch(`/bookings/chadhava-bookings/${id}/cancel`),
  cancelRepeat: (id: string) => api.patch(`/bookings/chadhava-bookings/${id}/cancel-repeat`),
};

export const appointmentService = {
  list: (params?: { page?: number; status?: string }) =>
    api.get('/bookings/appointments', { params }),
  getById: (id: string) => api.get(`/bookings/appointments/${id}`),
  create: (data: {
    astrologer_id: string;
    duration: '15min' | '30min' | '1hour' | '2hour';
    scheduled_at: string;
    devotee_name: string;
    devotee_gotra?: string;
  }) => api.post('/bookings/appointments', data),
  cancel: (id: string) => api.patch(`/bookings/appointments/${id}/cancel`),
};

// ─── Payments (Razorpay) ─────────────────────────────────────────────────────
// Deferred-booking flow (May 2026): the booking row is created server-side ONLY
// after /verify succeeds. The client never calls *BookingService.create from
// the checkout page — instead it sends the FULL booking payload to
// /payments/create-order, and reads `booking.id` out of the /verify response.
export const paymentService = {
  createOrder: (data: {
    booking_type: 'PUJA' | 'CHADHAVA' | 'APPOINTMENT';
    booking_payload: Record<string, unknown>;
    booking_idempotency_key: string;
  }) => api.post('/bookings/payments/create-order', data),
  verify: (data: {
    payment_id: string;
    gateway_order_id: string;
    gateway_payment_id: string;
    gateway_signature: string;
  }) => api.post('/bookings/payments/verify', data),
  getKey: () => api.get('/bookings/payments/razorpay/key'),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsService = {
  get: () => api.get('/catalog/settings'),
  getHomeBanners: () => api.get('/catalog/settings/home-banners'),
};

// ─── Media ───────────────────────────────────────────────────────────────────
export const mediaService = {
  uploadLocal: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // The api instance defaults Content-Type to application/json — must override
    // for FormData. Axios v1 sees the multipart value + FormData body and lets
    // the browser inject the boundary, so multer parses it correctly.
    return api.post('/media/upload/local', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Panchang ────────────────────────────────────────────────────────────────
export const panchangService = {
  get: (params: { date: string; location?: string; lat?: number; lng?: number }) =>
    api.get('/catalog/panchang', { params }),
  getEvents: (params: { month: number; year: number; location?: string; lat?: number; lng?: number }) =>
    api.get('/catalog/panchang/events', { params }),
};
