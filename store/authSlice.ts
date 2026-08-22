import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface AuthState { user: User | null; token: string | null }

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

const initialState: AuthState = {
  user: parseStoredUser(),
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; token: string }>) {
      const u = (action.payload.user as any)?.data || action.payload.user;
      state.user = u;
      state.token = action.payload.token;
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
