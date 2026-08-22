'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSelector } from '@/store/hooks';
import { canManageTransactions } from '@/lib/roles';
import {
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useGeneratePaymentsMutation,
  useGetUsersQuery,
  useGetSettingsQuery,
} from '@/lib/api';
import { transactionSchema } from '@/lib/schemas';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  PlusCircle,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  CreditCard,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TransactionsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const staff = canManageTransactions(user);
  const isSuperAdmin = user?.role?.name === 'super_admin';

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [type, setType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useGetTransactionsQuery({ page, type: type || undefined });
  const [createTransaction] = useCreateTransactionMutation();
  const [deleteTransaction] = useDeleteTransactionMutation();
  const [generatePayments, { isLoading: isGenerating }] = useGeneratePaymentsMutation();
  const { data: users } = useGetUsersQuery(undefined, { skip: !staff });
  const { data: settings } = useGetSettingsQuery();

  const [openSingle, setOpenSingle] = useState(false);
  const [openDemand, setOpenDemand] = useState(false);

  // Demand Generator State
  const [demandCategory, setDemandCategory] = useState<'monthly_payment' | 'one_time'>('monthly_payment');
  const [targetAllMembers, setTargetAllMembers] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [demandYear, setDemandYear] = useState<number>(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`
  ]);
  const [demandAmount, setDemandAmount] = useState<string>('50');
  const [oneTimeTitle, setOneTimeTitle] = useState<string>('Annual General Meeting Fee');
  const [demandDueDate, setDemandDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [demandDescription, setDemandDescription] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { member_id: '', type: 'payment', amount: '', transaction_date: '', description: '' },
  });

  const onSubmitSingle = async (values: any) => {
    await createTransaction({
      ...values,
      member_id: Number(values.member_id),
      amount: Number(values.amount),
      status: 'paid',
    }).unwrap();
    setOpenSingle(false);
    reset();
  };

  const handleToggleMonth = (monthWithYear: string) => {
    if (selectedMonths.includes(monthWithYear)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== monthWithYear));
    } else {
      setSelectedMonths([...selectedMonths, monthWithYear]);
    }
  };

  const handleSelectAllMonths = () => {
    const all = MONTH_NAMES.map((m) => `${m} ${demandYear}`);
    setSelectedMonths(all);
  };

  const handleClearMonths = () => {
    setSelectedMonths([]);
  };

  const onSubmitDemand = async (e: React.FormEvent) => {
    e.preventDefault();

    const memberIds = targetAllMembers
      ? ['all']
      : selectedMemberId
      ? [Number(selectedMemberId)]
      : [];

    if (!targetAllMembers && memberIds.length === 0) {
      alert('Please select at least one member.');
      return;
    }

    if (demandCategory === 'monthly_payment' && selectedMonths.length === 0) {
      alert('Please select at least one month.');
      return;
    }

    const numAmount = Number(demandAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      const res = await generatePayments({
        payment_category: demandCategory,
        member_ids: memberIds,
        amount: numAmount,
        months: demandCategory === 'monthly_payment' ? selectedMonths : undefined,
        title: demandCategory === 'one_time' ? oneTimeTitle : undefined,
        due_date: demandDueDate,
        description: demandDescription || undefined,
      }).unwrap();

      alert(`Success! Generated ${res.count} pending payment demands for members.`);
      setOpenDemand(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to generate payment demands.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record payments, assign monthly subscriptions, create one-time dues, and manage ledger entries.
          </p>
        </div>
        {staff && (
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => {
                // Auto-set default monthly amount from settings if available
                const settingsList = Array.isArray(settings) ? settings : (settings as any)?.data || [];
                const defaultFee = settingsList.find((s: any) => s.setting_key === 'payment_amount_1')?.setting_value || '50';
                setDemandAmount(defaultFee);
                setOpenDemand(true);
              }}
              className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm"
            >
              <CalendarCheck className="h-4 w-4" /> Create / Assign Payment
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenSingle(true)}
              className="flex items-center gap-1.5 cursor-pointer border-slate-200"
            >
              <PlusCircle className="h-4 w-4 text-slate-600" /> Manual Record
            </Button>
          </div>
        )}
      </div>

      {/* Filter Strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <select
            className="w-full border border-slate-200 rounded-md px-3 py-1.5 bg-white text-sm h-9 text-slate-700 font-medium cursor-pointer"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          >
            <option value="">All Transaction Types</option>
            {['payment', 'share', 'fdr', 'expense', 'other'].map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Transaction No</TableHead>
                <TableHead className="font-bold text-slate-900">Member</TableHead>
                <TableHead className="font-bold text-slate-900">Type / Category</TableHead>
                <TableHead className="font-bold text-slate-900">Month / Description</TableHead>
                <TableHead className="font-bold text-slate-900">Amount</TableHead>
                <TableHead className="font-bold text-slate-900">Status</TableHead>
                <TableHead className="font-bold text-slate-900">Date</TableHead>
                {staff && <TableHead className="text-right font-bold text-slate-900">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={staff ? 8 : 7} className="text-center py-8 text-slate-500">Loading transactions...</TableCell></TableRow>
              )}
              {data?.data.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={staff ? 8 : 7} className="text-center py-8 text-slate-500">No transactions found.</TableCell></TableRow>
              )}
              {data?.data.map((t) => {
                const isPending = t.status === 'pending';

                return (
                  <TableRow key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-slate-900">{t.transaction_no}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs">{t.member?.name ?? '-'}</span>
                        {t.member?.member_no && (
                          <span className="font-mono text-[10px] text-emerald-800 font-bold">ID: {t.member.member_no}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs font-semibold">
                        {t.payment_category === 'monthly_payment'
                          ? 'Monthly Subscription'
                          : t.payment_category === 'one_time'
                          ? 'One-Time Payment'
                          : t.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {t.month && (
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 text-emerald-700 inline" /> {t.month}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 max-w-xs truncate">{t.description || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 text-sm">
                      ${Number(t.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Clock className="h-3 w-3 text-amber-600" /> Pending Payment
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{t.transaction_date}</TableCell>
                    {staff && (
                      <TableCell className="text-right space-x-1">
                        {isSuperAdmin && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this transaction?')) deleteTransaction(t.id);
                            }}
                            className="cursor-pointer h-7 text-xs"
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        meta={data?.meta}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      {/* =========================================================================
          DIALOG 1: CREATE / ASSIGN PAYMENT DEMAND (SUPER ADMIN & ADMIN)
          ========================================================================= */}
      <Dialog open={openDemand} onOpenChange={setOpenDemand}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CalendarCheck className="h-5 w-5 text-emerald-700" />
              Create & Assign Payment Dues
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmitDemand} className="space-y-4 pt-2">
            {/* Category Selector: Monthly vs One-Time */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setDemandCategory('monthly_payment')}
                className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandCategory === 'monthly_payment'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5 text-emerald-700" />
                Monthly Payment
              </button>

              <button
                type="button"
                onClick={() => setDemandCategory('one_time')}
                className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  demandCategory === 'one_time'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 text-emerald-700" />
                One-Time Payment
              </button>
            </div>

            {/* Target Members Selection */}
            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Label className="font-bold text-slate-900 text-xs">Assign To Which Member(s)?</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={targetAllMembers}
                    onChange={(e) => setTargetAllMembers(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    All Active Members in Society
                  </span>
                </label>

                {!targetAllMembers && (
                  <div className="pt-1">
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full border border-slate-200 rounded-md p-2 bg-white text-xs h-9 text-slate-800"
                      required={!targetAllMembers}
                    >
                      <option value="">Select specific member</option>
                      {users?.data
                        ?.filter((u) => u.role?.name === 'member')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} (ID: {u.member_profile?.member_no || 'No ID'}) - {u.email}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* MONTHLY PAYMENT: Year and Multi-Month Selection */}
            {demandCategory === 'monthly_payment' && (
              <div className="space-y-3 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-emerald-950 text-xs">Select Target Month(s)</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllMonths}
                      className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                    >
                      All 12 Months
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearMonths}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Year Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Year:</span>
                  <select
                    value={demandYear}
                    onChange={(e) => {
                      const newYr = Number(e.target.value);
                      setDemandYear(newYr);
                      setSelectedMonths([`${MONTH_NAMES[new Date().getMonth()]} ${newYr}`]);
                    }}
                    className="border border-slate-200 rounded-md px-2.5 py-1 bg-white font-bold text-xs h-8 text-slate-800"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month Check-Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 pt-1">
                  {MONTH_NAMES.map((m) => {
                    const monthKey = `${m} ${demandYear}`;
                    const isSelected = selectedMonths.includes(monthKey);

                    return (
                      <button
                        key={monthKey}
                        type="button"
                        onClick={() => handleToggleMonth(monthKey)}
                        className={`p-2 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-emerald-800">
                  A separate pending payment transaction of <b>${demandAmount}</b> will be generated for each selected month per member.
                </p>
              </div>
            )}

            {/* ONE-TIME PAYMENT: Title / Purpose */}
            {demandCategory === 'one_time' && (
              <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Label className="font-bold text-slate-900 text-xs">Payment Title / Purpose</Label>
                <Input
                  placeholder="e.g. Annual General Meeting Fee, Special Welfare Fund"
                  value={oneTimeTitle}
                  onChange={(e) => setOneTimeTitle(e.target.value)}
                  className="bg-white text-sm"
                  required
                />
              </div>
            )}

            {/* Amount and Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-bold text-slate-900 text-xs">
                  {demandCategory === 'monthly_payment' ? 'Amount per Month ($)' : 'Total Amount ($)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="50"
                  value={demandAmount}
                  onChange={(e) => setDemandAmount(e.target.value)}
                  className="bg-white mt-1 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <Label className="font-bold text-slate-900 text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={demandDueDate}
                  onChange={(e) => setDemandDueDate(e.target.value)}
                  className="bg-white mt-1 text-sm"
                  required
                />
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <Label className="text-xs text-slate-600">Additional Instructions / Notes (Optional)</Label>
              <Input
                placeholder="e.g. Please pay before the monthly society meeting."
                value={demandDescription}
                onChange={(e) => setDemandDescription(e.target.value)}
                className="bg-white mt-1 text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenDemand(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isGenerating}
                className="cursor-pointer bg-emerald-700 hover:bg-emerald-800"
              >
                {isGenerating ? 'Generating...' : 'Assign & Send Pending Dues'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG 2: MANUAL RECORD TRANSACTION
          ========================================================================= */}
      <Dialog open={openSingle} onOpenChange={setOpenSingle}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Manual Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-3 pt-2">
            <div>
              <Label>Member</Label>
              <select className="w-full border border-slate-200 rounded-md p-2 bg-white text-sm mt-1" {...register('member_id')}>
                <option value="">Select member</option>
                {users?.data
                  ?.filter((u) => u.role?.name === 'member')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (ID: {u.member_profile?.member_no || 'No ID'})
                    </option>
                  ))}
              </select>
              {errors.member_id && <p className="text-xs text-red-600 mt-1">{String(errors.member_id.message)}</p>}
            </div>

            <div>
              <Label>Type</Label>
              <select className="w-full border border-slate-200 rounded-md p-2 bg-white text-sm mt-1" {...register('type')}>
                {['payment', 'share', 'fdr', 'expense', 'other'].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} className="bg-white mt-1" />
              {errors.amount && <p className="text-xs text-red-600 mt-1">{String(errors.amount.message)}</p>}
            </div>

            <div>
              <Label>Transaction Date</Label>
              <Input type="date" {...register('transaction_date')} className="bg-white mt-1" />
              {errors.transaction_date && <p className="text-xs text-red-600 mt-1">{String(errors.transaction_date.message)}</p>}
            </div>

            <div>
              <Label>Description</Label>
              <Input placeholder="Optional notes" {...register('description')} className="bg-white mt-1" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenSingle(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">Save Transaction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
