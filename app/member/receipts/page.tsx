'use client';
import React, { useState, useMemo } from 'react';
import { useGetReceiptsQuery, useGetTransactionsQuery } from '@/lib/api';
import { ReceiptPrintArea } from '@/components/receipt-print';
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Receipt, Transaction } from '@/types';
import {
  Printer,
  Receipt as ReceiptIcon,
  Users,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Wallet,
  FileCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  FileText,
} from 'lucide-react';

import { useAppSelector } from '@/store/hooks';

export default function MemberReceiptsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: receiptsData, isLoading: loadingReceipts } = useGetReceiptsQuery(undefined, { pollingInterval: 3000 });
  const { data: trxData, isLoading: loadingTransactions } = useGetTransactionsQuery(undefined, { pollingInterval: 3000 });

  const [activeTab, setActiveTab] = useState<'created' | 'all'>('created');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  // Lightbox Modal State
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

  const rawReceipts: Receipt[] = useMemo(() => receiptsData?.data || [], [receiptsData]);
  const rawTransactions: Transaction[] = useMemo(() => trxData?.data || [], [trxData]);

  // Set of pending months to detect partial payments
  const pendingMonthsSet = useMemo(() => {
    const s = new Set<string>();
    rawTransactions.forEach((t) => {
      if (t.status === 'pending' && t.month) {
        s.add(t.month.trim().toLowerCase());
      }
    });
    return s;
  }, [rawTransactions]);

  const viewReceiptPhoto = (
    url: string,
    title: string,
    date?: string,
    isRejected?: boolean,
    rejectionReason?: string | null
  ) => {
    setPhotoModalUrl(url);
    setPhotoModalTitle(title);
    setPhotoModalDate(date || '');
    setPhotoModalIsRejected(!!isRejected);
    setPhotoModalRejectionReason(rejectionReason || null);
    setOpenPhotoModal(true);
  };

  const handlePrint = (
    r?: Receipt | null,
    fallbackTrx?: Transaction | null,
    partialMeta?: {
      isPartial?: boolean;
      totalPaidAmount?: number;
      previousPaidAmount?: number;
      totalDueAmount?: number;
      totalAssignedAmount?: number;
      previousReferences?: (string | { ref: string; amount?: number; date?: string })[];
    }
  ) => {
    let baseReceipt: Receipt;

    if (r) {
      const linkedTrx = fallbackTrx || (r.transaction?.id ? r.transaction : rawTransactions.find((t) => t.id === (r as any).transaction_id || t.receipt?.id === r.id));
      baseReceipt = {
        ...r,
        transaction: linkedTrx || r.transaction,
      };
    } else if (fallbackTrx) {
      baseReceipt = {
        id: fallbackTrx.id,
        receipt_no: fallbackTrx.receipt?.receipt_no || `RCT-${fallbackTrx.transaction_no}`,
        receipt_date: fallbackTrx.transaction_date || new Date().toISOString().split('T')[0],
        amount: Number(fallbackTrx.amount || 0),
        payment_method: (fallbackTrx.member_payment_method as any) || 'cash',
        member: fallbackTrx.member || (user ? { id: user.id, name: user.name, member_no: user.member_profile?.member_no } : undefined),
        transaction: fallbackTrx,
        created_at: fallbackTrx.created_at,
        updated_at: fallbackTrx.updated_at,
      };
    } else {
      return;
    }

    const desc = baseReceipt.transaction?.description || fallbackTrx?.description || '';
    const isPartialFromDesc = /partial payment/i.test(desc) || /remaining due/i.test(desc);
    const isPartial = partialMeta?.isPartial ?? isPartialFromDesc;

    // Parse partial amounts from description if available (e.g. "BDT 1000 of BDT 2000", "(Due: BDT 1000)")
    let parsedAssigned = 0;
    let parsedDue = 0;
    const matchTotal = desc.match(/of\s+BDT\s+([\d,]+)/i);
    if (matchTotal) {
      parsedAssigned = Number(matchTotal[1].replace(/,/g, ''));
    }
    const matchDue = desc.match(/Due:\s*BDT\s*([\d,]+)/i);
    if (matchDue) {
      parsedDue = Number(matchDue[1].replace(/,/g, ''));
    }

    const installmentAmount = Number(baseReceipt.amount || 0);
    const totalPaid = partialMeta?.totalPaidAmount ?? (parsedAssigned && parsedDue ? parsedAssigned - parsedDue : installmentAmount);
    const totalDue = partialMeta?.totalDueAmount ?? parsedDue;
    const totalAssigned = partialMeta?.totalAssignedAmount ?? (parsedAssigned || (totalPaid + totalDue));
    const previousPaid = partialMeta?.previousPaidAmount ?? (totalPaid > installmentAmount ? totalPaid - installmentAmount : 0);

    let previousReferences: (string | { ref: string; amount?: number; date?: string })[] = partialMeta?.previousReferences || [];
    if (previousReferences.length === 0 && desc) {
      const refMatches = Array.from(desc.matchAll(/Ref:\s*([^|\n-]+)/gi)).map((m) => m[1].trim()).filter(Boolean);
      if (refMatches.length > 1) {
        previousReferences = refMatches.slice(0, -1);
      }
    }

    const enrichedReceipt: Receipt & {
      isPartial?: boolean;
      totalPaidAmount?: number;
      previousPaidAmount?: number;
      totalDueAmount?: number;
      totalAssignedAmount?: number;
      installmentAmount?: number;
      previousReferences?: (string | { ref: string; amount?: number; date?: string })[];
    } = {
      ...baseReceipt,
      isPartial,
      totalPaidAmount: totalPaid,
      previousPaidAmount: previousPaid,
      totalDueAmount: totalDue,
      totalAssignedAmount: totalAssigned,
      installmentAmount: installmentAmount,
      previousReferences: previousReferences,
    };

    setPrintReceipt(enrichedReceipt as any);

    setTimeout(() => {
      window.print();
      setPrintReceipt(null);
    }, 150);
  };

  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Group member transactions and receipts by Created Demand Campaign / Batch
  const createdDemandGroups = useMemo(() => {
    const groups: Record<string, {
      key: string;
      title: string;
      category: string;
      month?: string;
      dueDate: string;
      created_at: string;
      transactions: Transaction[];
      receipts: Receipt[];
      totalDemandAmount: number;
      totalPaidAmount: number;
      isFullyPaid: boolean;
      isPartial: boolean;
      hasReceiptSlip: boolean;
      status: 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected';
    }> = {};

    rawTransactions.forEach((t) => {
      let groupKey = '';
      if (t.payment_category === 'monthly_payment' && t.month) {
        groupKey = `monthly_${t.month}`;
      } else if (t.payment_category === 'one_time') {
        groupKey = `onetime_${t.description || t.type}_${t.transaction_date}`;
      } else if (t.month) {
        groupKey = `monthly_${t.month}`;
      } else {
        groupKey = `record_${t.type}_${t.description || ''}_${t.transaction_date}_${(t.created_at || '').slice(0, 10)}`;
      }

      if (!groups[groupKey]) {
        let title = t.description || 'Society Payment Demand';
        if (t.payment_category === 'monthly_payment' && t.month) {
          title = `Monthly Subscription (${t.month})`;
        } else if (t.month) {
          title = `Subscription for ${t.month}`;
        } else if (t.payment_category === 'one_time' && t.description) {
          title = t.description;
        }

        groups[groupKey] = {
          key: groupKey,
          title,
          category: t.payment_category || t.type,
          month: t.month,
          dueDate: t.transaction_date,
          created_at: t.created_at || '',
          transactions: [],
          receipts: [],
          totalDemandAmount: 0,
          totalPaidAmount: 0,
          isFullyPaid: false,
          isPartial: false,
          hasReceiptSlip: false,
          status: 'pending',
        };
      }

      groups[groupKey].transactions.push(t);
      const linkedReceipt = rawReceipts.find(
        (r) => r.transaction?.id === t.id || (r as any).transaction_id === t.id || (t.receipt && r.id === t.receipt.id)
      );
      if (linkedReceipt && !groups[groupKey].receipts.some((r) => r.id === linkedReceipt.id)) {
        groups[groupKey].receipts.push(linkedReceipt);
      }
    });

    // Compute status and totals for each group
    return Object.values(groups).map((g) => {
      const activeTrx = g.transactions.filter((t) => t.status !== 'rejected');
      const targetList = activeTrx.length > 0 ? activeTrx : g.transactions;

      const totalPaid = g.transactions
        .filter((t) => t.status === 'paid')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalDue = targetList
        .filter((t) => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const pendingTrx = targetList.filter((t) => t.status === 'pending');
      const paidTrx = targetList.filter((t) => t.status === 'paid');
      const rejectedTrx = g.transactions.filter((t) => t.status === 'rejected');

      const isPartial = (paidTrx.length > 0 && pendingTrx.length > 0) ||
        targetList.some((t) => t.description && /partial payment/i.test(t.description));

      const isFullyPaid = pendingTrx.length === 0 && paidTrx.length > 0;
      const hasReceiptSlip = targetList.some((t) => !!t.receipt_photo);

      let status: 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected' = 'pending';
      if (isFullyPaid) {
        status = 'paid';
      } else if (isPartial) {
        status = 'partial';
      } else if (pendingTrx.some((t) => !!t.receipt_photo)) {
        status = 'received_slip';
      } else if (pendingTrx.length > 0) {
        status = 'pending';
      } else if (rejectedTrx.length > 0) {
        status = 'rejected';
      }

      const totalDemand = totalPaid + totalDue;

      return {
        ...g,
        totalDemandAmount: totalDemand,
        totalPaidAmount: totalPaid,
        totalDueAmount: totalDue,
        isFullyPaid,
        isPartial,
        hasReceiptSlip,
        status,
      };
    }).sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  }, [rawTransactions, rawReceipts]);

  const filteredCreatedGroups = useMemo(() => {
    return createdDemandGroups.filter((g) => {
      if (statusFilter === 'paid' && (g.status !== 'paid' || g.isPartial)) return false;
      if (statusFilter === 'partial' && !g.isPartial) return false;
      if (statusFilter === 'received_slip' && g.status !== 'received_slip') return false;
      if (statusFilter === 'pending' && (g.status !== 'pending' || g.isPartial || g.hasReceiptSlip)) return false;
      if (statusFilter === 'rejected' && g.status !== 'rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = g.title.toLowerCase().includes(q);
        const monthMatch = g.month?.toLowerCase().includes(q);
        const catMatch = g.category.toLowerCase().includes(q);
        const receiptMatch = g.receipts.some((r) => r.receipt_no.toLowerCase().includes(q));
        const trxMatch = g.transactions.some((t) => t.transaction_no.toLowerCase().includes(q));
        return titleMatch || monthMatch || catMatch || receiptMatch || trxMatch;
      }

      return true;
    });
  }, [createdDemandGroups, statusFilter, searchQuery]);

  return (
    <>
      <div className={printReceipt ? 'space-y-5 print:hidden' : 'space-y-5'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Payment Receipts</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Official proof of payment receipts and verification records for your subscription dues and contributions.
            </p>
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('created')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'created'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ReceiptIcon className="h-3.5 w-3.5 text-emerald-700" />
                  Demand Batches Created ({createdDemandGroups.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-700" />
                  All Issued Receipts ({rawReceipts.length})
                </button>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Cleared
                </button>
                <button
                  onClick={() => setStatusFilter('partial')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'partial'
                      ? 'bg-purple-700 text-white'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <Wallet className="h-3 w-3" />
                  Partial
                </button>
                <button
                  onClick={() => setStatusFilter('received_slip')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'received_slip'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <FileCheck className="h-3 w-3" />
                  Received Slip
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  Due
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search transaction, receipt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 text-xs h-9"
              />
            </div>
          </div>

          {/* VIEW 1: CREATED DEMAND BATCHES (COLLAPSED UNDER TRANSACTION CREATED) */}
          {activeTab === 'created' && (
            <div className="space-y-4">
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ReceiptIcon className="h-5 w-5 text-emerald-700" />
                      <span>Transactions Created &amp; Billing Records ({filteredCreatedGroups.length})</span>
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click any transaction demand to view your payment breakdown, submitted slips, and official receipts.
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <Table className="table-fixed w-full">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="text-xs font-bold text-slate-700">
                        <TableHead className="w-[30%] px-3">Transaction / Demand Name</TableHead>
                        <TableHead className="w-[15%] px-3">Due Date</TableHead>
                        <TableHead className="w-[18%] px-3">Amount &amp; Payment</TableHead>
                        <TableHead className="w-[17%] px-3">Status</TableHead>
                        <TableHead className="w-[20%] px-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loadingTransactions && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                            Loading billing records...
                          </TableCell>
                        </TableRow>
                      )}

                      {!loadingTransactions && filteredCreatedGroups.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                            <ReceiptIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                            No transaction billing records found.
                          </TableCell>
                        </TableRow>
                      )}

                      {filteredCreatedGroups.map((group) => {
                        const isExpanded = !!expandedGroups[group.key];
                        const latestReceipt = group.receipts[0];

                        return (
                          <React.Fragment key={group.key}>
                            <TableRow className="hover:bg-slate-50/70 transition-colors">
                              <TableCell className="px-3 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 text-sm truncate" title={group.title}>
                                    {group.title}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                                      {group.category.replace(/_/g, ' ')}
                                    </Badge>
                                    {group.month && (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        Month: {group.month}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-3 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                                {group.dueDate}
                              </TableCell>

                              <TableCell className="px-3 py-3.5">
                                {group.isPartial ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-purple-950 text-sm">
                                      BDT {Number(group.totalPaidAmount).toLocaleString()}{' '}
                                      <span className="text-[10px] text-emerald-700 font-semibold">(Paid)</span>
                                    </span>
                                    <span className="text-[11px] text-amber-800 font-medium">
                                      Due: BDT {Number(group.totalDemandAmount).toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-slate-900 text-sm">
                                    BDT {Number(group.totalDemandAmount || group.totalPaidAmount).toLocaleString()}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="px-3 py-3.5">
                                {group.status === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    Paid
                                  </span>
                                ) : group.status === 'partial' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
                                    <Wallet className="h-3.5 w-3.5 text-purple-600" />
                                    Partially Paid
                                  </span>
                                ) : group.status === 'received_slip' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs">
                                    <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                                    Received Slip
                                  </span>
                                ) : group.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300 shadow-2xs">
                                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                                    Slip Rejected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                    Due Pending
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="px-3 py-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {latestReceipt && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePrint(latestReceipt, null, {
                                        isPartial: group.isPartial,
                                        totalPaidAmount: group.totalPaidAmount,
                                        totalDueAmount: group.totalDueAmount ?? 0,
                                        totalAssignedAmount: group.totalDemandAmount,
                                      })}
                                      className="h-8 gap-1.5 text-xs cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                                      title="Print official receipt"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-emerald-700" /> Print
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleExpandGroup(group.key)}
                                    className="h-8 text-xs cursor-pointer border-slate-200 hover:bg-slate-100"
                                  >
                                    {isExpanded ? 'Hide' : 'Details'}
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expandable Details Sub-Container (Collapsed by default) */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                <TableCell colSpan={5} className="p-4">
                                  <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <ReceiptIcon className="h-4 w-4 text-emerald-700" />
                                        Billing &amp; Receipts Details for {group.title}
                                      </h4>
                                      {group.receipts.length > 0 && (
                                        <span className="text-xs font-bold text-emerald-800">
                                          {group.receipts.length} Official Receipt{group.receipts.length !== 1 ? 's' : ''} Issued
                                        </span>
                                      )}
                                    </div>

                                    <div className="border border-slate-100 rounded-lg overflow-x-auto">
                                      <Table className="w-full">
                                        <TableHeader className="bg-slate-50">
                                          <TableRow className="text-xs">
                                            <TableHead className="text-center">Record Type</TableHead>
                                            <TableHead className="text-center">Receipt / Trx No</TableHead>
                                            <TableHead className="text-center">Date</TableHead>
                                            <TableHead className="text-center">Amount</TableHead>
                                            <TableHead className="text-center">Payment Slip / Proof</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-center">Action</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {group.transactions.map((trx) => {
                                            const isRemainingDue = (trx.description && /remaining due/i.test(trx.description)) || (trx.description && /partial payment/i.test(trx.description));
                                            const isPartialPaid = trx.status === 'paid' && (
                                              (trx.description && (/partial payment/i.test(trx.description) || /remaining due/i.test(trx.description))) ||
                                              (trx.month && pendingMonthsSet.has(trx.month.trim().toLowerCase()))
                                            );
                                            const isPartialPending = trx.status === 'pending' && isRemainingDue;
                                            const isPaid = trx.status === 'paid';
                                            const isRejected = trx.status === 'rejected';
                                            const isSlipPending = trx.status === 'pending' && !!trx.receipt_photo;
                                            const isPurePending = trx.status === 'pending' && !trx.receipt_photo;

                                            const linkedReceipt = rawReceipts.find(
                                              (r) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id || (trx.receipt && r.id === trx.receipt.id)
                                            ) || trx.receipt;

                                            return (
                                              <TableRow key={trx.id} className="text-xs">
                                                <TableCell className="p-3 text-center align-middle">
                                                  <Badge variant="outline" className="capitalize text-[10px]">
                                                    {isPaid ? 'Cleared Payment' : isPartialPending ? 'Remaining Balance' : 'Payment Due'}
                                                  </Badge>
                                                </TableCell>

                                                <TableCell className="p-3 text-center align-middle font-mono text-slate-700">
                                                  {linkedReceipt ? (
                                                    <div className="flex flex-col items-center">
                                                      <span className="font-bold text-emerald-900">{linkedReceipt.receipt_no}</span>
                                                      <span className="text-[10px] text-slate-400">Trx: {trx.transaction_no}</span>
                                                    </div>
                                                  ) : (
                                                    trx.transaction_no
                                                  )}
                                                </TableCell>

                                                <TableCell className="p-3 text-center align-middle text-slate-600 whitespace-nowrap">
                                                  {trx.transaction_date}
                                                </TableCell>

                                                <TableCell className="p-3 text-center align-middle font-bold text-slate-900">
                                                  BDT {Number(trx.amount).toLocaleString()}
                                                </TableCell>

                                                <TableCell className="p-3 text-center align-middle">
                                                  {trx.receipt_photo ? (
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                      <ReceiptSlipThumbnail
                                                        photoUrl={trx.receipt_photo}
                                                        title={`${trx.month || trx.description || 'Receipt'}`}
                                                        date={trx.receipt_photo_uploaded_at ? `Uploaded: ${trx.receipt_photo_uploaded_at}` : undefined}
                                                        isRejected={isRejected}
                                                        isPartial={Boolean(isPartialPaid || isPartialPending)}
                                                        rejectionReason={trx.rejection_reason}
                                                        onClick={() => viewReceiptPhoto(
                                                          trx.receipt_photo!,
                                                          `${trx.month || trx.description || 'Receipt'}`,
                                                          trx.receipt_photo_uploaded_at,
                                                          isRejected,
                                                          trx.rejection_reason
                                                        )}
                                                      />
                                                      {trx.member_paid_amount && (
                                                        <span className={`text-[10px] font-semibold ${isPartialPaid ? 'text-purple-800' : 'text-emerald-800'}`}>
                                                          Proof: BDT {Number(trx.member_paid_amount).toLocaleString()}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="text-[11px] text-slate-400 italic">No slip uploaded</span>
                                                  )}
                                                </TableCell>

                                                <TableCell className="p-3 text-center align-middle">
                                                  {isPartialPaid ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                                                      <Wallet className="h-3 w-3 text-purple-600" /> Partially Paid
                                                    </span>
                                                  ) : isPaid ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                                                    </span>
                                                  ) : isSlipPending ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                                                      <FileCheck className="h-3 w-3 text-blue-600" /> Slip Submitted
                                                    </span>
                                                  ) : isRejected ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300">
                                                      <XCircle className="h-3 w-3 text-red-600" /> Slip Rejected
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                                      <Clock className="h-3 w-3 text-amber-600" /> Due Pending
                                                    </span>
                                                  )}
                                                </TableCell>

                                                <TableCell className="p-3 text-center align-middle">
                                                  {linkedReceipt ? (
                                                    (() => {
                                                      // Calculate progression up to this transaction
                                                      const paidHistory = group.transactions
                                                        .filter((t) => t.status === 'paid')
                                                        .sort((a, b) => {
                                                          const dateA = a.updated_at || a.created_at || a.transaction_date || '';
                                                          const dateB = b.updated_at || b.created_at || b.transaction_date || '';
                                                          return dateA.localeCompare(dateB) || (a.id || 0) - (b.id || 0);
                                                        });

                                                      const currIndex = paidHistory.findIndex((t) => t.id === trx.id);
                                                      let cumulativeUpToThis = 0;
                                                      let prevUpToThis = 0;
                                                      if (currIndex >= 0) {
                                                        for (let i = 0; i <= currIndex; i++) {
                                                          cumulativeUpToThis += Number(paidHistory[i].amount || 0);
                                                          if (i < currIndex) {
                                                            prevUpToThis += Number(paidHistory[i].amount || 0);
                                                          }
                                                        }
                                                      } else {
                                                        cumulativeUpToThis = Number(trx.amount || 0);
                                                      }

                                                      const totalTarget = group.totalDemandAmount;
                                                      const dueRemainingAfterThis = Math.max(0, totalTarget - cumulativeUpToThis);

                                                      const prevTrxList = currIndex >= 0 ? paidHistory.slice(0, currIndex) : [];
                                                      const prevRefs = prevTrxList.map((t) => {
                                                        let ref = t.member_trx_reference || '';
                                                        if (!ref && t.description) {
                                                          const m = t.description.match(/Ref:\s*([^|\n-]+)/i);
                                                          if (m) ref = m[1].trim();
                                                        }
                                                        return {
                                                          ref: ref || t.transaction_no,
                                                          amount: Number(t.amount || 0),
                                                          date: t.transaction_date || '',
                                                        };
                                                      }).filter((item) => Boolean(item.ref));

                                                      return (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() => handlePrint(linkedReceipt, trx, {
                                                            isPartial: Boolean(group.isPartial || isPartialPaid),
                                                            totalPaidAmount: cumulativeUpToThis,
                                                            previousPaidAmount: prevUpToThis,
                                                            totalDueAmount: dueRemainingAfterThis,
                                                            totalAssignedAmount: totalTarget,
                                                            previousReferences: prevRefs,
                                                          })}
                                                          className="h-7 px-2.5 text-xs cursor-pointer border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                                                        >
                                                          <Printer className="h-3.5 w-3.5 mr-1 text-emerald-700" /> Print
                                                        </Button>
                                                      );
                                                    })()
                                                  ) : (
                                                    <span className="text-[10px] text-slate-400 italic">No receipt yet</span>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* VIEW 2: ALL ISSUED RECEIPTS TABLE */}
          {activeTab === 'all' && (
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Verified Receipts ({rawReceipts.length})</CardTitle>
                  <p className="text-xs text-slate-500">You can print or download PDF receipts for your personal records.</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="text-xs font-bold text-slate-700">
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Receipt Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Cleared Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingReceipts && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading receipts...</TableCell></TableRow>
                    )}
                    {rawReceipts.length === 0 && !loadingReceipts && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No receipts issued yet.</TableCell></TableRow>
                    )}
                    {rawReceipts.map((r) => {
                      const isPartial = r.transaction?.description && (/partial payment/i.test(r.transaction.description) || /remaining due/i.test(r.transaction.description));

                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-emerald-900">
                            <div className="flex flex-col items-start">
                              <span>{r.receipt_no}</span>
                              {isPartial && (
                                <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 mt-0.5">
                                  Partial Installment
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{r.receipt_date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-[11px] font-medium">
                              {r.payment_method?.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 text-sm">BDT {Number(r.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrint(r)}
                              className="h-8 gap-1.5 text-xs cursor-pointer border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              <Printer className="h-3.5 w-3.5" /> Print Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox / Proof Magnifier Modal */}
      {openPhotoModal && (
        <Dialog open={openPhotoModal} onOpenChange={setOpenPhotoModal}>
          <DialogContent className="sm:max-w-2xl bg-slate-950/95 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-base text-slate-100 flex items-center justify-between">
                <span>{photoModalTitle}</span>
                {photoModalIsRejected && (
                  <span className="text-xs text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                    Declined Proof Slip
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="p-2 flex flex-col items-center justify-center gap-3">
              <div className="relative w-full max-h-[70vh] flex items-center justify-center bg-black/40 rounded-lg p-1 border border-slate-800 overflow-hidden">
                <MagnifiableModalImage
                  src={photoModalUrl}
                  alt={photoModalTitle}
                  className="max-h-[65vh] w-auto object-contain rounded"
                />
              </div>

              {photoModalDate && (
                <p className="text-xs text-slate-400">
                  Uploaded: <span className="text-slate-200">{photoModalDate}</span>
                </p>
              )}

              {photoModalIsRejected && photoModalRejectionReason && (
                <div className="w-full bg-red-950/60 border border-red-800/80 p-3 rounded-lg text-xs text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-red-300">
                    <XCircle className="h-4 w-4 text-red-400" /> Reason for Rejection from Admin:
                  </div>
                  <p className="text-slate-200 italic pl-5">"{photoModalRejectionReason}"</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between">
              <span className="text-[11px] text-slate-400">
                Hover / click to inspect slip details
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenPhotoModal(false)}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Official Print Receipt Template */}
      {printReceipt && <ReceiptPrintArea receipt={printReceipt} />}
    </>
  );
}
