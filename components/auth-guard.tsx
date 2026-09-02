'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, setUser, rehydrate } from '@/store/authSlice';
import { useMeQuery } from '@/lib/api';
import type { RoleName } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
  fallbackUrl?: string;
}

export function AuthGuard({ children, allowedRoles, fallbackUrl }: AuthGuardProps) {
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const isHydrated = useAppSelector((s) => s.auth.isHydrated);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Synchronize auth state on client mount
  useEffect(() => {
    dispatch(rehydrate());
    setMounted(true);
  }, [dispatch]);

  // Read effective token from Redux or directly from localStorage as fallback
  const effectiveToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const { data, isError, error, isLoading } = useMeQuery(undefined, {
    skip: !effectiveToken,
  });

  useEffect(() => {
    if (data) dispatch(setUser(data));
  }, [data, dispatch]);

  useEffect(() => {
    // Wait until both React has mounted and Redux auth state is hydrated from localStorage
    if (!mounted || !isHydrated) return;

    const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const currentToken = token || localToken;

    // If completely unauthenticated (no token in Redux and none in localStorage)
    if (!currentToken) {
      router.replace('/login');
      return;
    }

    // ONLY log out if the backend explicitly returns 401 (Unauthorized) indicating invalid/revoked token.
    // Do NOT log out on network errors (FETCH_ERROR), 500 server errors, timeouts, or temporary glitches.
    if (currentToken && isError) {
      const status = (error as any)?.status;
      if (status === 401) {
        dispatch(logout());
        router.replace('/login');
        return;
      }
    }

    // Role check if allowedRoles is specified
    const currentUser = data || user;
    if (currentUser && allowedRoles && allowedRoles.length > 0) {
      const unwrapped = (currentUser as any)?.data || currentUser;
      const roleName =
        typeof unwrapped?.role === 'string'
          ? unwrapped.role
          : unwrapped?.role?.name || (unwrapped?.role as any)?.data?.name;

      const isSuperAdmin =
        roleName === 'super_admin' || unwrapped?.email === 'superadmin@alamanah.com';
      const isAllowed =
        isSuperAdmin || (roleName && allowedRoles.includes(roleName as RoleName));

      if (!isAllowed) {
        // Redirect to appropriate portal or fallback
        if (fallbackUrl) {
          router.replace(fallbackUrl);
        } else if (roleName === 'member') {
          router.replace('/member');
        } else if (roleName === 'accountant') {
          router.replace('/accounts');
        } else {
          router.replace('/admin');
        }
      }
    }
  }, [token, isError, error, dispatch, router, mounted, isHydrated, data, user, allowedRoles, fallbackUrl]);

  if (!mounted || !effectiveToken) return null;
  return <>{children}</>;
}

