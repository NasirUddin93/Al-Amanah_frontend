import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
}

function parseStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || parsed;
  } catch {
    return null;
  }
}

function parseStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  user: parseStoredUser(),
  token: parseStoredToken(),
  isHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    rehydrate(state) {
      if (typeof window !== 'undefined') {
        const token = parseStoredToken();
        const user = parseStoredUser();
        if (token) state.token = token;
        if (user) state.user = user;
      }
      state.isHydrated = true;
    },
    setCredentials(state, action: PayloadAction<{ user: User; token: string }>) {
      const u = (action.payload.user as any)?.data || action.payload.user;
      state.user = u;
      state.token = action.payload.token;
      state.isHydrated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(u));
      }
    },
    setUser(state, action: PayloadAction<User>) {
      const u = (action.payload as any)?.data || action.payload;
      state.user = u;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(u));
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isHydrated = true;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },
  },
});

export const { rehydrate, setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
