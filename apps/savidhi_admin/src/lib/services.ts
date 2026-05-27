import { apiClient } from './api';

/* ══════════════════════════════════════════════════════════
   Auth Service
   ══════════════════════════════════════════════════════════ */

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
};

/* ══════════════════════════════════════════════════════════
   Catalog Services
   ══════════════════════════════════════════════════════════ */

export const templeService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/catalog/temples', { params: { ...(params ?? {}), include_inactive: 'true' } }),
  getById: (id: string) => apiClient.get(`/catalog/temples/${id}`, { params: { include_inactive: 'true' } }),
  create: (data: any) => apiClient.post('/catalog/temples', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/temples/${id}`, data),
  delete: (id: string, opts?: { force?: boolean }) =>
    apiClient.delete(`/catalog/temples/${id}`, { params: opts?.force ? { force: 'true' } : undefined }),
};

export const deityService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/catalog/deities', { params }),
  getById: (id: string) => apiClient.get(`/catalog/deities/${id}`),
  create: (data: any) => apiClient.post('/catalog/deities', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/deities/${id}`, data),
  delete: (id: string, opts?: { force?: boolean }) =>
    apiClient.delete(`/catalog/deities/${id}`, { params: opts?.force ? { force: 'true' } : undefined }),
};

export const pujaService = {
  list: (params?: { page?: number; limit?: number; search?: string; temple_id?: string }) =>
    apiClient.get('/catalog/pujas', { params: { ...(params ?? {}), include_inactive: 'true' } }),
  getById: (id: string) => apiClient.get(`/catalog/pujas/${id}`, { params: { include_inactive: 'true' } }),
  create: (data: any) => apiClient.post('/catalog/pujas', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/pujas/${id}`, data),
  delete: (id: string) => apiClient.delete(`/catalog/pujas/${id}`),
  generateEvents: (id: string, days = 60) =>
    apiClient.post(`/catalog/pujas/${id}/generate-events?days=${days}`),
  bulkDeleteEvents: (id: string, params: { from: string; dry_run?: boolean }) =>
    apiClient.delete(`/catalog/pujas/${id}/events`, {
      params: { from: params.from, dry_run: params.dry_run ? 'true' : 'false' },
    }),
};

export const chadhavaService = {
  list: (params?: { page?: number; limit?: number; search?: string; temple_id?: string }) =>
    apiClient.get('/catalog/chadhavas', { params: { ...(params ?? {}), include_inactive: 'true' } }),
  getById: (id: string) => apiClient.get(`/catalog/chadhavas/${id}`, { params: { include_inactive: 'true' } }),
  create: (data: any) => apiClient.post('/catalog/chadhavas', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/chadhavas/${id}`, data),
  delete: (id: string) => apiClient.delete(`/catalog/chadhavas/${id}`),
  generateEvents: (id: string, days = 60) =>
    apiClient.post(`/catalog/chadhavas/${id}/generate-events?days=${days}`),
  bulkDeleteEvents: (id: string, params: { from: string; dry_run?: boolean }) =>
    apiClient.delete(`/catalog/chadhavas/${id}/events`, {
      params: { from: params.from, dry_run: params.dry_run ? 'true' : 'false' },
    }),
};

export const pujariService = {
  list: (params?: { page?: number; limit?: number; search?: string; temple_id?: string }) =>
    apiClient.get('/catalog/pujaris', { params: { ...(params ?? {}), include_inactive: 'true' } }),
  getById: (id: string) => apiClient.get(`/catalog/pujaris/${id}`, { params: { include_inactive: 'true' } }),
  create: (data: any) => apiClient.post('/catalog/pujaris', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/pujaris/${id}`, data),
  delete: (id: string) => apiClient.delete(`/catalog/pujaris/${id}`),
  getLedger: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/catalog/pujaris/${id}/ledger`, { params }),
  settleLedger: (id: string, data: { entry_ids: string[]; payment_ref?: string; note?: string }) =>
    apiClient.post(`/catalog/pujaris/${id}/ledger/settle`, data),
};

export const astrologerService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/catalog/astrologers', { params: { ...(params ?? {}), include_inactive: 'true' } }),
  getById: (id: string) => apiClient.get(`/catalog/astrologers/${id}`, { params: { include_inactive: 'true' } }),
  create: (data: any) => apiClient.post('/catalog/astrologers', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/astrologers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/catalog/astrologers/${id}`),
  getLedger: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/catalog/astrologers/${id}/ledger`, { params }),
  settleLedger: (id: string, data: { entry_ids: string[]; payment_ref?: string; note?: string }) =>
    apiClient.post(`/catalog/astrologers/${id}/ledger/settle`, data),
};

