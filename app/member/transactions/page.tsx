'use client';
import React, { useState, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useUploadReceiptPhotoMutation,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import { ReceiptPrintArea } from '@/components/receipt-print';
import type { Transaction, Receipt } from '@/types';
import {
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  AlertCircle,
  Camera,
  Eye,
  FileImage,
  ExternalLink,
  MessageSquare,
  Hash,
  UploadCloud,
  FileCheck,
  XCircle,
  CheckCircle2,
  X,
  CreditCard,
  Wallet,
  ChevronDown,
  ChevronUp,
  Receipt as ReceiptIcon,
  Search,
  FileText,
  Printer,
} from 'lucide-react';

export default function MemberTransactionsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: trx, isLoading: loadingTrx } = useGetTransactionsQuery(undefined, { pollingInterval: 3000 });
  const { data: receiptsData } = useGetReceiptsQuery(undefined, { pollingInterval: 3000 });
  const [uploadReceiptPhoto, { isLoading: isUploadingProof }] = useUploadReceiptPhotoMutation();

  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  // Lightbox Modal State
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

  // Upload Modal State
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [uploadingTrx, setUploadingTrx] = useState<Transaction | null>(null);
  const [slipPhotoData, setSlipPhotoData] = useState<string | null>(null);
  const [slipPaidAmount, setSlipPaidAmount] = useState<string>('');
  const [slipPaymentMethod, setSlipPaymentMethod] = useState<'mobile_banking' | 'bank' | 'cash' | 'other'>('mobile_banking');
  const [slipTrxReference, setSlipTrxReference] = useState<string>('');
  const [slipComment, setSlipComment] = useState<string>('');
  const [viewingRejectedTrx, setViewingRejectedTrx] = useState<Transaction | null>(null);

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
      previousReferences?: string[];
    }
  ) => {
    let baseReceipt: Receipt;

    if (r) {
      const rawTransactions: Transaction[] = trx?.data || [];
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

    let previousReferences: string[] = partialMeta?.previousReferences || [];
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

  const openMemberUploadModal = (t: Transaction) => {
    if (t.receipt_photo) {
      alert('This payment proof has already been submitted and is locked for admin verification. You cannot edit it.');
      return;
    }

    setUploadingTrx(t);
    setSlipPhotoData(t.receipt_photo || null);
    setSlipPaidAmount(
      t.member_paid_amount !== null && t.member_paid_amount !== undefined
        ? String(t.member_paid_amount)
        : String(t.amount)
    );
    setSlipPaymentMethod((t.member_payment_method as any) || 'mobile_banking');
    setSlipTrxReference(t.member_trx_reference || '');
    setSlipComment(t.member_comment || '');
    setOpenUploadModal(true);
  };

  const handleSlipFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Photo file size must be under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 1400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setSlipPhotoData(compressed);
        } else {
          setSlipPhotoData(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onSubmitMemberProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingTrx) return;
    const numAmount = Number(slipPaidAmount);
    const maxAllowed = Number(uploadingTrx.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid paid amount.');
      return;
    }
    if (numAmount > maxAllowed) {
      alert(`Paid amount cannot exceed the required remaining due of BDT ${maxAllowed.toLocaleString()}.`);
      return;
    }
    if (!slipPhotoData) {
      alert('Please select or capture a receipt photo / screenshot slip.');
      return;
    }

    setOpenConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!uploadingTrx) return;
    const numAmount = Number(slipPaidAmount);

    try {
      await uploadReceiptPhoto({
        id: uploadingTrx.id,
        body: {
          photo_data: slipPhotoData,
          paid_amount: numAmount,
          trx_reference: slipTrxReference || undefined,
          payment_method: slipPaymentMethod,
          comment: slipComment || undefined,
        },
      }).unwrap();

      alert('Payment proof submitted successfully! Your submission is now locked for Admin verification.');
      setOpenConfirmModal(false);
      setOpenUploadModal(false);
      setUploadingTrx(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit payment proof.');
    }
  };

  // View Mode & Filtering States
  const [activeTab, setActiveTab] = useState<'created' | 'all'>('created');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const pendingTransactions = trx?.data.filter((t) => t.status === 'pending') ?? [];
  const pendingAmount = pendingTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Set of pending months to detect partial payments
  const pendingMonthsSet = useMemo(() => {
    const s = new Set<string>();
    trx?.data.forEach((t) => {
      if (t.status === 'pending' && t.month) {
        s.add(t.month.trim().toLowerCase());
      }
    });
    return s;
  }, [trx]);

  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Group member transactions by Demand Campaign / Batch
  const createdDemandGroups = useMemo(() => {
    const groups: Record<string, {
      key: string;
      title: string;
      category: string;
      month?: string;
      dueDate: string;
      created_at: string;
      transactions: Transaction[];
      totalDemandAmount: number;
      totalPaidAmount: number;
      totalDueAmount?: number;
      isFullyPaid: boolean;
      isPartial: boolean;
      hasReceiptSlip: boolean;
      status: 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected';
    }> = {};

    (trx?.data || []).forEach((t) => {
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
          totalDemandAmount: 0,
          totalPaidAmount: 0,
          isFullyPaid: false,
          isPartial: false,
          hasReceiptSlip: false,
          status: 'pending',
        };
      }

      groups[groupKey].transactions.push(t);
    });

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
  }, [trx]);

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
        const trxMatch = g.transactions.some((t) => t.transaction_no.toLowerCase().includes(q));
        return titleMatch || monthMatch || catMatch || trxMatch;
      }

      return true;
    });
  }, [createdDemandGroups, statusFilter, searchQuery]);

  return (
    <>
      <div className={printReceipt ? 'space-y-5 print:hidden' : 'space-y-5'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Transactions &amp; Dues</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View all assigned society subscription dues, record history, and upload payment proof slips.
          </p>
        </div>
        {pendingTransactions.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 px-3.5 py-1.5 rounded-xl text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Outstanding Dues: BDT {pendingAmount.toLocaleString()} ({pendingTransactions.length} Pending)</span>
          </div>
        )}
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
                All Transactions History ({trx?.data?.length || 0})
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
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                <XCircle className="h-3 w-3" />
                Rejected
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search transaction, demand..."
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
                    Click any transaction demand to view your payment breakdown, submitted slips, and upload payment details.
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
                    {loadingTrx && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                          Loading billing records...
                        </TableCell>
                      </TableRow>
                    )}

                    {!loadingTrx && filteredCreatedGroups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                          <ReceiptIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          No transaction billing records found.
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredCreatedGroups.map((group) => {
                      const isExpanded = !!expandedGroups[group.key];
                      const pendingTrxToUpload = group.transactions.find((t) => t.status === 'pending' && !t.receipt_photo);

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
                                {(() => {
                                  const paidTrx = group.transactions.find((t) => t.status === 'paid');
                                  if (!paidTrx) return null;
                                  const linkedReceipt = receiptsData?.data?.find(
                                    (r: Receipt) => r.transaction?.id === paidTrx.id || (r as any).transaction_id === paidTrx.id
                                  );
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePrint(linkedReceipt, paidTrx, {
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
                                  );
                                })()}

                                {pendingTrxToUpload && (
                                  <Button
                                    size="sm"
                                    onClick={() => openMemberUploadModal(pendingTrxToUpload)}
                                    className="h-8 gap-1.5 text-xs cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
                                    title="Upload payment slip"
                                  >
                                    <Camera className="h-3.5 w-3.5" /> Upload Slip
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
                                      Billing &amp; Payment Details for {group.title}
                                    </h4>
                                  </div>

                                  <div className="border border-slate-100 rounded-lg overflow-x-auto">
                                    <Table className="w-full">
                                      <TableHeader className="bg-slate-50">
                                        <TableRow className="text-xs">
                                          <TableHead className="text-center">Transaction No</TableHead>
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

                                          return (
                                            <TableRow key={trx.id} className="text-xs">
                                              <TableCell className="p-3 text-center align-middle font-mono text-slate-700">
                                                {trx.transaction_no}
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
                                                {isPurePending ? (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openMemberUploadModal(trx)}
                                                    className="h-7 px-2.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer shadow-2xs"
                                                  >
                                                    <Camera className="h-3 w-3 mr-1 text-emerald-600" /> Upload Slip
                                                  </Button>
                                                ) : isSlipPending ? (
                                                  <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    Locked for Review
                                                  </span>
                                                ) : isPaid ? (
                                                  (() => {
                                                    const linkedReceipt = receiptsData?.data?.find(
                                                      (r: Receipt) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id
                                                    );

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
                                                        })}
                                                        className="h-7 px-2 text-xs border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                                                        title="Print official receipt"
                                                      >
                                                        <Printer className="h-3 w-3 mr-1 text-emerald-700" /> Print
                                                      </Button>
                                                    );
                                                  })()
                                                ) : (
                                                  <span className="text-[10px] text-slate-400 italic">-</span>
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

        {/* VIEW 2: ALL TRANSACTIONS HISTORY TABLE */}
        {activeTab === 'all' && (
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-0">
              <Table className="table-fixed w-full">
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="text-xs font-bold text-slate-700">
                    <TableHead className="w-[14.28%] px-3">Transaction No</TableHead>
                    <TableHead className="w-[14.28%] px-3">Date</TableHead>
                    <TableHead className="w-[14.28%] px-3">Type / Category</TableHead>
                    <TableHead className="w-[14.28%] px-3">Month / Description</TableHead>
                    <TableHead className="w-[14.28%] px-3">Amount</TableHead>
                    <TableHead className="w-[14.28%] px-3">Status</TableHead>
                    <TableHead className="w-[14.28%] px-3">Payment Slip / Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTrx && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading transactions...</TableCell></TableRow>
                  )}
                  {trx?.data.length === 0 && !loadingTrx && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No transactions recorded yet.</TableCell></TableRow>
                  )}
              {trx?.data.map((t) => {
                const isRemainingDue = (t.description && /remaining due/i.test(t.description)) || (t.description && /partial payment/i.test(t.description));
                const isPartialPaid = t.status === 'paid' && (
                  (t.description && (/partial payment/i.test(t.description) || /remaining due/i.test(t.description))) ||
                  (t.month && pendingMonthsSet.has(t.month.trim().toLowerCase()))
                );
                const isPartialPending = t.status === 'pending' && isRemainingDue;
                const isPending = t.status === 'pending';
                const isRejected = t.status === 'rejected';

                return (
                  <TableRow key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="px-3 py-3.5 font-mono text-xs font-semibold text-slate-900 truncate">{t.transaction_no}</TableCell>
                    <TableCell className="px-3 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">{t.transaction_date}</TableCell>
                    <TableCell className="px-3 py-3.5">
                      <Badge variant="outline" className="capitalize text-[11px] font-semibold">
                        {t.payment_category === 'monthly_payment'
                          ? 'Monthly Subscription'
                          : t.payment_category === 'one_time'
                          ? 'One-Time Payment'
                          : t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3.5">
                      <div className="flex flex-col">
                        {t.month && (
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 text-emerald-700 inline shrink-0" /> {t.month}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 truncate" title={t.description}>{t.description || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3.5 font-bold text-slate-900 text-sm">BDT {Number(t.amount).toLocaleString()}</TableCell>
                    <TableCell className="px-3 py-3.5">
                      {isPartialPaid ? (
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
                            <Wallet className="h-3 w-3 text-purple-600 shrink-0" /> Partially Paid
                          </span>
                          <span className="text-[10px] text-purple-700 font-semibold">Partial Payment</span>
                        </div>
                      ) : isPartialPending ? (
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="h-3 w-3 text-amber-600 shrink-0" /> Remaining Due
                          </span>
                          <span className="text-[10px] text-purple-700 font-semibold">Partially Paid</span>
                        </div>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                          <Clock className="h-3 w-3 text-amber-600 shrink-0" /> Pending Payment
                        </span>
                      ) : isRejected ? (
                        <button
                          type="button"
                          onClick={() => setViewingRejectedTrx(t)}
                          className="flex flex-col gap-0.5 items-start text-left cursor-pointer group"
                          title="Click to view rejection reason from Admin"
                        >
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-300 shadow-2xs group-hover:bg-red-100 transition-colors">
                            <XCircle className="h-3 w-3 text-red-600 shrink-0" /> Slip Rejected
                          </span>
                          {t.rejection_reason && (
                            <span className="text-[10px] text-red-700 italic max-w-[150px] truncate group-hover:underline">
                              Reason: {t.rejection_reason}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" /> Paid
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="px-3 py-3.5">
                      {t.receipt_photo ? (
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ReceiptSlipThumbnail
                              photoUrl={t.receipt_photo}
                              title={`${t.month || t.description || 'Receipt'}`}
                              date={t.receipt_photo_uploaded_at ? `Uploaded: ${t.receipt_photo_uploaded_at}` : undefined}
                              isRejected={isRejected}
                              isPartial={Boolean(isPartialPaid || isPartialPending)}
                              rejectionReason={t.rejection_reason}
                              onClick={() => viewReceiptPhoto(
                                t.receipt_photo!,
                                `${t.month || t.description || 'Receipt'}`,
                                t.receipt_photo_uploaded_at,
                                isRejected,
                                t.rejection_reason
                              )}
                            />
                            {isPending ? (
                              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                                Submitted (Locked)
                              </span>
                            ) : isRejected ? (
                              <span className="text-[10px] text-red-800 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-300">
                                Declined by Admin
                              </span>
                            ) : isPartialPaid ? (
                              <span className="text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-300">
                                Partial Verified
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                                Verified
                              </span>
                            )}
                          </div>
                          {t.member_paid_amount && (
                            <span className={`text-[11px] font-semibold flex items-center gap-1 truncate max-w-full ${isPartialPaid ? 'text-purple-800' : 'text-emerald-800'}`}>
                              <FileCheck className={`h-3.5 w-3.5 inline shrink-0 ${isPartialPaid ? 'text-purple-600' : 'text-emerald-600'}`} />
                              Paid: BDT {Number(t.member_paid_amount).toLocaleString()}
                              {t.member_trx_reference && (
                                <span className="text-slate-500 font-mono text-[10px] ml-1">({t.member_trx_reference})</span>
                              )}
                            </span>
                          )}
                        </div>
                      ) : isPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMemberUploadModal(t)}
                          className="h-7 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer shadow-2xs"
                        >
                          <Camera className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Upload Slip &amp; Details
                        </Button>
                      ) : isRejected ? (
                        <span className="text-xs text-red-600 italic">Proof Rejected</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No slip uploaded</span>
                      )}
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

      {/* Pop-up Container / Dialog for Member to Upload Receipt Slip & Enter Proof Details */}
      <Dialog open={openUploadModal} onOpenChange={setOpenUploadModal}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <UploadCloud className="h-5 w-5 text-emerald-700" />
              Submit Payment Slip &amp; Details
            </DialogTitle>
          </DialogHeader>

          {uploadingTrx && (
            <form onSubmit={onSubmitMemberProof} className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {uploadingTrx.month || uploadingTrx.description || uploadingTrx.type}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    Due: BDT {Number(uploadingTrx.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/80 pt-1">
                  <span>Transaction Date: {uploadingTrx.transaction_date}</span>
                  <span className="font-mono text-slate-400">{uploadingTrx.transaction_no}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-emerald-700" />
                  Receipt Photo / Screenshot Slip Proof <span className="text-red-500">*</span>
                </Label>

                {slipPhotoData ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-slate-900/90 flex flex-col items-center justify-center p-2 group shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slipPhotoData}
                      alt="Preview"
                      className="max-h-48 w-auto object-contain rounded-lg"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs font-bold bg-white text-slate-800 px-3 py-1 rounded-md shadow-xs cursor-pointer hover:bg-slate-100 flex items-center gap-1">
                        <Camera className="h-3 w-3 text-emerald-700" /> Change Photo
                        <input type="file" accept="image/*,.pdf" onChange={handleSlipFilePicked} className="hidden" />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSlipPhotoData(null)}
                        className="h-7 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 cursor-pointer"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                    <Camera className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Click to upload photo or take screenshot</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Supports JPG, PNG, WebP up to 10MB</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleSlipFilePicked} className="hidden" />
                  </label>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                   <Label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                     <DollarSign className="h-3.5 w-3.5 text-emerald-700" />
                     Paid Amount (Input Value BDT) <span className="text-red-500">*</span>
                   </Label>
                   <button
                     type="button"
                     onClick={() => setSlipPaidAmount(String(uploadingTrx.amount))}
                     className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded"
                   >
                     Full Due (BDT {Number(uploadingTrx.amount).toLocaleString()})
                   </button>
                 </div>
                 <Input
                   type="number"
                   step="0.01"
                   min="0.01"
                   max={Number(uploadingTrx.amount)}
                   placeholder={String(uploadingTrx.amount)}
                   value={slipPaidAmount}
                   onChange={(e) => {
                     const val = e.target.value;
                     const num = Number(val);
                     const maxDue = Number(uploadingTrx.amount);
                     if (val !== '' && !isNaN(num) && num > maxDue) {
                       setSlipPaidAmount(String(maxDue));
                     } else {
                       setSlipPaidAmount(val);
                     }
                   }}
                   className={`bg-white font-mono font-bold text-base border-emerald-600 focus:ring-emerald-700 ${
                     Number(slipPaidAmount) > Number(uploadingTrx.amount) ? 'border-red-500 text-red-600' : ''
                   }`}
                   required
                 />
                 <div className="flex items-center justify-between text-[11px]">
                   <span className="text-slate-500">
                     Maximum payable due for this item: <strong className="text-slate-800">BDT {Number(uploadingTrx.amount).toLocaleString()}</strong>
                   </span>
                   {Number(slipPaidAmount) > 0 && Number(slipPaidAmount) < Number(uploadingTrx.amount) && (
                     <span className="text-purple-700 font-semibold">
                       Partial payment (Remaining due: BDT {(Number(uploadingTrx.amount) - Number(slipPaidAmount)).toLocaleString()})
                     </span>
                   )}
                 </div>
               </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-700" />
                    Transaction Type
                  </Label>
                  <select
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-xs mt-1 font-medium cursor-pointer"
                    value={slipPaymentMethod}
                    onChange={(e: any) => setSlipPaymentMethod(e.target.value)}
                  >
                    <option value="mobile_banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                    <option value="bank">Bank Deposit / Transfer</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-emerald-700" />
                    Transaction Reference Code / TrxID
                  </Label>
                  <Input
                    placeholder="e.g. 9J2KA87B, Deposit Slip #4912"
                    value={slipTrxReference}
                    onChange={(e) => setSlipTrxReference(e.target.value)}
                    className="bg-white mt-1 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                  Comment / Note (Optional)
                </Label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sent via bKash personal wallet at 4:15 PM, Sonali Bank Dhanmondi branch"
                  value={slipComment}
                  onChange={(e) => setSlipComment(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 bg-white text-xs mt-1"
                />
              </div>

              <p className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                * This info will auto-fill on the Admin verification panel so admins can easily verify and confirm your payment.
              </p>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenUploadModal(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploadingProof}
                  className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {isUploadingProof ? 'Submitting Proof...' : 'Submit Payment Proof'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={openConfirmModal} onOpenChange={setOpenConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Confirm Payment Proof Submission
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to submit this payment proof?</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Once submitted, you <b>will not be able to edit or modify</b> these details while under admin verification.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Paid Amount:</span>
                <span className="font-bold text-emerald-800 font-mono">
                  BDT {Number(slipPaidAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Type:</span>
                <span className="font-semibold capitalize">{slipPaymentMethod.replace(/_/g, ' ')}</span>
              </div>
              {slipTrxReference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference / TrxID:</span>
                  <span className="font-mono font-bold text-slate-900">{slipTrxReference}</span>
                </div>
              )}
              {slipComment && (
                <div className="border-t border-slate-200 pt-1 text-[11px] text-slate-600">
                  <span className="text-slate-500 block">Note:</span>
                  <i>&ldquo;{slipComment}&rdquo;</i>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenConfirmModal(false)}
                className="cursor-pointer text-xs"
              >
                Go Back &amp; Edit
              </Button>
              <Button
                type="button"
                onClick={handleConfirmedSubmit}
                disabled={isUploadingProof}
                className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                {isUploadingProof ? 'Submitting...' : 'Yes, Confirm & Submit'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={openPhotoModal} onOpenChange={setOpenPhotoModal}>
        <DialogContent className={`max-w-2xl max-h-[92vh] overflow-y-auto ${
          photoModalIsRejected ? 'border-red-500/60 shadow-2xl' : ''
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              {photoModalIsRejected ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <span className="text-red-950 font-bold">{photoModalTitle || 'Payment Slip'} (Rejected)</span>
                </>
              ) : (
                <>
                  <FileImage className="h-5 w-5 text-emerald-700 shrink-0" />
                  <span>{photoModalTitle || 'Payment Slip / Receipt Photo'}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {photoModalIsRejected && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-red-950 text-sm">
                  <XCircle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                  <span>Payment Proof Slip Declined by Admin</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-red-200 text-red-900">
                  <span className="font-bold text-[10px] text-red-950 block uppercase tracking-wider mb-0.5">Admin Rejection Reason:</span>
                  <p className="text-xs font-semibold leading-relaxed text-red-950">
                    {photoModalRejectionReason || 'Your proof slip could not be verified by Admin. Please re-upload a clear slip.'}
                  </p>
                </div>
                <p className="text-[10px] text-red-700 italic pt-0.5">
                  * A new pending due row has been generated on your dashboard so you can upload a valid proof slip.
                </p>
              </div>
            )}

            <MagnifiableModalImage
              src={photoModalUrl}
              alt={photoModalTitle || 'Receipt Proof'}
              isRejected={photoModalIsRejected}
            />

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              {photoModalDate && <span>Uploaded at: {photoModalDate}</span>}
              <a
                href={photoModalUrl}
                target="_blank"
                rel="noreferrer"
                className={`font-bold hover:underline flex items-center gap-1 ml-auto ${
                  photoModalIsRejected ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Image in New Tab
              </a>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" onClick={() => setOpenPhotoModal(false)} className={`cursor-pointer text-white ${
                photoModalIsRejected ? 'bg-red-700 hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-800'
              }`}>
                Close Viewer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member View Rejection Reason Modal */}
      <Dialog open={Boolean(viewingRejectedTrx)} onOpenChange={(o) => !o && setViewingRejectedTrx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 text-base">
              <XCircle className="h-5 w-5 text-red-600" />
              Payment Proof Declined
            </DialogTitle>
          </DialogHeader>

          {viewingRejectedTrx && (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction No:</span>
                  <span className="font-mono font-bold text-slate-900">{viewingRejectedTrx.transaction_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Item / Month:</span>
                  <span className="font-bold text-slate-900">{viewingRejectedTrx.month || viewingRejectedTrx.description || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">BDT {Number(viewingRejectedTrx.amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-600" /> Reason Given by Admin:
                </span>
                <p className="text-xs text-red-900 font-medium bg-white/90 p-2.5 rounded-lg border border-red-200 leading-relaxed italic">
                  &ldquo;{viewingRejectedTrx.rejection_reason || 'Payment proof slip could not be verified by Admin.'}&rdquo;
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-emerald-950">Next Step:</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  A new pending transaction row has been automatically generated on your dashboard. Please find the pending fee row and click <b>Upload Slip &amp; Details</b> to submit a valid payment receipt proof.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => setViewingRejectedTrx(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Understood &amp; Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>

      {/* Official Print Receipt Template */}
      {printReceipt && <ReceiptPrintArea receipt={printReceipt} />}
    </>
  );
}
