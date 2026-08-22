'use client';
import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetAdminPermissionsQuery, useAssignPaymentPermissionMutation, useGetUsersQuery } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminPermissionsPage() {
  return (
    <RoleGate roles={['super_admin']}>
      <Content />
    </RoleGate>
  );
}

function Content() {
  const { data, isLoading } = useGetAdminPermissionsQuery();
  const { data: users } = useGetUsersQuery();
  const [assign] = useAssignPaymentPermissionMutation();
  const [adminId, setAdminId] = useState('');
  const [canChange, setCanChange] = useState(true);

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Admin Payment Permissions</h1>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div>
            <Label>Select Admin</Label>
            <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white mt-1" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
              <option value="">Choose admin user</option>
              {users?.data.filter((u) => u.role?.name === 'admin').map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={canChange} onChange={(e) => setCanChange(e.target.checked)} className="rounded" />
            Can change payment values
          </label>
          <Button onClick={() => adminId && assign({ admin_user_id: Number(adminId), can_change_payment: canChange }).unwrap()}>
            Save Permission
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Admin</TableHead><TableHead>Can Change Payment</TableHead><TableHead>Assigned By</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-6">Loading...</TableCell></TableRow>}
              {data?.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.admin?.name}</TableCell>
                  <TableCell>{p.can_change_payment ? <Badge className="bg-green-100 text-green-700 border-green-200">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell>
                  <TableCell className="text-slate-500">{p.assigned_by || 'System'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