export const hamperService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/catalog/hampers', { params }),
  getById: (id: string) => apiClient.get(`/catalog/hampers/${id}`),
  create: (data: any) => apiClient.post('/catalog/hampers', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/catalog/hampers/${id}`, data),
  delete: (id: string, opts?: { force?: boolean }) =>
    apiClient.delete(`/catalog/hampers/${id}`, { params: opts?.force ? { force: 'true' } : undefined }),
};

/* ══════════════════════════════════════════════════════════
   Booking Services
   ══════════════════════════════════════════════════════════ */

export const pujaEventService = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
    view?: string;
    puja_id?: string;
    pujari_id?: string;
    upcoming?: boolean;
  }) => apiClient.get('/bookings/puja-events', { params }),
  getById: (id: string) => apiClient.get(`/bookings/puja-events/${id}`),
  create: (data: any) => apiClient.post('/bookings/puja-events', data),
  update: (id: string, data: { pujari_id?: string | null; start_time?: string | null; max_bookings?: number; short_video_url?: string | null; sankalp_video_url?: string | null }) =>
    apiClient.patch(`/bookings/puja-events/${id}`, data),
  delete: (id: string) => apiClient.delete(`/bookings/puja-events/${id}`),
  cancelAllBookings: (id: string, data: { reason?: string; refund?: boolean }) =>
    apiClient.post(`/bookings/puja-events/${id}/cancel-all-bookings`, data),
  advanceStage: (
    id: string,
    data: {
      stage: string;
      live_link?: string;
      short_video_url?: string;
      sankalp_video_url?: string;
    },
  ) => apiClient.patch(`/bookings/puja-events/${id}/stage`, data),
  // PATCH /:id/media — update intro/sankalp video URLs WITHOUT the
  // STAGE_TRANSITIONS guard. Use this instead of advanceStage() when the event
  // is already at SHIPPED (or any terminal stage) and the admin just wants to
  // replace/delete a video. Pass `null` to clear a slot.
  updateMedia: (
    id: string,
    data: { short_video_url?: string | null; sankalp_video_url?: string | null },
  ) => apiClient.patch(`/bookings/puja-events/${id}/media`, data),
  // POST /:id/ship — Shiprocket bulk-create one order per booking on the
  // event, allocate AWBs, and schedule pickup. Returns a structured summary
  // with per-booking succeeded / failed entries. The event stage only
  // advances to SHIPPED if every booking succeeded.
  ship: (id: string) =>
    apiClient.post<{ success: boolean; data: { total: number; succeeded_count: number; failed_count: number; pickup_scheduled: boolean; pickup_error?: string; stage_advanced: boolean; succeeded: any[]; failed: Array<{ booking_id: string; devotee_name: string; reason: string }> } }>(`/bookings/puja-events/${id}/ship`),
  // GET /:id/shipments?refresh=<bool> — list per-booking shipment fields.
  // Pass refresh=true to poll Shiprocket /track/awb for every active AWB
  // and persist the latest status before returning.
  getShipments: (id: string, opts?: { refresh?: boolean }) =>
    apiClient.get<{ success: boolean; data: Array<any> }>(`/bookings/puja-events/${id}/shipments`, {
      params: opts?.refresh ? { refresh: 'true' } : undefined,
    }),
};

export const pujaBookingService = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    puja_event_id?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
  }) => apiClient.get('/bookings/puja-bookings', { params }),
  getById: (id: string) => apiClient.get(`/bookings/puja-bookings/${id}`),
  cancel: (id: string) =>
    apiClient.patch(`/bookings/puja-bookings/${id}/cancel`),
  // Stops a SUBSCRIPTION booking from re-occurring on future events
  // (Phase A flips booking_type → ONE_TIME; Phase C also cancels Razorpay
  // mandate). Safe to call from the admin "Cancel Subscription" action.
  cancelRepeat: (id: string) =>
    apiClient.patch(`/bookings/puja-bookings/${id}/cancel-repeat`),
  setSankalpTimestamp: (id: string, sankalp_video_timestamp: string) =>
    apiClient.patch(`/bookings/puja-bookings/${id}/sankalp-timestamp`, { sankalp_video_timestamp }),
  // PATCH /:id/ship-address — admin edits a single booking's shipping address
  // in the Ship Package modal before triggering pujaEventService.ship().
  updateShipAddress: (
    id: string,
    data: { ship_to_name?: string; ship_to_phone?: string; ship_to_line1?: string; ship_to_line2?: string; ship_to_city?: string; ship_to_state?: string; ship_to_pincode?: string; ship_to_country?: string },
  ) => apiClient.patch(`/bookings/puja-bookings/${id}/ship-address`, data),
};

export const chadhavaEventService = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
    chadhava_id?: string;
    pujari_id?: string;
    upcoming?: boolean;
    search?: string;
  }) => apiClient.get('/bookings/chadhava-events', { params }),
  getById: (id: string) => apiClient.get(`/bookings/chadhava-events/${id}`),
  create: (data: any) => apiClient.post('/bookings/chadhava-events', data),
  update: (id: string, data: { pujari_id?: string | null; start_time?: string | null; max_bookings?: number; short_video_url?: string | null; sankalp_video_url?: string | null }) =>
    apiClient.patch(`/bookings/chadhava-events/${id}`, data),
  delete: (id: string) => apiClient.delete(`/bookings/chadhava-events/${id}`),
  cancelAllBookings: (id: string, data: { reason?: string; refund?: boolean }) =>
    apiClient.post(`/bookings/chadhava-events/${id}/cancel-all-bookings`, data),
  advanceStage: (
    id: string,
    data: {
      stage?: string;
      live_link?: string;
      short_video_url?: string;
      sankalp_video_url?: string;
    },
  ) => apiClient.patch(`/bookings/chadhava-events/${id}/stage`, data),
  // See pujaEventService.updateMedia for rationale.
  updateMedia: (
    id: string,
    data: { short_video_url?: string | null; sankalp_video_url?: string | null },
  ) => apiClient.patch(`/bookings/chadhava-events/${id}/media`, data),
};

export const chadhavaBookingService = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    chadhava_event_id?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
  }) => apiClient.get('/bookings/chadhava-bookings', { params }),
  getById: (id: string) => apiClient.get(`/bookings/chadhava-bookings/${id}`),
  cancel: (id: string) =>
    apiClient.patch(`/bookings/chadhava-bookings/${id}/cancel`),
  // See pujaBookingService.cancelRepeat for rationale.
  cancelRepeat: (id: string) =>
    apiClient.patch(`/bookings/chadhava-bookings/${id}/cancel-repeat`),
  setSankalpTimestamp: (id: string, sankalp_video_timestamp: string) =>
    apiClient.patch(`/bookings/chadhava-bookings/${id}/sankalp-timestamp`, { sankalp_video_timestamp }),
};

export const appointmentService = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    astrologer_id?: string;
  }) => apiClient.get('/bookings/appointments', { params }),
  getById: (id: string) => apiClient.get(`/bookings/appointments/${id}`),
  generateMeetLink: (id: string, data?: { meet_link?: string }) =>
    apiClient.patch(`/bookings/appointments/${id}/generate-link`, data),
  complete: (id: string) =>
    apiClient.patch(`/bookings/appointments/${id}/complete`),
  cancel: (id: string) =>
    apiClient.patch(`/bookings/appointments/${id}/cancel`),
  update: (id: string, data: { scheduled_at?: string; astrologer_id?: string; duration_minutes?: number }) =>
    apiClient.patch(`/bookings/appointments/${id}`, data),
};

/* ══════════════════════════════════════════════════════════
   Notification Service (admin compose / broadcast)
   ══════════════════════════════════════════════════════════ */

export const notificationService = {
  send: (data: {
    audience: 'ALL' | 'ACTIVE_PUJA_BOOKING' | 'EVENT_DEVOTEES' | 'SPECIFIC';
    devotee_ids?: string[];
    puja_event_id?: string;
    chadhava_event_id?: string;
    channels: Array<'IN_APP' | 'SMS' | 'WHATSAPP'>;
    title: string;
    body: string;
    deep_link_path?: string;
  }) => apiClient.post('/users/notifications/admin/send', data),
};

/* ══════════════════════════════════════════════════════════
   User / Devotee Services
   ══════════════════════════════════════════════════════════ */

export const devoteeService = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/users/devotees', { params }),
  getById: (id: string) => apiClient.get(`/users/devotees/${id}`),
};

export const adminUserService = {
  list: () => apiClient.get('/users/admin-users', { params: { include_inactive: 'true' } }),
  create: (data: {
    email: string;
    name: string;
    password: string;
    role: string;
  }) => apiClient.post('/users/admin-users', data),
  update: (id: string, data: any) =>
    apiClient.patch(`/users/admin-users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/admin-users/${id}`),
};

/* ══════════════════════════════════════════════════════════
   Settings Service
   ══════════════════════════════════════════════════════════ */

export const settingsService = {
  get: () => apiClient.get('/catalog/settings'),
  update: (data: any) => apiClient.patch('/catalog/settings', data),
};

/* ══════════════════════════════════════════════════════════
   Dashboard & Reports Services
   ══════════════════════════════════════════════════════════ */

export const dashboardService = {
  getStats: () => apiClient.get('/bookings/dashboard/stats'),
};

export const reportService = {
  pujaSankalp: (params?: any) =>
    apiClient.get('/bookings/reports/puja-sankalp', { params }),
  chadhavaSankalp: (params?: any) =>
    apiClient.get('/bookings/reports/chadhava-sankalp', { params }),
  chadhavaOfferings: (params?: any) =>
    apiClient.get('/bookings/reports/chadhava-offerings', { params }),
  chadhavaOfferingsDetail: (params?: any) =>
    apiClient.get('/bookings/reports/chadhava-offerings-detail', { params }),
  appointments: (params?: any) =>
    apiClient.get('/bookings/reports/appointments', { params }),
  payments: (params?: any) =>
    apiClient.get('/bookings/reports/payments', { params }),
  dailyRevenue: (params?: any) =>
    apiClient.get('/bookings/reports/daily-revenue', { params }),
  cancellations: (params?: any) =>
    apiClient.get('/bookings/reports/cancellations', { params }),
  workload: (params?: any) =>
    apiClient.get('/bookings/reports/workload', { params }),
  ledger: (params?: any) =>
    apiClient.get('/bookings/reports/ledger', { params }),
  allBookings: (params?: any) =>
    apiClient.get('/bookings/reports/all-bookings', { params }),
  summary: (params?: any) =>
    apiClient.get('/bookings/reports/summary', { params }),
  templeWise: (params?: any) =>
    apiClient.get('/bookings/reports/temple-wise', { params }),
  deityWise: (params?: any) =>
    apiClient.get('/bookings/reports/deity-wise', { params }),
  devoteeWise: (params?: any) =>
    apiClient.get('/bookings/reports/devotee-wise', { params }),

  /** Download the report-wide export. format=xlsx|zip controls the shape. */
  downloadReport: (key: string, format: 'xlsx' | 'zip', params?: any) =>
    apiClient.get(`/bookings/reports/${key}`, {
      params: { ...(params ?? {}), format },
      responseType: 'blob',
    }),
  /**
   * Download one row of a grouped report (event or astrologer). Backend
   * `format=xlsx` returns a raw .xlsx; `format=json` returns the inner data
   * shape used by the client-side PDF builder.
   */
  downloadRow: (key: string, rowId: string, format: 'xlsx' = 'xlsx', params?: any) =>
    apiClient.get(`/bookings/reports/${key}/${rowId}/export`, {
      params: { ...(params ?? {}), format },
      responseType: 'blob',
    }),
  /** Fetch one row of a grouped report as JSON (for client-side PDF). */
  rowJson: (key: string, rowId: string, params?: any) =>
    apiClient.get(`/bookings/reports/${key}/${rowId}/export`, {
      params: { ...(params ?? {}), format: 'json' },
    }),
};

/** Trigger a browser download from a binary axios response. */
export function downloadBlob(response: { data: Blob; headers: any }, fallbackName: string) {
  const cd = String(response.headers?.['content-disposition'] ?? '');
  const match = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
  const filename = match ? match[1] : fallbackName;
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ══════════════════════════════════════════════════════════
   Media Service
   ══════════════════════════════════════════════════════════ */

export const mediaService = {
  getPresignedUrl: (folder: string, fileName: string, contentType: string) =>
    apiClient.post('/media/upload/presigned-url', {
      folder,
      fileName,
      contentType,
    }),
  uploadLocal: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/media/upload/local', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
