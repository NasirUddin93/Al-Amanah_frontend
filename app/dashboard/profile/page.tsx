'use client';
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetTransactionsQuery } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: trx, isLoading } = useGetTransactionsQuery();

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

      <Card>
        <CardHeader><CardTitle className="text-base text-slate-800">Profile Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{user?.name}</span></div>
          <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-900">{user?.email}</span></div>
          <div><span className="text-slate-500">ID:</span> <span className="font-medium text-slate-900">{user?.member_profile?.member_no ?? '-'}</span></div>
          <div><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-900">{user?.member_profile?.phone ?? '-'}</span></div>
          <div><span className="text-slate-500">Share Amount:</span> <span className="font-medium text-slate-900">${user?.member_profile?.share_amount ?? 0}</span></div>
          <div><span className="text-slate-500">Address:</span> <span className="font-medium text-slate-900">{user?.member_profile?.address ?? '-'}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base text-slate-800">My Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>No</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-6">Loading...</TableCell></TableRow>}
              {trx?.data.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">No transactions recorded yet.</TableCell></TableRow>}
              {trx?.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.transaction_no}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.type}</Badge></TableCell>
                  <TableCell className="font-semibold">${t.amount}</TableCell>
                  <TableCell>{t.transaction_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
