'use client';
import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSelector } from '@/store/hooks';
import { canManageTransactions } from '@/lib/roles';
import {
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Transaction, User } from '@/types';
import {
  PlusCircle,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  CreditCard,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
  Wallet,
  ArrowRight,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TransactionsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const staff = canManageTransactions(user);
  const isSuperAdmin = user?.role?.name === 'super_admin';

  // Toggle View State: 'created' (Ledger Records) vs 'members_status' (Pending / Complete by Member)
  const [activeTab, setActiveTab] = useState<'created' | 'members_status'>('created');

  // Tab 1: Created Transactions Ledger State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [type, setType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab 2: Members Dues Matrix State
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'pending' | 'cleared'>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedMembers, setExpandedMembers] = useState<Record<number, boolean>>({});

  // RTK Query hooks
  const { data: pagedData, isLoading: loadingPaged } = useGetTransactionsQuery({
    page,
    per_page: perPage,
    type: type || undefined,
    status: statusFilter || undefined,
  });

  // Fetch broader dataset for member dues calculation and summary statistics
  const { data: allTrxData, isLoading: loadingAllTrx } = useGetTransactionsQuery({
    per_page: 2000,
  });

  const [createTransaction, { isLoading: isCreatingSingle }] = useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();
  const [deleteTransaction] = useDeleteTransactionMutation();
  const [generatePayments, { isLoading: isGenerating }] = useGeneratePaymentsMutation();
  const { data: usersData, isLoading: loadingUsers } = useGetUsersQuery(
    { per_page: 1000 },
    { skip: !staff }
  );
  const { data: settings } = useGetSettingsQuery();

  // Modals
  const [openSingle, setOpenSingle] = useState(false);
  const [openDemand, setOpenDemand] = useState(false);

  // Demand Generator Form State
  const [demandCategory, setDemandCategory] = useState<'monthly_payment' | 'one_time'>('monthly_payment');
  const [targetAllMembers, setTargetAllMembers] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [demandYear, setDemandYear] = useState<number>(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`
  ]);
  const [demandAmount, setDemandAmount] = useState<string>('2000');
  const [oneTimeTitle, setOneTimeTitle] = useState<string>('Annual General Meeting Fee');
  const [demandDueDate, setDemandDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [demandDescription, setDemandDescription] = useState<string>('');

  // Single Manual Transaction Form
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { member_id: '', type: 'payment', amount: '', transaction_date: '', description: '' },
  });

  const onSubmitSingle = async (values: any) => {
    try {
      await createTransaction({
        ...values,
        member_id: Number(values.member_id),
        amount: Number(values.amount),
        status: 'paid',
      }).unwrap();
      setOpenSingle(false);
      reset();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record transaction.');
    }
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

  const handleMarkAsPaid = async (trxId: number) => {
    if (!confirm('Mark this pending transaction as PAID and completed?')) return;
    try {
      await updateTransaction({
        id: trxId,
        body: { status: 'paid' },
      }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update transaction status.');
    }
  };

  const handleAssignToSpecificMember = (memberId: number) => {
    setSelectedMemberId(String(memberId));
    setTargetAllMembers(false);
    const settingsList = Array.isArray(settings) ? settings : (settings as any)?.data || [];
    const defaultFee = settingsList.find((s: any) => s.setting_key === 'payment_amount_1')?.setting_value || '2000';
    setDemandAmount(defaultFee);
    setOpenDemand(true);
  };

  const toggleExpandMember = (memberId: number) => {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // Pre-calculate member payment matrices
  const membersList = useMemo(() => {
    const rawUsers = usersData?.data || [];
    return rawUsers.filter((u) => u.role?.name === 'member');
  }, [usersData]);

  const allTransactions = useMemo(() => {
    return allTrxData?.data || [];
  }, [allTrxData]);

  // Member-wise calculation
  const memberMatrix = useMemo(() => {
    const trxByMember: Record<number, Transaction[]> = {};

    allTransactions.forEach((t) => {
      const mId = t.member?.id;
      if (mId) {
        if (!trxByMember[mId]) trxByMember[mId] = [];
        trxByMember[mId].push(t);
      }
    });

    return membersList.map((m) => {
      const memberTrx = trxByMember[m.id] || [];
      const pendingTrx = memberTrx.filter((t) => t.status === 'pending');
      const paidTrx = memberTrx.filter((t) => t.status === 'paid');

      const totalPendingAmount = pendingTrx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalPaidAmount = paidTrx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalDuesAssigned = totalPaidAmount + totalPendingAmount;
      const completionPercent = totalDuesAssigned > 0
        ? Math.round((totalPaidAmount / totalDuesAssigned) * 100)
        : 100;

      return {
        member: m,
        transactions: memberTrx,
        pendingTransactions: pendingTrx,
        paidTransactions: paidTrx,
        totalPendingAmount,
        totalPaidAmount,
        totalDuesAssigned,
        completionPercent,
        hasPending: pendingTrx.length > 0,
      };
    });
  }, [membersList, allTransactions]);

  // Summary figures across all members
  const stats = useMemo(() => {
    const totalCollected = memberMatrix.reduce((s, m) => s + m.totalPaidAmount, 0);
    const totalPending = memberMatrix.reduce((s, m) => s + m.totalPendingAmount, 0);
    const countWithPending = memberMatrix.filter((m) => m.hasPending).length;
    const countCleared = memberMatrix.filter((m) => !m.hasPending).length;
    const totalMembers = memberMatrix.length;

    return {
      totalCollected,
      totalPending,
      countWithPending,
      countCleared,
      totalMembers,
    };
  }, [memberMatrix]);

  // Filtered members for Tab 2
  const filteredMembers = useMemo(() => {
    return memberMatrix.filter((m) => {
      // Status filter
      if (memberStatusFilter === 'pending' && !m.hasPending) return false;
      if (memberStatusFilter === 'cleared' && m.hasPending) return false;

      // Search filter
      if (memberSearch.trim()) {
        const q = memberSearch.toLowerCase();
        const nameMatch = m.member.name.toLowerCase().includes(q);
        const idMatch = m.member.member_profile?.member_no?.toLowerCase().includes(q);
        const emailMatch = m.member.email.toLowerCase().includes(q);
        const phoneMatch = m.member.member_profile?.phone?.toLowerCase().includes(q);
        return nameMatch || idMatch || emailMatch || phoneMatch;
      }

      return true;
    });
  }, [memberMatrix, memberStatusFilter, memberSearch]);

  // Filtered transactions for Tab 1 search
  const displayedTransactions = useMemo(() => {
    const list = pagedData?.data || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((t) => {
      const noMatch = t.transaction_no.toLowerCase().includes(q);
      const nameMatch = t.member?.name?.toLowerCase().includes(q);
      const idMatch = t.member?.member_no?.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      const monthMatch = t.month?.toLowerCase().includes(q);
      return noMatch || nameMatch || idMatch || descMatch || monthMatch;
    });
  }, [pagedData, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage created ledger records, assign monthly & one-time dues, and track member payment statuses.
          </p>
        </div>
        {staff && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => {
                const settingsList = Array.isArray(settings) ? settings : (settings as any)?.data || [];
                const defaultFee = settingsList.find((s: any) => s.setting_key === 'payment_amount_1')?.setting_value || '2000';
                setDemandAmount(defaultFee);
                setTargetAllMembers(true);
                setSelectedMemberId('');
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

      {/* =========================================================================
          2 TOP-LEVEL TOGGLE PAGES / TABS
          ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('created')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'created'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Transactions & Created Records</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
            activeTab === 'created' ? 'bg-emerald-950/80 text-emerald-200' : 'bg-slate-200 text-slate-700'
          }`}>
            {pagedData?.meta?.total ?? pagedData?.data?.length ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('members_status')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'members_status'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Members Status (Pending & Complete)</span>
          {stats.countWithPending > 0 ? (
            <span className="bg-amber-500 text-white text-[11px] px-2 py-0.2 rounded-full font-bold animate-pulse">
              {stats.countWithPending} Pending
            </span>
          ) : (
            <span className="bg-emerald-600 text-white text-[11px] px-2 py-0.2 rounded-full font-bold">
              All Clear
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: TRANSACTIONS & CREATED RECORDS
          ========================================================================= */}
      {activeTab === 'created' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">Total Ledger Entries</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {pagedData?.meta?.total ?? pagedData?.data?.length ?? 0} Records
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 block">Page Total Value</span>
              <div className="text-xl font-bold text-emerald-900 mt-0.5">
                BDT {pagedData?.summary?.page_total?.toLocaleString() ?? 0}
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800 block">Outstanding Pending Total</span>
              <div className="text-xl font-bold text-amber-900 mt-0.5">
                BDT {stats.totalPending.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Filter Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search transaction no, member, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white text-sm h-9 border-slate-200"
              />
            </div>

            <div className="w-44">
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 bg-white text-xs h-9 text-slate-700 font-medium cursor-pointer"
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                {['payment', 'share', 'fdr', 'expense', 'other'].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>

            <div className="w-36">
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 bg-white text-xs h-9 text-slate-700 font-medium cursor-pointer"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid Only</option>
                <option value="pending">Pending Only</option>
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
                  {loadingPaged && (
                    <TableRow><TableCell colSpan={staff ? 8 : 7} className="text-center py-8 text-slate-500">Loading transactions...</TableCell></TableRow>
                  )}
                  {displayedTransactions.length === 0 && !loadingPaged && (
                    <TableRow><TableCell colSpan={staff ? 8 : 7} className="text-center py-8 text-slate-500">No transaction records found.</TableCell></TableRow>
                  )}
                  {displayedTransactions.map((t) => {
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
                          <Badge variant="secondary" className="capitalize text-[11px] font-semibold">
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
                          BDT {Number(t.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
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
                          <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                            {isPending && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsPaid(t.id)}
                                disabled={isUpdating}
                                className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 cursor-pointer text-white shadow-2xs"
                              >
                                <Check className="h-3 w-3 mr-1" /> Mark Paid
                              </Button>
                            )}
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
            meta={pagedData?.meta}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      )}

      {/* =========================================================================
          VIEW 2: MEMBERS PAYMENT STATUS (PENDING & COMPLETE MATRIX)
          ========================================================================= */}
      {activeTab === 'members_status' && (
        <div className="space-y-5">
          {/* Top 4 Summary Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Total Collected</span>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-bold text-emerald-800">
                  BDT {stats.totalCollected.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Completed contributions</p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Total Pending Dues</span>
                  <Clock className="h-4 w-4 text-amber-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-bold text-amber-950">
                  BDT {stats.totalPending.toLocaleString()}
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">Awaiting member payment</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Pending Members</span>
                  <UserX className="h-4 w-4 text-amber-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-bold text-slate-900">
                  {stats.countWithPending} <span className="text-xs font-normal text-slate-500">/ {stats.totalMembers}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Members with unpaid dues</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Cleared Members</span>
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.countCleared} <span className="text-xs font-normal text-slate-500">/ {stats.totalMembers}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">100% up to date</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setMemberStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  memberStatusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Members ({memberMatrix.length})
              </button>

              <button
                onClick={() => setMemberStatusFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  memberStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <Clock className="h-3 w-3" />
                Has Pending Dues ({stats.countWithPending})
              </button>

              <button
                onClick={() => setMemberStatusFilter('cleared')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  memberStatusFilter === 'cleared'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-100/80 text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                All Cleared ({stats.countCleared})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search by name, ID, phone, email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 bg-slate-50 text-xs h-9"
              />
            </div>
          </div>

          {/* Members List Matrix */}
          <div className="space-y-3">
            {loadingUsers || loadingAllTrx ? (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
                Loading member payment statuses...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
                No members found matching the selected filter.
              </div>
            ) : (
              filteredMembers.map((item) => {
                const { member, pendingTransactions, paidTransactions, totalPendingAmount, totalPaidAmount, hasPending, completionPercent } = item;
                const isExpanded = !!expandedMembers[member.id];

                return (
                  <div
                    key={member.id}
                    className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                      hasPending ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-emerald-200'
                    }`}
                  >
                    {/* Member Summary Header Row */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Member Identity */}
                      <div className="flex items-center gap-3.5 min-w-[280px]">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner ${
                          hasPending
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{member.name}</span>
                            {member.member_profile?.member_no && (
                              <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.2 rounded-md">
                                {member.member_profile.member_no}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                              hasPending
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}>
                              {hasPending ? `${pendingTransactions.length} Pending Due(s)` : 'All Cleared'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {member.member_profile?.phone && <span>{member.member_profile.phone}</span>}
                            <span>•</span>
                            <span>{member.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Progress and Amounts */}
                      <div className="flex-1 max-w-md space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-emerald-700">Paid: BDT {totalPaidAmount.toLocaleString()}</span>
                          {hasPending && (
                            <span className="text-amber-800 font-bold">
                              Due: BDT {totalPendingAmount.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-600 h-full transition-all duration-300"
                            style={{ width: `${completionPercent}%` }}
                          />
                          {hasPending && (
                            <div
                              className="bg-amber-400 h-full transition-all duration-300"
                              style={{ width: `${100 - completionPercent}%` }}
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          {completionPercent}% completed ({paidTransactions.length} paid, {pendingTransactions.length} pending)
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {staff && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignToSpecificMember(member.id)}
                            className="h-8 text-xs cursor-pointer border-slate-200 hover:bg-slate-100"
                          >
                            <CalendarCheck className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                            Assign Due
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpandMember(member.id)}
                          className="h-8 text-xs cursor-pointer text-slate-700 hover:bg-slate-100"
                        >
                          {isExpanded ? (
                            <>
                              Hide Details <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              View Details ({item.transactions.length}) <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-4">
                        {/* Section A: Pending Dues (if any) */}
                        {pendingTransactions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              Unpaid / Pending Payment Dues ({pendingTransactions.length})
                            </h4>

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {pendingTransactions.map((pt) => (
                                <div
                                  key={pt.id}
                                  className="p-3 bg-white rounded-lg border border-amber-300 shadow-2xs flex flex-col justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-slate-900">
                                        {pt.month ? pt.month : pt.description || 'Assigned Payment'}
                                      </span>
                                      <span className="font-mono text-xs font-bold text-amber-900">
                                        BDT {Number(pt.amount).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                                      <span>Due Date: {pt.transaction_date}</span>
                                      <span className="font-mono text-[10px] text-slate-400">{pt.transaction_no}</span>
                                    </div>
                                  </div>

                                  {staff && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkAsPaid(pt.id)}
                                      disabled={isUpdating}
                                      className="w-full h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                                    >
                                      <Check className="h-3 w-3 mr-1" /> Mark Received / Paid
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section B: Completed Transactions History */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Completed / Paid Records ({paidTransactions.length})
                          </h4>

                          {paidTransactions.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No completed payments recorded yet.</p>
                          ) : (
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow>
                                    <TableHead className="text-xs">Transaction No</TableHead>
                                    <TableHead className="text-xs">Month / Description</TableHead>
                                    <TableHead className="text-xs">Amount</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                    <TableHead className="text-xs text-right">Payment Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paidTransactions.map((paid) => (
                                    <TableRow key={paid.id} className="text-xs">
                                      <TableCell className="font-mono font-medium">{paid.transaction_no}</TableCell>
                                      <TableCell>{paid.month || paid.description || paid.type}</TableCell>
                                      <TableCell className="font-bold text-slate-900">BDT {Number(paid.amount).toLocaleString()}</TableCell>
                                      <TableCell>
                                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                                          Paid
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right text-slate-500">{paid.transaction_date}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
                    type="radio"
                    name="target_group"
                    checked={targetAllMembers}
                    onChange={() => {
                      setTargetAllMembers(true);
                      setSelectedMemberId('');
                    }}
                    className="text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="text-xs font-semibold text-slate-900">
                    All Active Members ({membersList.length} members)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="target_group"
                    checked={!targetAllMembers}
                    onChange={() => setTargetAllMembers(false)}
                    className="text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="text-xs font-semibold text-slate-900">Specific Single Member</span>
                </label>

                {!targetAllMembers && (
                  <select
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-xs mt-2"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    required={!targetAllMembers}
                  >
                    <option value="">-- Choose a member --</option>
                    {membersList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (ID: {m.member_profile?.member_no || 'Unassigned'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* MONTHLY PAYMENT: Month Selector Grid */}
            {demandCategory === 'monthly_payment' && (
              <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-900 text-xs">Select Month(s) for Subscription</Label>
                  <div className="flex items-center gap-2">
                    <select
                      className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white font-semibold"
                      value={demandYear}
                      onChange={(e) => {
                        const newYr = Number(e.target.value);
                        setDemandYear(newYr);
                        setSelectedMonths([`${MONTH_NAMES[new Date().getMonth()]} ${newYr}`]);
                      }}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSelectAllMonths}
                      className="text-[11px] text-emerald-800 font-bold hover:underline cursor-pointer"
                    >
                      All 12 Months
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearMonths}
                      className="text-[11px] text-rose-700 font-bold hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {MONTH_NAMES.map((m) => {
                    const monthKey = `${m} ${demandYear}`;
                    const isSelected = selectedMonths.includes(monthKey);

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleToggleMonth(monthKey)}
                        className={`p-2 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-emerald-800">
                  A separate pending payment transaction of <b>BDT {demandAmount}</b> will be generated for each selected month per member.
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
                  {demandCategory === 'monthly_payment' ? 'Amount per Month (BDT)' : 'Total Amount (BDT)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="2000"
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
                {membersList.map((u) => (
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
              <Label>Amount (BDT)</Label>
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
              <Input placeholder="Optional notes / transaction details" {...register('description')} className="bg-white mt-1" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenSingle(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingSingle} className="cursor-pointer bg-emerald-700 hover:bg-emerald-800">
                {isCreatingSingle ? 'Saving...' : 'Save Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
