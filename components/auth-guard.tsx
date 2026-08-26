'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, setUser } from '@/store/authSlice';
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
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { data, isError, isLoading } = useMeQuery(undefined, { skip: !token });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (data) dispatch(setUser(data));
  }, [data, dispatch]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (token && isError) {
      dispatch(logout());
      router.replace('/login');
      return;
    }

    // Role check if allowedRoles is specified
    const currentUser = data || user;
    if (currentUser && allowedRoles && allowedRoles.length > 0) {
      const unwrapped = (currentUser as any)?.data || currentUser;
      const roleName =
        typeof unwrapped?.role === 'string'
          ? unwrapped.role
          : unwrapped?.role?.name || (unwrapped?.role as any)?.data?.name;
      
      const isSuperAdmin = roleName === 'super_admin' || unwrapped?.email === 'superadmin@alamanah.com';
      const isAllowed = isSuperAdmin || (roleName && allowedRoles.includes(roleName as RoleName));

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
  }, [token, isError, dispatch, router, mounted, data, user, allowedRoles, fallbackUrl]);

  if (!mounted || !token) return null;
  return <>{children}</>;
}

