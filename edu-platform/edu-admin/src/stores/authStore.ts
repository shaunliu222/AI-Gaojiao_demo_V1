import { create } from 'zustand';

export interface UserInfo {
  token: string;
  username: string;
  name: string;
  role: string;
  avatar: string;
  permissions: string[];
}

interface AuthStore {
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  hasPermission: (perm: string) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })(),

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', user.token);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null });
  },

  isLoggedIn: () => get().user !== null,

  hasPermission: (perm: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.some(p => perm.startsWith(p));
  },
}));
