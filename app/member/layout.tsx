'use client';
import React from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { MemberLayout } from '@/components/member-layout';

export default function MemberRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={['member']}>
      <MemberLayout>{children}</MemberLayout>
    </AuthGuard>
  );
}
