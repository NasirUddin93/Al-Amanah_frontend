'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleGate } from '@/components/role-gate';
import { useGetMeetingExpensesQuery, useCreateMeetingExpenseMutation, useDeleteMeetingExpenseMutation } from '@/lib/api';
import { expenseSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminMeetingExpensesPage() {
  return <RoleGate roles={['super_admin', 'admin']}><Content /></RoleGate>;
}

function Content() {
  const { data, isLoading } = useGetMeetingExpensesQuery();
  const [create] = useCreateMeetingExpenseMutation();
  const [remove] = useDeleteMeetingExpenseMutation();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: '', expense_date: '', amount: '', description: '' },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meeting Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Record and monitor society meeting logistics, refreshments, and audit costs.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer">
          Add Expense
        </Button>
      </div>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Title</TableHead>
                <TableHead className="font-bold text-slate-900">Date</TableHead>
                <TableHead className="font-bold text-slate-900">Amount</TableHead>
                <TableHead className="font-bold text-slate-900">Description</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">Loading...</TableCell></TableRow>}
              {data?.data.length === 0 && !isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">No meeting expenses recorded yet.</TableCell></TableRow>}
              {data?.data.map((e) => (
                <TableRow key={e.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="font-medium text-slate-900">{e.title}</TableCell>
                  <TableCell className="text-slate-600">{e.expense_date}</TableCell>
                  <TableCell className="font-bold text-slate-900">BDT {Number(e.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-slate-500 text-xs">{e.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm('Delete this expense?')) remove(e.id); }} className="cursor-pointer">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Meeting Expense</DialogTitle></DialogHeader>
          <form className="space-y-3 pt-2" onSubmit={handleSubmit(async (v) => { await create({ ...v, amount: Number(v.amount) }).unwrap(); setOpen(false); reset(); })}>
            <div><Label>Title</Label><Input {...register('title')} className="mt-1 bg-white" />{errors.title && <p className="text-xs text-red-600 mt-1">{String(errors.title.message)}</p>}</div>
            <div><Label>Date</Label><Input type="date" {...register('expense_date')} className="mt-1 bg-white" />{errors.expense_date && <p className="text-xs text-red-600 mt-1">{String(errors.expense_date.message)}</p>}</div>
            <div><Label>Amount (BDT)</Label><Input type="number" step="0.01" placeholder="0.00" {...register('amount')} className="mt-1 bg-white" />{errors.amount && <p className="text-xs text-red-600 mt-1">{String(errors.amount.message)}</p>}</div>
            <div><Label>Description</Label><Input {...register('description')} className="mt-1 bg-white" /></div>
            <Button type="submit" className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 cursor-pointer">Save Expense</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
