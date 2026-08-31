'use client';
import React from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { AdminLayout } from '@/components/admin-layout';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['admin', 'super_admin', 'accountant']} fallbackUrl="/member">
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}
