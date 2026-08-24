'use client';
import React, { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore, type AppStore } from '@/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    if (storeRef.current) {
      // Enables refetchOnFocus and refetchOnReconnect across all RTK Query endpoints
      return setupListeners(storeRef.current.dispatch);
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
