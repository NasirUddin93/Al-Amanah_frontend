'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSelector } from '@/store/hooks';
import { canManageReceipts } from '@/lib/roles';
import { useGetReceiptsQuery, useCreateReceiptMutation } from '@/lib/api';
import { receiptSchema } from '@/lib/schemas';
import { Pagination } from '@/components/pagination';
import { ReceiptPrintArea } from '@/components/receipt-print';
import type { Receipt } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ReceiptsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = canManageReceipts(user);

  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetReceiptsQuery({ page });
  const [createReceipt] = useCreateReceiptMutation();
  const [open, setOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { transaction_id: '', amount: '', payment_method: 'cash', receipt_date: '' },
  });

  const handlePrint = (r: Receipt) => {
    setPrintReceipt(r);
    setTimeout(() => {
      window.print();
      setPrintReceipt(null);
    }, 150);
  };

  const onSubmit = async (values: any) => {
    await createReceipt({ ...values, transaction_id: Number(values.transaction_id), amount: Number(values.amount) }).unwrap();
    setOpen(false);
    reset();
  };

  return (
    <>
      <div className={printReceipt ? 'space-y-4 print:hidden' : 'space-y-4'}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Receipts</h1>
          {canManage && <Button onClick={() => setOpen(true)}>New Receipt</Button>}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>}
                {data?.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.receipt_no}</TableCell>
                    <TableCell>{r.member?.name}</TableCell>
                    <TableCell className="font-semibold">BDT {Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{r.payment_method?.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>{r.receipt_date}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handlePrint(r)} className="cursor-pointer">
                        Print
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Pagination meta={data?.meta} page={page} onPageChange={setPage} />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Receipt</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div><Label>Transaction ID</Label><Input type="number" {...register('transaction_id')} className="mt-1" />{errors.transaction_id && <p className="text-sm text-red-600">{String(errors.transaction_id.message)}</p>}</div>
              <div><Label>Amount (BDT)</Label><Input type="number" step="0.01" placeholder="0.00" {...register('amount')} className="mt-1" />{errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}</div>
              <div><Label>Payment Method</Label>
                <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white mt-1" {...register('payment_method')}>
                  {['cash', 'bank', 'mobile_banking', 'other'].map((m) => <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div><Label>Receipt Date</Label><Input type="date" {...register('receipt_date')} className="mt-1" />{errors.receipt_date && <p className="text-sm text-red-600">{String(errors.receipt_date.message)}</p>}</div>
              <Button type="submit" className="w-full mt-4">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ReceiptPrintArea receipt={printReceipt} />
    </>
  );
}
