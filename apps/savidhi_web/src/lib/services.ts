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
  }) => api.post('/bookings/puja-bookings', data),
  cancel: (id: string) => api.patch(`/bookings/puja-bookings/${id}/cancel`),
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
  }) => api.post('/bookings/chadhava-bookings', data),
  cancel: (id: string) => api.patch(`/bookings/chadhava-bookings/${id}/cancel`),
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

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentService = {
  createOrder: (data: { booking_type: 'PUJA' | 'CHADHAVA' | 'APPOINTMENT'; booking_id: string; amount: number }) =>
    api.post('/bookings/payments/create-order', data),
  verify: (data: { payment_id: string; gateway_payment_id: string; gateway_signature: string }) =>
    api.post('/bookings/payments/verify', data),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsService = {
  get: () => api.get('/catalog/settings'),
};

// ─── Panchang ────────────────────────────────────────────────────────────────
export const panchangService = {
  get: (params: { date: string; location?: string }) =>
    api.get('/catalog/panchang', { params }),
  getEvents: (params: { month: number; year: number }) =>
    api.get('/catalog/panchang/events', { params }),
};
