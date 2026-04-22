import api from './api';

/** Family member types and endpoints. */
export interface FamilyMember {
  id: string;
  relation: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  direction: 'incoming' | 'outgoing';
  other: { id: string; name: string; phone: string; image_url?: string | null };
  created_at: string;
}

export const familyApi = {
  list: () => api.get<{ data: { accepted: FamilyMember[]; sent: FamilyMember[]; received: FamilyMember[] } }>('/users/me/family'),
  invite: (phone: string, relation: string) =>
    api.post('/users/me/family', { phone, relation }),
  accept: (id: string) => api.patch(`/users/me/family/${id}/accept`),
  reject: (id: string) => api.patch(`/users/me/family/${id}/reject`),
  remove: (id: string) => api.delete(`/users/me/family/${id}`),
};

/** Notification inbox types and endpoints. */
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  deep_link?: string | null;
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: (unread = false) =>
    api.get<{ data: Notification[]; meta: { unread: number } }>('/users/me/notifications', { params: { unread: unread ? 'true' : undefined } }),
  markRead: (id: string) => api.patch(`/users/me/notifications/${id}/read`),
  markAllRead: () => api.patch('/users/me/notifications/read-all'),
};

/** Chadhava booking + status endpoints used by the new mobile screens. */
export const chadhavaBookingApi = {
  list: () => api.get('/bookings/chadhava-bookings'),
  getById: (id: string) => api.get(`/bookings/chadhava-bookings/${id}`),
};
