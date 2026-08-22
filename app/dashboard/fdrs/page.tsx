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

export default function FdrsPage() {
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
        <h1 className="text-2xl font-bold text-slate-900">Fixed Deposit Receipts (FDR)</h1>
        {staff && <Button onClick={() => setOpen(true)}>Add FDR</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>FDR No</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>}
              {data?.data.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.fdr_no}</TableCell>
                  <TableCell>{f.member?.name}</TableCell>
                  <TableCell className="font-semibold">BDT {Number(f.amount).toLocaleString()}</TableCell>
                  <TableCell>{f.start_date}</TableCell>
                  <TableCell>{f.maturity_date ?? '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add FDR</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmit(async (v) => { await create({ ...v, member_id: Number(v.member_id), amount: Number(v.amount) }).unwrap(); setOpen(false); reset(); })}>
            <div><Label>Member</Label>
              <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white" {...register('member_id')}>
                <option value="">Select member</option>
                {users?.data.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.member_id && <p className="text-sm text-red-600">{String(errors.member_id.message)}</p>}
            </div>
            <div><Label>Amount (BDT)</Label><Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />{errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}</div>
            <div><Label>Start Date</Label><Input type="date" {...register('start_date')} />{errors.start_date && <p className="text-sm text-red-600">{String(errors.start_date.message)}</p>}</div>
            <div><Label>Maturity Date</Label><Input type="date" {...register('maturity_date')} /></div>
            <Button type="submit" className="w-full mt-4">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
