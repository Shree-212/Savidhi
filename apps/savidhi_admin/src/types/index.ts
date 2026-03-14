export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  createdAt: string;
}
