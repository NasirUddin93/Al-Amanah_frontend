'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, setUser } from '@/store/authSlice';
import { useMeQuery } from '@/lib/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { data, isError } = useMeQuery(undefined, { skip: !token });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (data) dispatch(setUser(data));
  }, [data, dispatch]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) router.replace('/login');
    if (token && isError) {
      dispatch(logout());
      router.replace('/login');
    }
  }, [token, isError, dispatch, router, mounted]);

  if (!mounted || !token) return null;
  return <>{children}</>;
}
