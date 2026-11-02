export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'officer' | 'admin';
  student_code?: string | null;
  student_id?: string | null;
  contact?: string;
  organization?: string;
  year_level?: string | null;
  photo?: string | null;
  qr_code?: string | null;
  nfc_id?: string | null;
  total_points?: number;
}

export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string): void => localStorage.setItem('token', token);
export const removeToken = (): void => localStorage.removeItem('token');

export const getUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setUser = (user: User): void => localStorage.setItem('user', JSON.stringify(user));
export const removeUser = (): void => localStorage.removeItem('user');

export const logout = (): void => {
  removeToken();
  removeUser();
  window.location.href = '/';
};

export const isAuthenticated = (): boolean => !!getToken();

export const getUserRole = (): string | undefined => {
  const user = getUser();
  return user?.role;
};
