'use client';
import React from 'react';
import type { RoleName } from '@/types';
import { useAppSelector } from '@/store/hooks';
import { hasRole } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RoleGate({ roles, children }: { roles: RoleName[]; children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);

  if (!hasRole(user, roles)) {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent>Your role does not have permission to view this page.</CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
