import { getToken } from './auth.ts';

const API_BASE = '/api';

interface ApiResponse<T = any> {
  data: T;
  status: number;
}

class ApiError extends Error {
  response?: {
    data?: { detail?: string };
    status?: number;
  };

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.response = {
      status,
      data: { detail }
    };
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Handle blob responses (for CSV export)
  if (options.headers && (options.headers as any)['Accept'] === 'text/csv' || endpoint.includes('/export/')) {
    if (!response.ok) {
      throw new ApiError('Export failed', response.status);
    }
    const blob = await response.blob();
    return { data: blob as any, status: response.status };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new ApiError(data.detail || `Request failed with status ${response.status}`, response.status, data.detail);
  }

  return { data, status: response.status };
}

export const api = {
  get: <T = any>(url: string, config?: { headers?: any; responseType?: string }) => {
    return request<T>(url, {
      method: 'GET',
      headers: config?.responseType === 'blob' ? { Accept: 'text/csv' } : config?.headers
    });
  },
  post: <T = any>(url: string, data?: any, config?: { headers?: any }) => {
    return request<T>(url, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: config?.headers
    });
  },
  put: <T = any>(url: string, data?: any) => {
    return request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  patch: <T = any>(url: string, data?: any) => {
    return request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  delete: <T = any>(url: string) => {
    return request<T>(url, {
      method: 'DELETE'
    });
  }
};

export const authAPI = {
  login: (data: { identifier: string; password: string }) => api.post('/auth/login', data),
  qrLogin: (data: { student_code: string }) => api.post('/auth/qr-login', data),
  register: (data: any) => api.post('/auth/register', data),
  forgotPassword: (data: { identifier: string }) => api.post('/auth/forgot-password', data),
  verifyResetCode: (data: { identifier: string; code: string }) => api.post('/auth/verify-reset-code', data),
  resetPassword: (data: { resetToken: string; newPassword: string }) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me')
};

export const profileAPI = {
  update: (data: any) => api.put('/profile', data)
};

export const eventAPI = {
  create: (data: any) => api.post('/events', data),
  getAll: (activeOnly = false) => api.get(`/events?active_only=${activeOnly}`),
  getById: (id: string) => api.get(`/events/${id}`),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`)
};

export const attendanceAPI = {
  record: (data: { event_id: string; mode: 'TIMEIN' | 'TIMEOUT'; student_code?: string; nfc_id?: string }) =>
    api.post('/attendance', data),
  getRecent: (limit = 10) => api.get(`/attendance/recent?limit=${limit}`),
  getStudentAttendance: (studentCode: string) => api.get(`/attendance/student/${encodeURIComponent(studentCode)}`),
  getByEvent: (eventId: string) => api.get(`/attendance/event/${eventId}`)
};

export const clearanceAPI = {
  get: (semester?: string) => api.get(`/clearance${semester ? `?semester=${encodeURIComponent(semester)}` : ''}`),
  getBonusPoints: (semester?: string) => {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester);
    return api.get(`/bonus-points?${params.toString()}`);
  }
};

export const adminAPI = {
  createOfficer: (data: any) => api.post('/admin/officers', data),
  createAdmin: (data: any) => api.post('/admin/admins', data),
  getUsers: (role?: string) => api.get(`/admin/users${role ? `?role=${role}` : ''}`),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  toggleUserFreeze: (id: string) => api.post(`/admin/users/${id}/toggle-freeze`, {}),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  bulkImport: async (fileOrText: File | string) => {
    if (typeof fileOrText === 'string') {
      return api.post('/admin/bulk-import', { csvText: fileOrText });
    }
    const text = await fileOrText.text();
    return api.post('/admin/bulk-import', { csvText: text });
  },
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getAnalytics: () => api.get('/admin/analytics'),
  getSemesterDetails: (semester: string) => api.get(`/admin/semester-details?semester=${encodeURIComponent(semester)}`),
  exportAttendance: (semester?: string) => {
    const url = semester ? `/admin/export/attendance?semester=${encodeURIComponent(semester)}` : '/admin/export/attendance';
    return api.get(url, { responseType: 'blob' });
  },
  addBonusPoints: (data: { student_id: string; points: number; reason: string; semester?: string }) =>
    api.post('/admin/bonus-points', data),
  getBonusPoints: (studentId?: string, semester?: string) => {
    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId);
    if (semester) params.append('semester', semester);
    return api.get(`/admin/bonus-points?${params.toString()}`);
  },
  deleteBonusPoints: (bonusId: string) => api.delete(`/admin/bonus-points/${bonusId}`),
  getSemesters: () => api.get('/admin/semesters'),
  getAuditLogs: () => api.get('/admin/audit-logs')
};

export const announcementAPI = {
  getAll: () => api.get('/announcements'),
  create: (data: { title: string; content: string; organization?: string; priority?: string }) =>
    api.post('/announcements', data),
  update: (id: string, data: { title: string; content: string; organization?: string; priority?: string }) =>
    api.put(`/announcements/${id}`, data),
  delete: (id: string) => api.delete(`/announcements/${id}`)
};

export default api;
