'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSelector } from '@/store/hooks';
import { canManageTransactions } from '@/lib/roles';
import { useGetFdrsQuery, useCreateFdrMutation, useGetUsersQuery } from '@/lib/api';
import { fdrSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminFdrsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const staff = canManageTransactions(user);
  const { data, isLoading } = useGetFdrsQuery();
  const [create] = useCreateFdrMutation();
  const { data: users } = useGetUsersQuery(undefined, { skip: !staff });
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(fdrSchema),
    defaultValues: { member_id: '', amount: '', start_date: '', maturity_date: '' },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixed Deposit Receipts (FDR)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage fixed term investment deposits and maturity tracking.</p>
        </div>
        {staff && <Button onClick={() => setOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer">Add FDR</Button>}
      </div>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-slate-900">FDR No</TableHead>
                <TableHead className="font-bold text-slate-900">Member</TableHead>
                <TableHead className="font-bold text-slate-900">Amount</TableHead>
                <TableHead className="font-bold text-slate-900">Start Date</TableHead>
                <TableHead className="font-bold text-slate-900">Maturity</TableHead>
                <TableHead className="font-bold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-500">Loading FDRs...</TableCell></TableRow>}
              {data?.data.length === 0 && !isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-500">No FDR records found.</TableCell></TableRow>}
              {data?.data.map((f) => (
                <TableRow key={f.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="font-mono font-medium text-slate-900">{f.fdr_no}</TableCell>
                  <TableCell className="font-medium text-slate-800">{f.member?.name}</TableCell>
                  <TableCell className="font-bold text-slate-900">BDT {Number(f.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-slate-600">{f.start_date}</TableCell>
                  <TableCell className="text-slate-600">{f.maturity_date ?? '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize bg-emerald-50 text-emerald-800 border-emerald-200">{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add FDR</DialogTitle></DialogHeader>
          <form className="space-y-3 pt-2" onSubmit={handleSubmit(async (v) => { await create({ ...v, member_id: Number(v.member_id), amount: Number(v.amount) }).unwrap(); setOpen(false); reset(); })}>
            <div><Label>Member</Label>
              <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white mt-1" {...register('member_id')}>
                <option value="">Select member</option>
                {users?.data.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.member_id && <p className="text-xs text-red-600 mt-1">{String(errors.member_id.message)}</p>}
            </div>
            <div><Label>Amount (BDT)</Label><Input type="number" step="0.01" placeholder="0.00" {...register('amount')} className="mt-1 bg-white" />{errors.amount && <p className="text-xs text-red-600 mt-1">{String(errors.amount.message)}</p>}</div>
            <div><Label>Start Date</Label><Input type="date" {...register('start_date')} className="mt-1 bg-white" />{errors.start_date && <p className="text-xs text-red-600 mt-1">{String(errors.start_date.message)}</p>}</div>
            <div><Label>Maturity Date</Label><Input type="date" {...register('maturity_date')} className="mt-1 bg-white" /></div>
            <Button type="submit" className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 cursor-pointer">Save FDR</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
