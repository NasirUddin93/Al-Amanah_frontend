'use client';
import React from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { AccountsLayout } from '@/components/accounts-layout';

export default function AccountsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['accountant', 'admin', 'super_admin']}>
      <AccountsLayout>{children}</AccountsLayout>
    </AuthGuard>
  );
}
