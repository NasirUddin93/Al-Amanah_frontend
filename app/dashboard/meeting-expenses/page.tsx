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

export default function MeetingExpensesPage() {
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
        <h1 className="text-2xl font-bold text-slate-900">Meeting Expenses</h1>
        <Button onClick={() => setOpen(true)}>Add Expense</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>}
              {data?.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{e.expense_date}</TableCell>
                  <TableCell className="font-semibold">${e.amount}</TableCell>
                  <TableCell className="text-slate-500">{e.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm('Delete this expense?')) remove(e.id); }}>
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
          <form className="space-y-3" onSubmit={handleSubmit(async (v) => { await create({ ...v, amount: Number(v.amount) }).unwrap(); setOpen(false); reset(); })}>
            <div><Label>Title</Label><Input {...register('title')} />{errors.title && <p className="text-sm text-red-600">{String(errors.title.message)}</p>}</div>
            <div><Label>Date</Label><Input type="date" {...register('expense_date')} />{errors.expense_date && <p className="text-sm text-red-600">{String(errors.expense_date.message)}</p>}</div>
            <div><Label>Amount</Label><Input type="number" step="0.01" {...register('amount')} />{errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}</div>
            <div><Label>Description</Label><Input {...register('description')} /></div>
            <Button type="submit" className="w-full mt-4">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
