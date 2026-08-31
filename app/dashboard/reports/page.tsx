'use client';
import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetReportQuery } from '@/lib/api';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
  return (
    <RoleGate roles={['super_admin', 'admin', 'accountant']}>
      <ReportContent />
    </RoleGate>
  );
}

function ReportContent() {
  const user = useAppSelector((s) => s.auth.user);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');

  const { data, isFetching } = useGetReportQuery({
    from: from || undefined,
    to: to || undefined,
    type: type || undefined,
    per_page: 1000,
  });

  const total = data?.data.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Filters — hidden when printing */}
      <div className="space-y-3 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Transaction Report</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white mt-1" /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white mt-1" /></div>
          <div>
            <Label>Type</Label>
            <select className="border border-slate-200 rounded-md p-2 bg-white text-sm mt-1 h-9 flex items-center" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {['payment', 'share', 'fdr', 'expense', 'other'].map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <Button onClick={() => window.print()} disabled={!data?.data?.length} className="cursor-pointer">
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Printable report area */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6">
          <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
            <h2 className="text-xl font-bold text-slate-900">Al-Amanah Society</h2>
            <p className="text-sm font-semibold text-slate-700">Transaction Report</p>
            <p className="text-xs text-slate-600 mt-1">
              {from && `From: ${from} `}
              {to && `To: ${to} `}
              {type && `| Type: ${type}`}
              {!from && !to && !type && 'All records'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Generated: {new Date().toLocaleString()} by {user?.name}</p>
          </div>

          {isFetching && <p className="print:hidden text-center py-4 text-slate-500">Loading report...</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Transaction No</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{t.transaction_no}</TableCell>
                  <TableCell>{t.member?.name}</TableCell>
                  <TableCell className="capitalize">{t.type}</TableCell>
                  <TableCell>{t.transaction_date}</TableCell>
                  <TableCell className="text-right font-medium">BDT {Number(t.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-slate-800">
                <TableCell colSpan={5} className="text-right font-bold text-slate-900">Total</TableCell>
                <TableCell className="text-right font-bold text-slate-900">BDT {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="mt-20 flex justify-between text-sm text-slate-700">
            <p className="text-center">______________________<br />Prepared by</p>
            <p className="text-center">______________________<br />Checked by</p>
            <p className="text-center">______________________<br />Authorized signature</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
