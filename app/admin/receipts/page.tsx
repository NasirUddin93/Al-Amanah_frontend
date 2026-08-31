'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSelector } from '@/store/hooks';
import { canManageReceipts, canManageTransactions, canCreateTransactions } from '@/lib/roles';
import {
  useGetReceiptsQuery,
  useCreateReceiptMutation,
  useGetUsersQuery,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useCollectPaymentMutation,
  useRejectReceiptPhotoMutation,
  useGeneratePaymentsMutation,
  useGetSettingsQuery,
} from '@/lib/api';
import { transactionSchema, receiptSchema } from '@/lib/schemas';
import { ReceiptPrintArea } from '@/components/receipt-print';
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import type { Receipt, Transaction, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Receipt as ReceiptIcon,
  Users,
  Search,
  Printer,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  ExternalLink,
  FileImage,
  AlertCircle,
  Ban,
  Filter,
  FileCheck,
  Image as ImageIcon,
  ZoomIn,
  Eye,
  Calculator,
  CalendarCheck,
  Calendar as CalendarIcon,
  CreditCard,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils';

interface MemberReceiptItem {
  id: string | number;
  recordType: 'receipt' | 'rejected_slip' | 'pending_slip';
  receiptNo?: string;
  transactionNo: string;
  date: string;
  monthOrDesc: string;
  amount: number;
  paymentMethod: string;
  receiptPhoto?: string;
  receiptPhotoUploadedAt?: string;
  memberPaidAmount?: number;
  memberTrxReference?: string;
  inputtedReference?: string;
  isRejected: boolean;
  isPartial?: boolean;
  rejectionReason?: string | null;
  status: 'paid' | 'rejected' | 'pending' | 'partial' | 'partially_paid';
  rawReceipt?: Receipt;
  rawTransaction?: Transaction;
}

function extractInputtedReference(trx?: any, receipt?: any): string {
  const directRef =
    trx?.member_trx_reference ||
    trx?.transaction_reference ||
    trx?.reference ||
    receipt?.member_trx_reference ||
    receipt?.transaction_reference ||
    receipt?.reference ||
    '';

  if (directRef && String(directRef).trim() !== '' && String(directRef).trim() !== '-') {
    return String(directRef).trim();
  }

  const desc = trx?.description || receipt?.transaction?.description || '';
  if (desc) {
    const refMatches = Array.from(desc.matchAll(/Ref:\s*([^|\n-]+)/gi))
      .map((m: any) => (m[1] ? String(m[1]).trim() : ''))
      .filter(Boolean);
    if (refMatches.length > 0) {
      return refMatches[refMatches.length - 1];
    }
  }

  if (receipt?.receipt_no && String(receipt.receipt_no).trim() !== '') {
    return String(receipt.receipt_no).trim();
  }

  if (trx?.transaction_no && String(trx.transaction_no).trim() !== '') {
    return String(trx.transaction_no).trim();
  }

  return '-';
}

export default function AdminReceiptsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = canManageReceipts(user);
  const canEditTrx = canCreateTransactions(user);

  // Top Tabs: Created Transaction Batches vs Member-wise Receipts vs All Receipts Table
  const [activeTab, setActiveTab] = useState<'created' | 'members' | 'all'>('created');

  // Status Filter: All, Cleared Receipts, Partially Paid, Received Slips, Due Pending, Rejected Slips
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'mobile_banking' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedMembers, setExpandedMembers] = useState<Record<string | number, boolean>>({});

  // Modals & Lightbox State
  const [openDemand, setOpenDemand] = useState(false);
  const [openSingle, setOpenSingle] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  // Edit Single Transaction / Price State
  const [openEditTrxModal, setOpenEditTrxModal] = useState(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [editTrxAmount, setEditTrxAmount] = useState<string>('');
  const [editTrxDescription, setEditTrxDescription] = useState<string>('');
  const [editTrxDueDate, setEditTrxDueDate] = useState<string>('');

  // Edit Batch Demand Price State
  const [openEditGroupModal, setOpenEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editGroupAmount, setEditGroupAmount] = useState<string>('');
  const [editGroupOnlyUnpaid, setEditGroupOnlyUnpaid] = useState<boolean>(true);

  // Delete Confirmation Modal State
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deletingTrx, setDeletingTrx] = useState<Transaction | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<any | null>(null);

  // Create & Assign Demand State
  const [demandCategory, setDemandCategory] = useState<'monthly_payment' | 'one_time'>('monthly_payment');
  const [targetAllMembers, setTargetAllMembers] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const currentYear = new Date().getFullYear();
  const [demandYear, setDemandYear] = useState<number>(currentYear);
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    `${MONTH_NAMES[new Date().getMonth()]} ${currentYear}`,
  ]);
  const [oneTimeTitle, setOneTimeTitle] = useState('Annual General Meeting Fee');
  const [demandAmount, setDemandAmount] = useState('2000');
  const [demandDueDate, setDemandDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [demandDescription, setDemandDescription] = useState('');
  const [demandTrxNo, setDemandTrxNo] = useState<string>('');

  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

  // Collect Payment Modal State
  const [openCollectModal, setOpenCollectModal] = useState(false);
  const [collectingTrx, setCollectingTrx] = useState<Transaction | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'cash' | 'bank' | 'mobile_banking' | 'other'>('cash');
  const [paymentDateInput, setPaymentDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentTimeInput, setPaymentTimeInput] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [paymentTrxRefInput, setPaymentTrxRefInput] = useState<string>('');
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');

  const getCurrentTimeHM = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ', ' +
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reject Proof Slip Modal State
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectingTrx, setRejectingTrx] = useState<Transaction | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // API Queries & Mutations with live synchronization polling
  const { data: receiptsData, isLoading: loadingReceipts } = useGetReceiptsQuery(
    { per_page: 3000 },
    { pollingInterval: 3000 }
  );
  const { data: transactionsData, isLoading: loadingTransactions } = useGetTransactionsQuery(
    { per_page: 3000 },
    { pollingInterval: 3000 }
  );
  const { data: usersData } = useGetUsersQuery(
    { per_page: 1000 },
    { skip: !canManage }
  );
  const { data: settings } = useGetSettingsQuery();

  const [generatePayments, { isLoading: isGenerating }] = useGeneratePaymentsMutation();
  const [createTransaction, { isLoading: isCreatingSingle }] = useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeletingTrx }] = useDeleteTransactionMutation();
  const [createReceipt, { isLoading: isCreating }] = useCreateReceiptMutation();
  const [collectPayment, { isLoading: isCollecting }] = useCollectPaymentMutation();
  const [rejectReceiptPhoto, { isLoading: isRejecting }] = useRejectReceiptPhotoMutation();

  // Manual Single Record Form
  const {
    register: registerSingle,
    handleSubmit: handleSubmitSingle,
    reset: resetSingle,
    formState: { errors: errorsSingle },
  } = useForm<any>({
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
      alert('Transaction recorded successfully.');
      setOpenSingle(false);
      resetSingle();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record transaction.');
    }
  };

  const rawReceipts: Receipt[] = useMemo(() => {
    return receiptsData?.data || [];
  }, [receiptsData]);

  const rawTransactions: Transaction[] = useMemo(() => {
    return transactionsData?.data || [];
  }, [transactionsData]);

  const generateAutoTrxNo = () => {
    const d = new Date();
    const ymd = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    let candidate = '';
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 50) {
      const rnd = Math.floor(1000 + Math.random() * 9000);
      candidate = `TRX-${ymd}-${rnd}`;
      exists = rawTransactions.some((t) => (t.transaction_no || '').toLowerCase() === candidate.toLowerCase());
      attempts++;
    }
    setDemandTrxNo(candidate);
  };

  const isTrxNoDuplicate = useMemo(() => {
    if (!demandTrxNo.trim()) return false;
    const inputClean = demandTrxNo.trim().toLowerCase();
    return rawTransactions.some((t) => (t.transaction_no || '').toLowerCase() === inputClean);
  }, [demandTrxNo, rawTransactions]);

  const isCollectTrxRefDuplicate = useMemo(() => {
    if (!paymentTrxRefInput.trim() || !collectingTrx) return null;
    const cleanRef = paymentTrxRefInput.trim().toLowerCase();
    return rawTransactions.find(
      (t) =>
        t.id !== collectingTrx.id &&
        t.member_trx_reference &&
        t.member_trx_reference.trim().toLowerCase() === cleanRef &&
        t.status !== 'rejected'
    ) || null;
  }, [paymentTrxRefInput, collectingTrx, rawTransactions]);

  const membersList: User[] = useMemo(() => {
    const rawUsers = usersData?.data || [];
    return rawUsers.filter((u) => u.role?.name === 'member');
  }, [usersData]);

  // Set of months of the selected year that are already created (pending or paid)
  const createdMonthsSet = useMemo(() => {
    const set = new Set<string>();
    if (!rawTransactions || rawTransactions.length === 0) return set;

    rawTransactions.forEach((trx) => {
      if (trx.status !== 'pending' && trx.status !== 'paid') return;

      const trxMemberId = trx.member?.id || (trx as any).member_id;

      if (!targetAllMembers && selectedMemberId) {
        if (Number(trxMemberId) !== Number(selectedMemberId)) return;
      }

      const textToScan = `${trx.month || ''} ${trx.description || ''} ${(trx as any).title || ''}`.toLowerCase();
      const trxYear = trx.transaction_date ? new Date(trx.transaction_date).getFullYear() : (trx.created_at ? new Date(trx.created_at).getFullYear() : null);

      MONTH_NAMES.forEach((m) => {
        const mLower = m.toLowerCase();
        if (textToScan.includes(mLower)) {
          const hasExplicitYear = textToScan.includes(String(demandYear));
          const isMatchingYear = hasExplicitYear || trxYear === demandYear || (!hasExplicitYear && !trxYear);

          if (isMatchingYear) {
            set.add(`${m} ${demandYear}`);
            set.add(m);
          }
        }
      });
    });

    return set;
  }, [rawTransactions, targetAllMembers, selectedMemberId, demandYear]);

  // Keep selectedMonths clean from any already created months
  useEffect(() => {
    setSelectedMonths((prev) =>
      prev.filter((mKey) => !createdMonthsSet.has(mKey) && !createdMonthsSet.has(mKey.split(' ')[0]))
    );
  }, [createdMonthsSet]);

  const memberReceiptGroups = useMemo(() => {
    const map: Record<string, {
      memberId: number | string;
      memberName: string;
      memberNo: string;
      memberEmail?: string;
      items: MemberReceiptItem[];
      totalPaidAmount: number;
      totalPendingAmount: number;
      fullyPaidCount: number;
      partiallyPaidCount: number;
      receivedSlipCount: number;
      pureDuePendingCount: number;
      rejectedCount: number;
      currentState?: 'cleared' | 'partial' | 'received' | 'due' | 'rejected';
      lastDate?: string;
    }> = {};

    // Build sets of paid & pending member months/dues
    const paidDueKeySet = new Set<string>();
    const paidMemberMonthSet = new Set<string>();
    const pendingMemberMonthSet = new Set<string>();
    const memberMonthSlipMap = new Map<string, { photo: string; uploadedAt?: string; amount?: number; ref?: string; method?: string }>();

    rawTransactions.forEach((trx) => {
      const memId = trx.member?.id || (trx as any).member_id;
      if (!memId) return;

      if (trx.receipt_photo) {
        if (trx.month) {
          memberMonthSlipMap.set(`${memId}___${trx.month.trim().toLowerCase()}`, {
            photo: trx.receipt_photo,
            uploadedAt: trx.receipt_photo_uploaded_at,
            amount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
            ref: trx.member_trx_reference,
            method: trx.member_payment_method,
          });
        }
        if (trx.description) {
          memberMonthSlipMap.set(`${memId}___${trx.description.trim().toLowerCase()}`, {
            photo: trx.receipt_photo,
            uploadedAt: trx.receipt_photo_uploaded_at,
            amount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
            ref: trx.member_trx_reference,
            method: trx.member_payment_method,
          });
        }
      }

      if (trx.status === 'paid') {
        if (trx.month) paidMemberMonthSet.add(`${memId}___${trx.month.trim().toLowerCase()}`);
        if (trx.description) paidMemberMonthSet.add(`${memId}___${trx.description.trim().toLowerCase()}`);
        const dueKey = `${memId}_${trx.payment_category || trx.type || ''}_${trx.month || ''}_${trx.description || ''}`;
        paidDueKeySet.add(dueKey);
      } else if (trx.status === 'pending') {
        if (trx.month) pendingMemberMonthSet.add(`${memId}___${trx.month.trim().toLowerCase()}`);
        if (trx.description) pendingMemberMonthSet.add(`${memId}___${trx.description.trim().toLowerCase()}`);
      }
    });

    membersList.forEach((m) => {
      map[m.id] = {
        memberId: m.id,
        memberName: m.name,
        memberNo: m.member_profile?.member_no || (m as any).memberProfile?.member_no || '-',
        memberEmail: m.email,
        items: [],
        totalPaidAmount: 0,
        totalPendingAmount: 0,
        fullyPaidCount: 0,
        partiallyPaidCount: 0,
        receivedSlipCount: 0,
        pureDuePendingCount: 0,
        rejectedCount: 0,
        lastDate: undefined,
      };
    });

    rawTransactions.forEach((trx) => {
      const mId = trx.member?.id || `anon_${trx.member?.name || 'unknown'}`;
      const mName = trx.member?.name || 'Unassigned Member';
      const mNo = trx.member?.member_no || (trx.member as any)?.member_profile?.member_no || '-';

      if (!map[mId]) {
        map[mId] = {
          memberId: mId,
          memberName: mName,
          memberNo: mNo,
          items: [],
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          fullyPaidCount: 0,
          partiallyPaidCount: 0,
          receivedSlipCount: 0,
          pureDuePendingCount: 0,
          rejectedCount: 0,
          lastDate: undefined,
        };
      }

      const linkedReceipt = rawReceipts.find((r) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id);
      const memId = trx.member?.id || (trx as any).member_id;
      const sisterSlip = memId
        ? (trx.month ? memberMonthSlipMap.get(`${memId}___${trx.month.trim().toLowerCase()}`) : null) ||
          (trx.description ? memberMonthSlipMap.get(`${memId}___${trx.description.trim().toLowerCase()}`) : null)
        : null;

      const effectivePhoto = trx.receipt_photo || sisterSlip?.photo;
      const effectiveUploadedAt = trx.receipt_photo_uploaded_at || sisterSlip?.uploadedAt;
      const effectiveProofAmount = trx.member_paid_amount ? Number(trx.member_paid_amount) : sisterSlip?.amount;
      const effectiveTrxRef = trx.member_trx_reference || sisterSlip?.ref;
      const effectiveMethod = trx.member_payment_method || sisterSlip?.method;
      const computedRef = extractInputtedReference(trx, linkedReceipt || trx.receipt);

      if (trx.status === 'paid') {
        const isPartialPaid = Boolean(
          (trx.description && (/partial payment/i.test(trx.description) || /remaining due/i.test(trx.description))) ||
          (trx.month && pendingMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`))
        );

        map[mId].items.push({
          id: `trx_paid_${trx.id}`,
          recordType: 'receipt',
          receiptNo: linkedReceipt?.receipt_no || trx.receipt?.receipt_no,
          transactionNo: trx.transaction_no,
          inputtedReference: computedRef,
          date: trx.transaction_date,
          monthOrDesc: trx.month || trx.description || 'Payment Receipt',
          amount: Number(trx.amount || 0),
          paymentMethod: linkedReceipt?.payment_method || effectiveMethod || 'cash',
          receiptPhoto: effectivePhoto,
          receiptPhotoUploadedAt: effectiveUploadedAt,
          memberPaidAmount: effectiveProofAmount,
          memberTrxReference: effectiveTrxRef,
          isRejected: false,
          isPartial: isPartialPaid,
          rejectionReason: null,
          status: 'paid',
          rawReceipt: linkedReceipt || trx.receipt,
          rawTransaction: trx,
        });

        map[mId].totalPaidAmount += Number(trx.amount || 0);
        if (isPartialPaid) {
          map[mId].partiallyPaidCount += 1;
        } else {
          map[mId].fullyPaidCount += 1;
        }
      } else if (trx.status === 'rejected') {
        map[mId].items.push({
          id: `trx_rej_${trx.id}`,
          recordType: 'rejected_slip',
          receiptNo: undefined,
          transactionNo: trx.transaction_no,
          inputtedReference: computedRef,
          date: trx.transaction_date,
          monthOrDesc: trx.month || trx.description || 'Declined Proof',
          amount: Number(trx.amount || 0),
          paymentMethod: effectiveMethod || 'mobile_banking',
          receiptPhoto: trx.receipt_photo,
          receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
          memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
          memberTrxReference: trx.member_trx_reference,
          isRejected: true,
          isPartial: false,
          rejectionReason: trx.rejection_reason || 'Payment proof slip declined by Admin.',
          status: 'rejected',
          rawTransaction: trx,
        });

        map[mId].rejectedCount += 1;
      } else if (trx.status === 'pending') {
        const isRemainingDue = (trx.description && /remaining due/i.test(trx.description)) || (trx.description && /partial payment/i.test(trx.description));
        const isThisDuePartiallyPaid = Boolean(isRemainingDue || (trx.month && paidMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`)));

        if (isThisDuePartiallyPaid && map[mId].partiallyPaidCount === 0) {
          map[mId].partiallyPaidCount += 1;
        }

        if (effectivePhoto) {
          map[mId].items.push({
            id: `trx_pend_${trx.id}`,
            recordType: 'pending_slip',
            receiptNo: undefined,
            transactionNo: trx.transaction_no,
            inputtedReference: computedRef,
            date: trx.transaction_date,
            monthOrDesc: trx.month || trx.description || 'Submitted Proof Due',
            amount: Number(trx.amount || 0),
            paymentMethod: effectiveMethod || 'pending',
            receiptPhoto: effectivePhoto,
            receiptPhotoUploadedAt: effectiveUploadedAt,
            memberPaidAmount: effectiveProofAmount,
            memberTrxReference: effectiveTrxRef,
            isRejected: false,
            isPartial: isThisDuePartiallyPaid,
            rejectionReason: null,
            status: isThisDuePartiallyPaid ? 'partial' : 'pending',
            rawTransaction: trx,
          });

          map[mId].totalPendingAmount += Number(trx.amount || 0);
          map[mId].receivedSlipCount += 1;
        } else {
          map[mId].items.push({
            id: `trx_pend_${trx.id}`,
            recordType: 'pending_slip',
            receiptNo: undefined,
            transactionNo: trx.transaction_no,
            inputtedReference: computedRef,
            date: trx.transaction_date,
            monthOrDesc: trx.month || trx.description || 'Assigned Due',
            amount: Number(trx.amount || 0),
            paymentMethod: effectiveMethod || 'pending',
            receiptPhoto: undefined,
            receiptPhotoUploadedAt: undefined,
            memberPaidAmount: undefined,
            memberTrxReference: undefined,
            isRejected: false,
            isPartial: isThisDuePartiallyPaid,
            rejectionReason: null,
            status: isThisDuePartiallyPaid ? 'partial' : 'pending',
            rawTransaction: trx,
          });

          if (!isThisDuePartiallyPaid) {
            map[mId].pureDuePendingCount += 1;
          }
          map[mId].totalPendingAmount += Number(trx.amount || 0);
        }
      }

      if (trx.transaction_date) {
        if (!map[mId].lastDate || trx.transaction_date > map[mId].lastDate!) {
          map[mId].lastDate = trx.transaction_date;
        }
      }
    });

    rawReceipts.forEach((r) => {
      const mId = r.member?.id || `anon_${r.member?.name || 'unknown'}`;
      const mName = r.member?.name || 'Unassigned Member';
      const mNo = r.member?.member_no || (r.member as any)?.member_profile?.member_no || '-';

      if (!map[mId]) {
        map[mId] = {
          memberId: mId,
          memberName: mName,
          memberNo: mNo,
          items: [],
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          fullyPaidCount: 0,
          partiallyPaidCount: 0,
          receivedSlipCount: 0,
          pureDuePendingCount: 0,
          rejectedCount: 0,
          lastDate: undefined,
        };
      }

      const alreadyExists = map[mId].items.some(
        (it) => it.receiptNo === r.receipt_no || (r.transaction?.transaction_no && it.transactionNo === r.transaction.transaction_no)
      );

      if (!alreadyExists) {
        map[mId].items.push({
          id: `rct_standalone_${r.id}`,
          recordType: 'receipt',
          receiptNo: r.receipt_no,
          transactionNo: r.transaction?.transaction_no || `TRX-STANDALONE-${r.id}`,
          inputtedReference: extractInputtedReference(r.transaction, r),
          date: r.receipt_date || r.created_at || '',
          monthOrDesc: r.transaction?.month || r.transaction?.description || 'Direct Receipt',
          amount: Number(r.amount || 0),
          paymentMethod: r.payment_method || 'cash',
          receiptPhoto: undefined,
          isRejected: false,
          isPartial: false,
          rejectionReason: null,
          status: 'paid',
          rawReceipt: r,
        });

        map[mId].totalPaidAmount += Number(r.amount || 0);
        map[mId].fullyPaidCount += 1;

        if (r.receipt_date) {
          if (!map[mId].lastDate || r.receipt_date > map[mId].lastDate!) {
            map[mId].lastDate = r.receipt_date;
          }
        }
      }
    });

    // Compute each member's current status strictly based on their latest active transactions/demands
    Object.values(map).forEach((m) => {
      m.items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const memberTrx = rawTransactions.filter(
        (t) => (t.member?.id === m.memberId || (t as any).member_id === m.memberId)
      ).sort((a, b) => {
        const dateA = a.updated_at || a.created_at || a.transaction_date || '';
        const dateB = b.updated_at || b.created_at || b.transaction_date || '';
        return dateB.localeCompare(dateA) || (b.id || 0) - (a.id || 0);
      });

      if (memberTrx.length === 0) {
        m.currentState = 'cleared';
        return;
      }

      // Latest pending transactions requiring action
      const pendingList = memberTrx.filter((t) => t.status === 'pending');
      const paidList = memberTrx.filter((t) => t.status === 'paid');
      const rejectedList = memberTrx.filter((t) => t.status === 'rejected');

      const latestTrx = memberTrx[0];
      const activePendingWithSlip = pendingList.filter((t) => !!t.receipt_photo);
      const activePendingNoSlip = pendingList.filter((t) => !t.receipt_photo);

      if (activePendingWithSlip.length > 0) {
        // Has a proof slip uploaded currently in review
        m.currentState = 'received';
      } else if (paidList.length > 0 && activePendingNoSlip.length > 0) {
        // Has partially paid some dues while other dues are active pending
        m.currentState = 'partial';
      } else if (activePendingNoSlip.length > 0) {
        // Has pending unpaid dues with no slip
        m.currentState = 'due';
      } else if (latestTrx.status === 'rejected' && pendingList.length === 0) {
        // Latest action was a rejection
        m.currentState = 'rejected';
      } else {
        // All active dues are settled / paid
        m.currentState = 'cleared';
      }
    });

    return Object.values(map).sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [membersList, rawTransactions, rawReceipts]);

  const stats = useMemo(() => {
    const totalReceipts = rawReceipts.length;
    const totalMembers = memberReceiptGroups.length;

    let totalClearedAmount = 0;
    let clearedReceiptsCount = 0;
    let partialCount = 0;
    let partialCollectedAmount = 0;
    let receivedSlipsCount = 0;
    let receivedSlipsAmount = 0;
    let duePendingCount = 0;
    let duePendingAmount = 0;
    let rejectedSlipsCount = 0;
    let rejectedSlipsAmount = 0;

    // Group transactions by member + month (or description) to evaluate each demand's latest status
    const demandMap: Record<string, Transaction[]> = {};
    rawTransactions.forEach((trx) => {
      const mId = trx.member?.id || (trx as any).member_id || `anon_${trx.id}`;
      const demandKey = `${mId}___${(trx.month || trx.description || 'general').trim().toLowerCase()}`;
      if (!demandMap[demandKey]) demandMap[demandKey] = [];
      demandMap[demandKey].push(trx);
    });

    // Calculate count and money amounts based on the latest status of each member's demand
    Object.values(demandMap).forEach((trxList) => {
      const sorted = [...trxList].sort((a, b) => {
        const dateA = a.updated_at || a.created_at || a.transaction_date || '';
        const dateB = b.updated_at || b.created_at || b.transaction_date || '';
        return dateB.localeCompare(dateA) || (b.id || 0) - (a.id || 0);
      });

      const paidList = sorted.filter((t) => t.status === 'paid');
      const pendingList = sorted.filter((t) => t.status === 'pending');
      const rejectedList = sorted.filter((t) => t.status === 'rejected');

      const isFullyPaid = paidList.length > 0 && pendingList.length === 0;
      const isSlipReceived = !isFullyPaid && pendingList.some((t) => !!t.receipt_photo);
      const isPartial = !isSlipReceived && paidList.length > 0 && pendingList.length > 0;
      const isRejectedActive = !isFullyPaid && !isPartial && !isSlipReceived && rejectedList.length > 0;

      const demandPaidTotal = paidList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const demandPendingTotal = pendingList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const demandRejectedTotal = rejectedList.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      totalClearedAmount += demandPaidTotal;

      if (isFullyPaid) {
        clearedReceiptsCount += 1;
      } else if (isPartial) {
        partialCount += 1;
        partialCollectedAmount += demandPaidTotal;
        duePendingAmount += demandPendingTotal;
      } else if (isSlipReceived) {
        receivedSlipsCount += 1;
        receivedSlipsAmount += demandPendingTotal;
        duePendingAmount += demandPendingTotal;
      } else if (isRejectedActive) {
        rejectedSlipsCount += 1;
        rejectedSlipsAmount += demandRejectedTotal;
        duePendingAmount += (demandPendingTotal || demandRejectedTotal);
      } else {
        duePendingCount += 1;
        duePendingAmount += demandPendingTotal;
      }
    });

    // Total demands created across all months
    const totalDemandsCount = Object.keys(demandMap).length;
    // All demands that are not completely cleared count as due pending
    const totalDueRemainingCount = Math.max(0, totalDemandsCount - clearedReceiptsCount);

    return {
      totalReceipts,
      totalClearedAmount,
      currentClearedCount: clearedReceiptsCount,
      currentPartialCount: partialCount,
      partialCollectedAmount,
      currentReceivedCount: receivedSlipsCount,
      receivedSlipsAmount,
      currentDueCount: totalDueRemainingCount,
      duePendingAmount,
      pureUnpaidDueCount: duePendingCount,
      currentRejectedCount: rejectedSlipsCount,
      rejectedSlipsAmount,
      totalMembers,
    };
  }, [rawReceipts, rawTransactions, memberReceiptGroups]);

  const filteredMemberGroups = useMemo(() => {
    return memberReceiptGroups.filter((g: any) => {
      if (statusFilter === 'paid' && g.currentState !== 'cleared') return false;
      if (statusFilter === 'partial' && g.currentState !== 'partial') return false;
      if (statusFilter === 'received_slip' && g.currentState !== 'received') return false;
      if (statusFilter === 'pending' && g.currentState !== 'due') return false;
      if (statusFilter === 'rejected' && g.currentState !== 'rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = g.memberName.toLowerCase().includes(q);
        const idMatch = g.memberNo.toLowerCase().includes(q);
        const hasItemMatch = g.items.some(
          (it: MemberReceiptItem) =>
            it.receiptNo?.toLowerCase().includes(q) ||
            it.transactionNo?.toLowerCase().includes(q) ||
            it.monthOrDesc?.toLowerCase().includes(q) ||
            it.rejectionReason?.toLowerCase().includes(q) ||
            it.paymentMethod?.toLowerCase().includes(q)
        );
        if (!nameMatch && !idMatch && !hasItemMatch) return false;
      }

      if (paymentMethodFilter !== 'all') {
        const hasMethod = g.items.some((it: MemberReceiptItem) => it.paymentMethod === paymentMethodFilter);
        if (!hasMethod) return false;
      }

      return true;
    });
  }, [memberReceiptGroups, statusFilter, searchQuery, paymentMethodFilter]);

  const allChronologicalItems = useMemo(() => {
    const items: (MemberReceiptItem & { memberName: string; memberNo: string })[] = [];

    memberReceiptGroups.forEach((g) => {
      g.items.forEach((it) => {
        items.push({
          ...it,
          memberName: g.memberName,
          memberNo: g.memberNo,
        });
      });
    });

    return items
      .filter((it) => {
        if (statusFilter === 'paid' && it.status !== 'paid') return false;
        if (statusFilter === 'partial' && !it.isPartial) return false;
        if (statusFilter === 'received_slip' && (it.status !== 'pending' || !it.receiptPhoto)) return false;
        if (statusFilter === 'pending' && (it.status !== 'pending' || !!it.receiptPhoto)) return false;
        if (statusFilter === 'rejected' && it.status !== 'rejected') return false;
        if (paymentMethodFilter !== 'all' && it.paymentMethod !== paymentMethodFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = it.memberName.toLowerCase().includes(q);
          const idMatch = it.memberNo.toLowerCase().includes(q);
          const noMatch = it.receiptNo?.toLowerCase().includes(q);
          const trxMatch = it.transactionNo?.toLowerCase().includes(q);
          const reasonMatch = it.rejectionReason?.toLowerCase().includes(q);
          return nameMatch || idMatch || noMatch || trxMatch || reasonMatch;
        }

        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [memberReceiptGroups, statusFilter, paymentMethodFilter, searchQuery]);

  const getModifierInfo = (t: Transaction | any) => {
    const isUpdated = Boolean(
      (t.last_modified_by?.action === 'Updated') ||
      (t.updated_by && t.updated_at && t.created_at && t.updated_at !== t.created_at)
    );
    const actionDate = isUpdated ? (t.updated_at || t.created_at) : (t.created_at || t.updated_at);

    if (t.last_modified_by && typeof t.last_modified_by === 'object') {
      return {
        id: t.last_modified_by.id,
        name: t.last_modified_by.name,
        role: t.last_modified_by.role || 'Admin',
        member_no: t.last_modified_by.member_no,
        action: t.last_modified_by.action || (isUpdated ? 'Updated' : 'Created'),
        date: actionDate,
      };
    }

    if (t.updated_by) {
      if (typeof t.updated_by === 'object') {
        return {
          id: t.updated_by.id,
          name: t.updated_by.name,
          role: t.updated_by.role || 'Admin',
          member_no: t.updated_by.member_no,
          action: 'Updated',
          date: actionDate,
        };
      }
      return { name: String(t.updated_by), role: 'Admin', action: 'Updated', date: actionDate };
    }

    if (t.created_by) {
      if (typeof t.created_by === 'object') {
        return {
          id: t.created_by.id,
          name: t.created_by.name,
          role: t.created_by.role || 'Admin',
          member_no: t.created_by.member_no,
          action: 'Created',
          date: t.created_at,
        };
      }
      return { name: String(t.created_by), role: 'Admin', action: 'Created', date: t.created_at };
    }

    return { name: 'Super Admin', role: 'super_admin', action: 'Created', date: t.created_at || t.updated_at };
  };

  const getAuditorInfo = (itemOrTrx: Transaction | MemberReceiptItem | any) => {
    const trx: Transaction | undefined = itemOrTrx?.rawTransaction || (itemOrTrx?.transaction_no ? itemOrTrx : undefined);
    const rct: Receipt | undefined = itemOrTrx?.rawReceipt || (itemOrTrx?.receipt_no ? itemOrTrx : undefined) || trx?.receipt;

    const st = String(itemOrTrx?.status || trx?.status || (rct ? 'paid' : '')).toLowerCase();

    // 1. If Paid / Cleared / Settled
    if (st.includes('paid') || itemOrTrx?.recordType === 'receipt' || itemOrTrx?.isPartial) {
      const rctConfirmed = rct?.confirmed_by || rct?.created_by;
      const settledDate = (rct as any)?.confirmed_at || (rct as any)?.created_at || trx?.updated_at || trx?.created_at;

      if (rctConfirmed && typeof rctConfirmed === 'object') {
        return {
          id: rctConfirmed.id,
          name: rctConfirmed.name,
          role: rctConfirmed.role || 'Admin',
          member_no: rctConfirmed.member_no,
          action: 'Confirmed by',
          date: settledDate,
        };
      }

      if (trx?.updated_by && typeof trx.updated_by === 'object') {
        return {
          id: trx.updated_by.id,
          name: trx.updated_by.name,
          role: trx.updated_by.role || 'Admin',
          member_no: trx.updated_by.member_no,
          action: 'Confirmed by',
          date: trx.updated_at || trx.created_at,
        };
      }

      if (trx?.last_modified_by && typeof trx.last_modified_by === 'object') {
        return {
          id: trx.last_modified_by.id,
          name: trx.last_modified_by.name,
          role: trx.last_modified_by.role || 'Admin',
          member_no: trx.last_modified_by.member_no,
          action: 'Confirmed by',
          date: trx.updated_at || trx.created_at,
        };
      }

      if (trx?.created_by && typeof trx.created_by === 'object') {
        return {
          id: trx.created_by.id,
          name: trx.created_by.name,
          role: trx.created_by.role || 'Admin',
          member_no: trx.created_by.member_no,
          action: 'Settled by',
          date: trx.updated_at || trx.created_at,
        };
      }

      return {
        id: 1,
        name: 'Super Admin',
        role: 'super_admin',
        action: 'Confirmed by',
        date: trx?.updated_at || trx?.created_at,
      };
    }

    // 2. If Rejected
    if (st === 'rejected' || itemOrTrx?.isRejected) {
      const rejDate = trx?.updated_at || trx?.created_at;
      if (trx?.updated_by && typeof trx.updated_by === 'object') {
        return {
          id: trx.updated_by.id,
          name: trx.updated_by.name,
          role: trx.updated_by.role || 'Admin',
          member_no: trx.updated_by.member_no,
          action: 'Rejected by',
          date: rejDate,
        };
      }

      if (trx?.last_modified_by && typeof trx.last_modified_by === 'object') {
        return {
          id: trx.last_modified_by.id,
          name: trx.last_modified_by.name,
          role: trx.last_modified_by.role || 'Admin',
          member_no: trx.last_modified_by.member_no,
          action: 'Rejected by',
          date: rejDate,
        };
      }

      if (trx?.created_by && typeof trx.created_by === 'object') {
        return {
          id: trx.created_by.id,
          name: trx.created_by.name,
          role: trx.created_by.role || 'Admin',
          member_no: trx.created_by.member_no,
          action: 'Rejected by',
          date: rejDate,
        };
      }

      return {
        id: 1,
        name: 'Super Admin',
        role: 'super_admin',
        action: 'Rejected by',
        date: rejDate,
      };
    }

    return null;
  };

  const renderStaffAuditBadge = (
    auditor: { id?: number | string; name: string; role?: string; member_no?: string; action?: string; date?: string } | null,
    isConfirmed?: boolean
  ) => {
    if (!auditor || !auditor.name) return null;
    const roleDisplay = auditor.role?.replace(/_/g, ' ') || 'Admin';
    const idDisplay = auditor.member_no ? `#${auditor.member_no}` : (auditor.id ? `#${auditor.id}` : '');
    const isRej = auditor.action?.toLowerCase().includes('reject');

    return (
      <div className="mt-1 flex flex-col items-center justify-center text-[10px] leading-tight select-none gap-0.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${isRej ? 'text-red-700' : 'text-emerald-800'}`}>
          {auditor.action || (isConfirmed ? 'Confirmed by' : 'Audited by')}
        </span>
        <div
          className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border shadow-2xs ${
            isRej
              ? 'bg-red-50 text-red-950 border-red-200'
              : 'bg-emerald-50/90 text-emerald-950 border-emerald-200'
          }`}
          title={`Staff Auditor: ${auditor.name} (${roleDisplay} ${idDisplay})`}
        >
          <ShieldCheck className={`h-3 w-3 shrink-0 ${isRej ? 'text-red-600' : 'text-emerald-700'}`} />
          <span className="font-bold truncate max-w-[110px]">{auditor.name}</span>
          <span
            className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded font-bold ${
              isRej ? 'bg-red-200/80 text-red-900' : 'bg-emerald-200/80 text-emerald-900'
            }`}
          >
            {roleDisplay} {idDisplay}
          </span>
        </div>
        {auditor.date && (
          <span className="text-[9px] text-slate-500 font-mono">
            {formatDateTime(auditor.date)}
          </span>
        )}
      </div>
    );
  };

  const createdDemandGroups = useMemo(() => {
    const groups: Record<string, {
      id?: number | string;
      transaction_no?: string;
      key: string;
      title: string;
      category: string;
      month?: string;
      perMemberAmount: number;
      dueDate: string;
      created_at: string;
      updated_at?: string;
      last_modified_by?: any;
      transactions: Transaction[];
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
          id: t.id,
          transaction_no: t.transaction_no,
          key: groupKey,
          title,
          category: t.payment_category || t.type,
          month: t.month,
          perMemberAmount: Number(t.amount) || 0,
          dueDate: t.transaction_date,
          created_at: t.created_at,
          updated_at: t.updated_at,
          last_modified_by: t.last_modified_by || t.updated_by || t.created_by,
          transactions: [],
        };
      }

      groups[groupKey].transactions.push(t);
      if (t.updated_at && (!groups[groupKey].updated_at || t.updated_at > groups[groupKey].updated_at!)) {
        groups[groupKey].updated_at = t.updated_at;
        if (t.last_modified_by) {
          groups[groupKey].last_modified_by = t.last_modified_by;
        }
      }
    });

    const groupList = Object.values(groups).map((g) => {
      const activeTrx = g.transactions.filter((t) => t.status !== 'rejected');
      const targetTrxList = activeTrx.length > 0 ? activeTrx : g.transactions;

      const memberIds = new Set(targetTrxList.map((t) => t.member?.id).filter(Boolean));
      const totalMembersAssigned = memberIds.size || targetTrxList.length;

      const totalDemandAmount = targetTrxList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalCollectedAmount = g.transactions
        .filter((t) => t.status === 'paid')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const memberStatusMap: Record<string | number, { hasPaid: boolean; hasPending: boolean }> = {};
      targetTrxList.forEach((t) => {
        const mId = t.member?.id || (t as any).member_id;
        if (!mId) return;
        if (!memberStatusMap[mId]) {
          memberStatusMap[mId] = { hasPaid: false, hasPending: false };
        }
        if (t.status === 'paid') memberStatusMap[mId].hasPaid = true;
        if (t.status === 'pending') memberStatusMap[mId].hasPending = true;
      });

      let fullyPaidMembersCount = 0;
      let partiallyPaidMembersCount = 0;
      let unpaidMembersCount = 0;
      let receivedSlipCount = 0;
      let rejectedCount = 0;

      Object.entries(memberStatusMap).forEach(([mId, st]) => {
        if (st.hasPaid && !st.hasPending) {
          fullyPaidMembersCount += 1;
          return;
        }
        const mTrxList = g.transactions.filter((t) => (String(t.member?.id) === String(mId) || String((t as any).member_id) === String(mId)));
        const hasSlip = mTrxList.some((t) => t.status === 'pending' && !!t.receipt_photo);
        const isRej = mTrxList.some((t) => t.status === 'rejected') && !hasSlip;

        if (hasSlip) {
          receivedSlipCount += 1;
        } else if (isRej) {
          rejectedCount += 1;
        } else if (st.hasPaid && st.hasPending) {
          partiallyPaidMembersCount += 1;
        } else {
          unpaidMembersCount += 1;
        }
      });

      const pendingMembersCount = partiallyPaidMembersCount + unpaidMembersCount + receivedSlipCount + rejectedCount;

      const memberProgressPercent = totalMembersAssigned > 0
        ? Math.min(100, Math.round((fullyPaidMembersCount / totalMembersAssigned) * 100))
        : 0;

      const progressPercent = totalDemandAmount > 0
        ? Math.min(100, Math.round((totalCollectedAmount / totalDemandAmount) * 100))
        : (totalCollectedAmount > 0 ? 100 : 0);
      const isFullyPaid = pendingMembersCount === 0 && totalMembersAssigned > 0;

      // In subscription demands: all members count as due except the fully paid ones
      const duePendingCount = Math.max(0, totalMembersAssigned - fullyPaidMembersCount);

      return {
        ...g,
        totalMembersAssigned,
        paidCount: fullyPaidMembersCount,
        partiallyPaidCount: partiallyPaidMembersCount,
        pendingCount: pendingMembersCount,
        duePendingCount,
        receivedSlipCount,
        rejectedCount,
        totalDemandAmount,
        totalCollectedAmount,
        progressPercent,
        memberProgressPercent,
        isFullyPaid,
      };
    });

    return groupList.sort((a, b) => {
      const dateA = a.updated_at || a.created_at || a.dueDate || '';
      const dateB = b.updated_at || b.created_at || b.dueDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [rawTransactions]);

  const filteredCreatedGroups = useMemo(() => {
    return createdDemandGroups.filter((g) => {
      if (statusFilter === 'paid' && !g.isFullyPaid) return false;
      if (statusFilter === 'pending' && g.isFullyPaid) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const modifier = getModifierInfo(g);
        const titleMatch = g.title.toLowerCase().includes(q);
        const monthMatch = g.month?.toLowerCase().includes(q);
        const catMatch = g.category.toLowerCase().includes(q);
        const adminMatch = modifier.name.toLowerCase().includes(q) || modifier.role.toLowerCase().includes(q);
        return titleMatch || monthMatch || catMatch || adminMatch;
      }

      return true;
    });
  }, [createdDemandGroups, statusFilter, searchQuery]);

  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleExpandMember = (memberId: string | number) => {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // Open Edit Single Transaction / Price Modal
  const openEditSingleTrx = (itemOrTrx: Transaction | MemberReceiptItem | any) => {
    const trx = itemOrTrx.rawTransaction || itemOrTrx;
    setEditingTrx(trx);
    setEditTrxAmount(String(trx.amount || itemOrTrx.amount || ''));
    setEditTrxDescription(trx.description || trx.month || itemOrTrx.monthOrDesc || '');
    setEditTrxDueDate(trx.transaction_date || trx.date || itemOrTrx.date || '');
    setOpenEditTrxModal(true);
  };

  // Submit Edit Single Transaction
  const handleSaveEditTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTrx) {
      alert('Permission denied. Only Admins can modify transaction amounts.');
      return;
    }
    if (!editingTrx) return;

    const numAmount = Number(editTrxAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      await updateTransaction({
        id: editingTrx.id,
        body: {
          amount: numAmount,
          description: editTrxDescription,
          transaction_date: editTrxDueDate,
        },
      }).unwrap();

      alert('Transaction updated successfully.');
      setOpenEditTrxModal(false);
      setEditingTrx(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update transaction.');
    }
  };

  // Open Edit Group / Demand Price Modal
  const openEditBatchGroup = (group: any) => {
    if (!canEditTrx) return;
    setEditingGroup(group);
    setEditGroupAmount(String(group.perMemberAmount || ''));
    setEditGroupOnlyUnpaid(true);
    setOpenEditGroupModal(true);
  };

  // Submit Edit Batch Group Price
  const handleSaveEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTrx) {
      alert('Permission denied. Only Admins can modify demand prices.');
      return;
    }
    if (!editingGroup) return;

    const numAmount = Number(editGroupAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    try {
      const targetList = editGroupOnlyUnpaid
        ? editingGroup.transactions.filter((t: Transaction) => t.status !== 'paid')
        : editingGroup.transactions;

      if (targetList.length === 0) {
        alert('No eligible transactions to update.');
        return;
      }

      await Promise.all(
        targetList.map((t: Transaction) =>
          updateTransaction({
            id: t.id,
            body: { amount: numAmount },
          }).unwrap()
        )
      );

      alert(`Successfully updated fee/price for ${targetList.length} transaction records.`);
      setOpenEditGroupModal(false);
      setEditingGroup(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update demand price.');
    }
  };

  // Open Delete Modal
  const promptDeleteTrx = (itemOrTrx: Transaction | MemberReceiptItem | any) => {
    if (!canEditTrx) return;
    const trx = itemOrTrx.rawTransaction || itemOrTrx;
    setDeletingTrx(trx);
    setDeletingGroup(null);
    setOpenDeleteModal(true);
  };

  const promptDeleteGroup = (group: any) => {
    if (!canEditTrx) return;
    setDeletingGroup(group);
    setDeletingTrx(null);
    setOpenDeleteModal(true);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!canEditTrx) {
      alert('Permission denied. Only Admins can delete transaction records.');
      return;
    }
    try {
      if (deletingTrx) {
        await deleteTransaction(deletingTrx.id).unwrap();
        alert('Transaction record deleted successfully.');
      } else if (deletingGroup) {
        await Promise.all(
          deletingGroup.transactions.map((t: Transaction) =>
            deleteTransaction(t.id).unwrap()
          )
        );
        alert(`Successfully deleted all ${deletingGroup.transactions.length} records under this demand.`);
      }
      setOpenDeleteModal(false);
      setDeletingTrx(null);
      setDeletingGroup(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to delete record.');
    }
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
      demandTrxNo?: string;
      previousReferences?: (string | { ref: string; amount?: number; date?: string })[];
    }
  ) => {
    let baseReceipt: Receipt;

    if (r) {
      const linkedTrx = fallbackTrx || (r.transaction?.id ? r.transaction : rawTransactions.find((t) => t.id === (r as any).transaction_id || t.receipt?.id === r.id));
      const cleanReceiptNo = r.receipt_no && r.receipt_no.startsWith('RCT-TRX-')
        ? (linkedTrx?.transaction_no || r.receipt_no.replace(/^RCT-/, ''))
        : r.receipt_no;
      baseReceipt = {
        ...r,
        receipt_no: cleanReceiptNo || linkedTrx?.transaction_no || linkedTrx?.month || r.receipt_no,
        transaction: linkedTrx || r.transaction,
      };
    } else if (fallbackTrx) {
      const cleanReceiptNo = fallbackTrx.receipt?.receipt_no && !fallbackTrx.receipt.receipt_no.startsWith('RCT-TRX-')
        ? fallbackTrx.receipt.receipt_no
        : (fallbackTrx.transaction_no || fallbackTrx.month || `TRX-${fallbackTrx.id}`);
      baseReceipt = {
        id: fallbackTrx.id,
        receipt_no: cleanReceiptNo,
        receipt_date: fallbackTrx.transaction_date || new Date().toISOString().split('T')[0],
        amount: Number(fallbackTrx.amount || 0),
        payment_method: (fallbackTrx.member_payment_method as any) || 'cash',
        member: fallbackTrx.member,
        transaction: fallbackTrx,
        created_at: fallbackTrx.created_at,
        updated_at: fallbackTrx.updated_at,
      };
    } else {
      return;
    }

    const desc = baseReceipt.transaction?.description || fallbackTrx?.description || '';
    const installmentAmount = Number(baseReceipt.amount || 0);

    // Locate the member and find all related transactions for this member and billing cycle
    const targetTrx = (fallbackTrx || baseReceipt.transaction) as any;
    const memberId = targetTrx?.member?.id || targetTrx?.member_id || (baseReceipt.member as any)?.id;
    const targetMonth = targetTrx?.month;
    const targetTrxNo = targetTrx?.transaction_no;

    const relatedTrxList = rawTransactions.filter((t) => {
      const mId = t.member?.id || (t as any).member_id;
      if (mId !== memberId) return false;

      if (targetMonth && t.month) {
        return t.month.trim().toLowerCase() === targetMonth.trim().toLowerCase();
      }
      if (targetTrxNo && t.transaction_no && t.transaction_no === targetTrxNo) {
        return true;
      }
      return false;
    }).sort((a, b) => {
      const dateA = a.updated_at || a.created_at || a.transaction_date || '';
      const dateB = b.updated_at || b.created_at || b.transaction_date || '';
      return dateA.localeCompare(dateB) || (a.id || 0) - (b.id || 0);
    });

    const relatedPaidList = relatedTrxList.filter((t) => t.status === 'paid');
    const relatedPendingList = relatedTrxList.filter((t) => t.status === 'pending');

    const totalPaidSoFar = relatedPaidList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalPendingRemaining = relatedPendingList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalAssignedTarget = totalPaidSoFar + totalPendingRemaining;

    // Calculate progression up to this specific transaction if paid in multiple installments
    const currIndex = relatedPaidList.findIndex((t) => t.id === targetTrx?.id || t.transaction_no === targetTrx?.transaction_no);
    let cumulativeUpToThis = 0;
    let prevUpToThis = 0;
    if (currIndex >= 0) {
      for (let i = 0; i <= currIndex; i++) {
        cumulativeUpToThis += Number(relatedPaidList[i].amount || 0);
        if (i < currIndex) {
          prevUpToThis += Number(relatedPaidList[i].amount || 0);
        }
      }
    } else {
      cumulativeUpToThis = totalPaidSoFar || installmentAmount;
      prevUpToThis = Math.max(0, cumulativeUpToThis - installmentAmount);
    }

    const totalDue = partialMeta?.totalDueAmount !== undefined
      ? partialMeta.totalDueAmount
      : (relatedPendingList.length > 0 ? totalPendingRemaining : 0);

    const totalPaid = partialMeta?.totalPaidAmount !== undefined
      ? partialMeta.totalPaidAmount
      : cumulativeUpToThis;

    const totalAssigned = partialMeta?.totalAssignedAmount !== undefined
      ? partialMeta.totalAssignedAmount
      : (totalAssignedTarget || totalPaid + totalDue);

    const previousPaid = partialMeta?.previousPaidAmount !== undefined
      ? partialMeta.previousPaidAmount
      : prevUpToThis;

    // A payment is only partial if there is actually a pending due remaining > 0 and totalAssigned > totalPaid
    const isPartial = partialMeta?.isPartial !== undefined
      ? (partialMeta.isPartial && totalDue > 0)
      : (totalDue > 0 && totalAssigned > totalPaid);

    let previousReferences: (string | { ref: string; amount?: number; date?: string })[] = partialMeta?.previousReferences || [];
    if (previousReferences.length === 0 && relatedPaidList.length > 1) {
      const prevTrxList = currIndex >= 0 ? relatedPaidList.slice(0, currIndex) : relatedPaidList.slice(0, -1);
      previousReferences = prevTrxList.map((t) => {
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
    }

    if (previousReferences.length === 0 && desc) {
      const refMatches = Array.from(desc.matchAll(/Ref:\s*([^|\n-]+)/gi)).map((m) => m[1].trim()).filter(Boolean);
      if (refMatches.length > 1) {
        previousReferences = refMatches.slice(0, -1);
      }
    }

    const monthKey = fallbackTrx?.month || baseReceipt.transaction?.month || (desc ? MONTH_NAMES.find((m) => desc.toLowerCase().includes(m.toLowerCase())) : null);
    let parentDemandTrxNo = '';
    if (monthKey) {
      const match = createdDemandGroups.find((g) =>
        (g.month && g.month.trim().toLowerCase() === String(monthKey).trim().toLowerCase()) ||
        g.title.toLowerCase().includes(String(monthKey).trim().toLowerCase())
      );
      if (match?.transaction_no) {
        parentDemandTrxNo = match.transaction_no;
      }
    }

    const demandTrxNo = partialMeta?.demandTrxNo || parentDemandTrxNo || baseReceipt.receipt_no || fallbackTrx?.transaction_no;

    let adminComment =
      (baseReceipt as any).admin_note ||
      (baseReceipt as any).accountant_note ||
      (baseReceipt as any).admin_comment ||
      (baseReceipt as any).notes ||
      (targetTrx as any)?.admin_note ||
      (targetTrx as any)?.accountant_note ||
      (targetTrx as any)?.notes ||
      '';

    if (!adminComment && desc) {
      const match = desc.match(/(?:(?:admin|accountant|officer|staff)\s+)?(?:note|remarks|comment)s?\s*[:\-–—]\s*([^|\n]+)/i);
      if (match && match[1]) {
        adminComment = match[1].trim();
      }
    }

    const enrichedReceipt: Receipt & {
      isPartial?: boolean;
      totalPaidAmount?: number;
      previousPaidAmount?: number;
      totalDueAmount?: number;
      totalAssignedAmount?: number;
      installmentAmount?: number;
      demandTrxNo?: string;
      previousReferences?: (string | { ref: string; amount?: number; date?: string })[];
      admin_note?: string;
      confirmed_by?: any;
    } = {
      ...baseReceipt,
      receipt_no: demandTrxNo || baseReceipt.receipt_no,
      demandTrxNo: demandTrxNo,
      isPartial,
      totalPaidAmount: totalPaid,
      previousPaidAmount: previousPaid,
      totalDueAmount: isPartial ? totalDue : 0,
      totalAssignedAmount: totalAssigned,
      installmentAmount: installmentAmount,
      previousReferences: previousReferences,
      admin_note: adminComment || (baseReceipt as any).admin_note,
      confirmed_by:
        baseReceipt.confirmed_by ||
        (targetTrx as any)?.confirmed_by ||
        targetTrx?.last_modified_by ||
        targetTrx?.updated_by ||
        (() => {
          const a = getAuditorInfo(targetTrx || baseReceipt.transaction);
          return a ? { id: a.id, name: a.name, role: a.role, member_no: a.member_no } : undefined;
        })(),
    };

    setPrintReceipt(enrichedReceipt as any);

    setTimeout(() => {
      window.print();
      setPrintReceipt(null);
    }, 150);
  };

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

  const openCollectPaymentModal = (trx: Transaction) => {
    setCollectingTrx(trx);
    const defaultAmount =
      trx.member_paid_amount !== null && trx.member_paid_amount !== undefined
        ? String(trx.member_paid_amount)
        : String(trx.amount);
    setPaidAmountInput(defaultAmount);
    setPaymentMethodInput((trx.member_payment_method as any) || 'cash');
    setPaymentDateInput(new Date().toISOString().split('T')[0]);
    setPaymentTimeInput(getCurrentTimeHM());
    setPaymentTrxRefInput(trx.member_trx_reference || '');
    setPaymentNotesInput(trx.member_comment || '');
    setOpenCollectModal(true);
  };

  const handleConfirmCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingTrx) return;

    const numAmount = Number(paidAmountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    const memberName = collectingTrx.member?.name || 'Member';
    const confirmed = window.confirm(
      `Are you sure you want to collect and record payment of BDT ${numAmount.toLocaleString()} for ${memberName} and issue an official receipt?`
    );
    if (!confirmed) return;

    try {
      const combinedNotes: string[] = [];
      if (paymentTrxRefInput.trim()) combinedNotes.push(`Ref: ${paymentTrxRefInput.trim()}`);
      if (paymentNotesInput.trim()) combinedNotes.push(`Note: ${paymentNotesInput.trim()}`);
      if (paymentTimeInput.trim()) combinedNotes.push(`Settlement Time: ${paymentTimeInput.trim()}`);

      const res = await collectPayment({
        id: collectingTrx.id,
        body: {
          paid_amount: numAmount,
          payment_method: paymentMethodInput,
          payment_date: paymentDateInput,
          trx_reference: paymentTrxRefInput.trim() || undefined,
          reference: paymentTrxRefInput.trim() || undefined,
          notes: combinedNotes.length > 0 ? combinedNotes.join(' | ') : (paymentNotesInput.trim() || undefined),
        },
      }).unwrap();

      alert(res.message || 'Payment collected and official receipt issued successfully!');
      setOpenCollectModal(false);
      setCollectingTrx(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to collect payment.');
    }
  };

  const openRejectProofModal = (trx: Transaction) => {
    setOpenCollectModal(false);
    setRejectingTrx(trx);
    setRejectionReasonInput('');
    setOpenRejectModal(true);
  };

  const handleConfirmRejectProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTrx) return;

    if (!rejectionReasonInput.trim()) {
      alert('Please provide a specific reason explaining why the payment slip is being declined.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reject this payment proof slip for ${rejectingTrx.member?.name || 'Member'}?\n\nReason: "${rejectionReasonInput.trim()}"\n\nA new pending due will be generated for the member to re-upload.`
    );
    if (!confirmed) return;

    try {
      await rejectReceiptPhoto({
        id: rejectingTrx.id,
        body: { reason: rejectionReasonInput.trim() },
      }).unwrap();

      alert('Payment proof slip has been rejected. The member has been notified to submit a valid slip.');
      setOpenRejectModal(false);
      setRejectingTrx(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to reject slip.');
    }
  };

  const handleToggleMonth = (monthWithYear: string) => {
    const mName = monthWithYear.split(' ')[0];
    if (createdMonthsSet.has(monthWithYear) || createdMonthsSet.has(mName)) return;
    if (selectedMonths.includes(monthWithYear)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== monthWithYear));
    } else {
      setSelectedMonths([...selectedMonths, monthWithYear]);
    }
  };

  const handleSelectAllMonths = () => {
    const available = MONTH_NAMES
      .map((m) => `${m} ${demandYear}`)
      .filter((mKey) => !createdMonthsSet.has(mKey) && !createdMonthsSet.has(mKey.split(' ')[0]));
    setSelectedMonths(available);
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

    const trimmedTrxNo = demandTrxNo.trim();
    if (trimmedTrxNo && isTrxNoDuplicate) {
      alert(`The Transaction ID "${trimmedTrxNo}" is already in use by another transaction. Please provide a unique Transaction ID or click "Auto Generate".`);
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
        transaction_no: trimmedTrxNo || undefined,
      }).unwrap();

      alert(`Success! Generated ${res.count} pending payment demands for members.`);
      setOpenDemand(false);
      setDemandTrxNo('');
    } catch (err: any) {
      alert(err?.data?.message || err?.data?.errors?.transaction_no?.[0] || 'Failed to generate payment demands.');
    }
  };

  return (
    <>
      <div className={printReceipt ? 'space-y-5 print:hidden' : 'space-y-5'}>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Receipts &amp; Slips Verification</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Browse cleared receipts, pending dues, and rejected proof slips per member, review rejection reasons, settle dues, and print official society receipts.
            </p>
          </div>

          {canEditTrx && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                onClick={() => {
                  const settingsList = Array.isArray(settings) ? settings : (settings as any)?.data || [];
                  const defaultFee =
                    settingsList.find((s: any) => s.setting_key === 'monthly_subscription_default')?.setting_value ||
                    settingsList.find((s: any) => s.setting_key === 'payment_amount_1')?.setting_value ||
                    '2000';
                  setDemandCategory('monthly_payment');
                  setDemandAmount(defaultFee);
                  setTargetAllMembers(true);
                  setSelectedMemberId('');
                  const currentYr = new Date().getFullYear();
                  setDemandYear(currentYr);
                  const firstAvailable = MONTH_NAMES
                    .map((m) => `${m} ${currentYr}`)
                    .find((mKey) => !createdMonthsSet.has(mKey) && !createdMonthsSet.has(mKey.split(' ')[0]));
                  setSelectedMonths(firstAvailable ? [firstAvailable] : []);
                  setOpenDemand(true);
                }}
                className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm"
              >
                <CalendarCheck className="h-4 w-4" /> Create / Assign Payment
              </Button>
            </div>
          )}
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Cleared Receipts</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-extrabold text-emerald-800 mt-1.5">
              {stats.currentClearedCount}
            </p>
            <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
              BDT {stats.totalClearedAmount.toLocaleString()} cleared
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 uppercase">Partially Paid</span>
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xl font-extrabold text-purple-800 mt-1.5">
              {stats.currentPartialCount}
            </p>
            <p className="text-[11px] font-mono text-purple-700 mt-0.5">
              BDT {stats.partialCollectedAmount.toLocaleString()} collected
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase">Receipts Received</span>
              <FileCheck className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xl font-extrabold text-blue-800 mt-1.5">
              {stats.currentReceivedCount}
            </p>
            <p className="text-[11px] font-mono text-blue-700 mt-0.5">
              BDT {stats.receivedSlipsAmount.toLocaleString()} in review
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase">Due Pending</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xl font-extrabold text-amber-800 mt-1.5">
              {stats.currentDueCount}
            </p>
            <p className="text-[11px] font-mono text-amber-700 mt-0.5">
              BDT {stats.duePendingAmount.toLocaleString()} pending
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 uppercase">Rejected Slips</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-xl font-extrabold text-red-800 mt-1.5">
              {stats.currentRejectedCount}
            </p>
            <p className="text-[11px] font-mono text-red-700 mt-0.5">
              BDT {stats.rejectedSlipsAmount.toLocaleString()} declined
            </p>
          </div>
        </div>

        {/* Main Ledger Control & View Switcher */}
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
                  onClick={() => setActiveTab('members')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'members'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-emerald-700" />
                  Member Folders ({stats.totalMembers})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ReceiptIcon className="h-3.5 w-3.5 text-emerald-700" />
                  All Records Table ({allChronologicalItems.length})
                </button>
              </div>

              {/* Status Quick Filter Buttons */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" /> Cleared
                </button>
                <button
                  onClick={() => setStatusFilter('partial')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'partial'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <Wallet className="h-3 w-3" /> Partial
                </button>
                <button
                  onClick={() => setStatusFilter('received_slip')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'received_slip'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <FileCheck className="h-3 w-3" /> Receipts Received ({stats.currentReceivedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="h-3 w-3" /> Dues ({stats.currentDueCount})
                </button>
                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'rejected'
                      ? 'bg-red-700 text-white shadow-2xs'
                      : 'bg-red-50 text-red-800 hover:bg-red-100'
                  }`}
                >
                  <XCircle className="h-3 w-3" /> Rejected
                </button>
              </div>
            </div>

            {/* Search & Method Filter */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search name, ID, receipt, trx#..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 text-xs h-9"
                />
              </div>

              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                className="border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-slate-50 text-slate-700 font-medium h-9"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* VIEW 1: CREATED DEMAND BATCHES */}
          {activeTab === 'created' && (
            <div className="space-y-4">
              <Card className="border-slate-200 shadow-xs overflow-hidden">
                <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Society Billing Demands &amp; Campaign Ledger
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track progress, edit fees, and inspect submitted receipt slips for each created billing demand.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {filteredCreatedGroups.length} Billing Batches
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <Table className="table-fixed w-full">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="text-xs font-bold text-slate-700">
                        <TableHead className="w-[24%] px-3">Transaction / Batch Name</TableHead>
                        <TableHead className="w-[16%] px-3">Created / Modified By</TableHead>
                        <TableHead className="w-[26%] px-3">Member Receipts &amp; Dues</TableHead>
                        <TableHead className="w-[12%] px-3">Status</TableHead>
                        <TableHead className="w-[11%] px-3">Due Date</TableHead>
                        <TableHead className="w-[11%] px-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredCreatedGroups.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                            <ReceiptIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                            No created transactions found matching your filters.
                          </TableCell>
                        </TableRow>
                      )}

                      {filteredCreatedGroups.map((group) => {
                        const isExpanded = !!expandedGroups[group.key];
                        const modifier = getModifierInfo(group);
                        const displayDate = group.dueDate;

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
                                    {(group.transaction_no || group.id) && (
                                      <span className="text-[11px] font-mono text-slate-500">
                                        #{group.transaction_no || group.id}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-3 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs truncate">{modifier.name}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 capitalize ${
                                        modifier.role === 'super_admin'
                                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {modifier.role?.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-col text-[10px] text-slate-500 leading-tight">
                                    <span className="font-medium text-slate-700">
                                      {modifier.action} entry
                                    </span>
                                    {modifier.date && (
                                      <span className="text-slate-500 font-mono text-[10px]">
                                        {formatDateTime(modifier.date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-3 py-3.5">
                                <div className="space-y-1 max-w-xs">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                      <Users className="h-3 w-3 text-slate-500 inline" />
                                      <span>{group.paidCount} / {group.totalMembersAssigned} Cleared</span>
                                      {group.partiallyPaidCount > 0 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                          {group.partiallyPaidCount} Partial
                                        </span>
                                      )}
                                    </span>
                                    <span className={`font-bold text-[11px] ${
                                      group.isFullyPaid ? 'text-emerald-700' : 'text-amber-800'
                                    }`}>
                                      {group.memberProgressPercent}%
                                    </span>
                                  </div>

                                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        group.isFullyPaid
                                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                                          : 'bg-gradient-to-r from-emerald-600 to-teal-500'
                                      }`}
                                      style={{ width: `${group.memberProgressPercent}%` }}
                                    />
                                    {!group.isFullyPaid && (
                                      <div
                                        className="bg-amber-200 h-full transition-all duration-500"
                                        style={{ width: `${100 - group.memberProgressPercent}%` }}
                                      />
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                                    <span className="text-emerald-700 font-bold">
                                      Collected: BDT {group.totalCollectedAmount.toLocaleString()}
                                    </span>
                                    <span className="text-slate-600 font-semibold">
                                      Target: BDT {group.totalDemandAmount.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* 5 Status Counters in their own distinct theme colors */}
                                  <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-200/80 text-[10px] font-bold">
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                        group.paidCount > 0
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                                          : 'bg-slate-50 text-slate-400 border-slate-200'
                                      }`}
                                      title="Fully Paid / Cleared Members"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      {group.paidCount} Cleared
                                    </span>

                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                        group.partiallyPaidCount > 0
                                          ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs'
                                          : 'bg-slate-50 text-slate-400 border-slate-200'
                                      }`}
                                      title="Partially Paid Members"
                                    >
                                      <Wallet className="h-3 w-3 text-purple-600" />
                                      {group.partiallyPaidCount} Partial
                                    </span>

                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                        group.receivedSlipCount > 0
                                          ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                                          : 'bg-slate-50 text-slate-400 border-slate-200'
                                      }`}
                                      title="Payment Slip Received (Awaiting Confirmation)"
                                    >
                                      <FileCheck className="h-3 w-3 text-blue-600" />
                                      {group.receivedSlipCount} Received
                                    </span>

                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                        group.duePendingCount > 0
                                          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                                          : 'bg-slate-50 text-slate-400 border-slate-200'
                                      }`}
                                      title="Pending Unpaid Dues"
                                    >
                                      <Clock className="h-3 w-3 text-amber-600" />
                                      {group.duePendingCount} Due
                                    </span>

                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                        group.rejectedCount > 0
                                          ? 'bg-red-50 text-red-800 border-red-300 shadow-2xs'
                                          : 'bg-slate-50 text-slate-400 border-slate-200'
                                      }`}
                                      title="Rejected Proof Slips"
                                    >
                                      <XCircle className="h-3 w-3 text-red-600" />
                                      {group.rejectedCount} Rejected
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-3 py-3.5">
                                {group.isFullyPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    Complete
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                    Pending ({group.duePendingCount} Due)
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="px-3 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                                {displayDate}
                              </TableCell>

                              <TableCell className="px-3 py-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {canEditTrx && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditBatchGroup(group)}
                                        className="h-8 px-2 text-xs cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                        title="Edit demand price for assigned members"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                        Edit Price
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => promptDeleteGroup(group)}
                                        className="h-8 px-2 text-xs cursor-pointer border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                        title="Delete this demand and all assigned member records"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleExpandGroup(group.key)}
                                    className="h-8 text-xs cursor-pointer border-slate-200 hover:bg-slate-100"
                                  >
                                    {isExpanded ? 'Hide' : 'View Details'} ({group.totalMembersAssigned})
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expandable Members Sub-Table under Created Transaction */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                <TableCell colSpan={6} className="p-4">
                                  <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-emerald-700" />
                                        Assigned Members &amp; Receipts for {group.title}
                                      </h4>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-emerald-700 font-bold">{group.paidCount} Cleared</span>
                                        {group.partiallyPaidCount > 0 && (
                                          <span className="text-purple-700 font-bold border-l border-slate-300 pl-2">{group.partiallyPaidCount} Partially Paid</span>
                                        )}
                                        <span className="text-amber-700 font-bold border-l border-slate-300 pl-2">{group.pendingCount} Dues Remaining</span>
                                      </div>
                                    </div>

                                    <div className="border border-slate-100 rounded-lg overflow-x-auto">
                                      <Table className="table-fixed w-full min-w-[1000px]">
                                        <TableHeader className="bg-slate-50">
                                          <TableRow className="text-xs">
                                            <TableHead className="w-[14%] text-center">Member Name</TableHead>
                                            <TableHead className="w-[10%] text-center">Member ID</TableHead>
                                            <TableHead className="w-[10%] text-center">Date</TableHead>
                                            <TableHead className="w-[14%] text-center">Reference ID</TableHead>
                                            <TableHead className="w-[12%] text-center">Amount</TableHead>
                                            <TableHead className="w-[12%] text-center">Receipt Proof</TableHead>
                                            <TableHead className="w-[12%] text-center">Status</TableHead>
                                            <TableHead className="w-[16%] text-center">Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {(() => {
                                            const memberTrxMap: Record<string | number, Transaction[]> = {};
                                            group.transactions.forEach((trx) => {
                                              const mId = trx.member?.id || (trx as any).member_id || `anon_${trx.id}`;
                                              if (!memberTrxMap[mId]) {
                                                memberTrxMap[mId] = [];
                                              }
                                              memberTrxMap[mId].push(trx);
                                            });

                                            const memberRows = Object.entries(memberTrxMap).map(([mId, trxList]) => {
                                              const chronologicalList = [...trxList].sort((a, b) => {
                                                const dateA = a.created_at || a.updated_at || a.transaction_date || '';
                                                const dateB = b.created_at || b.updated_at || b.transaction_date || '';
                                                return dateA.localeCompare(dateB) || (Number(a.id) || 0) - (Number(b.id) || 0);
                                              });

                                              const paidList = chronologicalList.filter((t) => t.status === 'paid');
                                              const pendingList = chronologicalList.filter((t) => t.status === 'pending');
                                              const rejectedList = chronologicalList.filter((t) => t.status === 'rejected');
                                              const totalPaidAmount = paidList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                              const totalDueAmount = pendingList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                              const primaryTrx = pendingList[pendingList.length - 1] || chronologicalList[chronologicalList.length - 1] || chronologicalList[0];
                                              const isPartial = paidList.length > 0 && pendingList.length > 0;
                                              const isFullyPaid = paidList.length > 0 && pendingList.length === 0;
                                              const isSlipReceived = !isFullyPaid && pendingList.some((t) => !!t.receipt_photo);
                                              const isRejectedActive = !isFullyPaid && !isSlipReceived && rejectedList.length > 0;

                                              let currentBatchStatus: 'cleared' | 'partial' | 'received_slip' | 'due' | 'rejected' = 'due';
                                              if (isFullyPaid) currentBatchStatus = 'cleared';
                                              else if (isSlipReceived) currentBatchStatus = 'received_slip';
                                              else if (isRejectedActive) currentBatchStatus = 'rejected';
                                              else if (isPartial) currentBatchStatus = 'partial';
                                              else currentBatchStatus = 'due';

                                              const latestWithPhoto = [...chronologicalList].reverse().find((t) => t.receipt_photo);

                                              return {
                                                memberId: mId,
                                                memberName: primaryTrx?.member?.name ?? '-',
                                                memberNo: primaryTrx?.member?.member_no || (primaryTrx?.member as any)?.member_profile?.member_no || 'Unassigned',
                                                transactions: chronologicalList,
                                                paidList,
                                                pendingList,
                                                rejectedList,
                                                totalPaidAmount,
                                                totalDueAmount,
                                                isPartial,
                                                isFullyPaid,
                                                isRejectedActive,
                                                isSlipReceived,
                                                currentBatchStatus,
                                                primaryTrx,
                                                latestPhotoTrx: latestWithPhoto,
                                              };
                                            })
                                            .filter((mGroup) => {
                                              if (statusFilter === 'paid' && mGroup.currentBatchStatus !== 'cleared') return false;
                                              if (statusFilter === 'partial' && mGroup.currentBatchStatus !== 'partial') return false;
                                              if (statusFilter === 'received_slip' && mGroup.currentBatchStatus !== 'received_slip') return false;
                                              if (statusFilter === 'pending' && mGroup.currentBatchStatus !== 'due') return false;
                                              if (statusFilter === 'rejected' && mGroup.currentBatchStatus !== 'rejected') return false;

                                              if (paymentMethodFilter !== 'all') {
                                                const hasMethod = mGroup.transactions.some((t) => {
                                                  const m = (t.member_payment_method || (t.receipt?.payment_method) || (t.type === 'deposit' ? 'cash' : '')).toLowerCase();
                                                  return m.includes(paymentMethodFilter.toLowerCase());
                                                });
                                                if (!hasMethod) return false;
                                              }

                                              if (searchQuery.trim()) {
                                                const q = searchQuery.toLowerCase();
                                                const nameMatch = mGroup.memberName.toLowerCase().includes(q);
                                                const noMatch = mGroup.memberNo.toLowerCase().includes(q);
                                                const hasMatchingTrx = mGroup.transactions.some((t) => {
                                                  return (
                                                    (t.transaction_no || '').toLowerCase().includes(q) ||
                                                    (t.description || '').toLowerCase().includes(q) ||
                                                    (t.month || '').toLowerCase().includes(q)
                                                  );
                                                });
                                                if (!nameMatch && !noMatch && !hasMatchingTrx) return false;
                                              }

                                              return true;
                                            })
                                            .sort((a, b) => a.memberName.localeCompare(b.memberName));

                                            return memberRows.map((mGroup) => {
                                              const expandKey = `${group.key}___mem_${mGroup.memberId}`;
                                              const isExpanded = !!expandedGroups[expandKey];
                                              const latestPaidTrx = mGroup.paidList[mGroup.paidList.length - 1];
                                              const latestRejectedTrx = mGroup.rejectedList[mGroup.rejectedList.length - 1];

                                              return (
                                                <React.Fragment key={expandKey}>
                                                  <TableRow className="text-xs hover:bg-slate-50/80">
                                                    <TableCell className="p-3 align-middle text-center font-semibold text-slate-900">
                                                      <div className="flex items-center justify-center gap-1.5">
                                                        <span>{mGroup.memberName}</span>
                                                        {mGroup.transactions.length > 1 && (
                                                          <button
                                                            type="button"
                                                            onClick={() => toggleExpandGroup(expandKey)}
                                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-0.5 border border-slate-200"
                                                          >
                                                            <span>{mGroup.transactions.length} items</span>
                                                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                          </button>
                                                        )}
                                                      </div>
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center font-mono font-bold text-slate-700">
                                                      {mGroup.memberNo}
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center text-slate-600">
                                                      {mGroup.isRejectedActive || mGroup.currentBatchStatus === 'rejected' ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="font-bold text-rose-700 text-xs flex items-center gap-1">
                                                            <XCircle className="h-3 w-3 inline text-rose-600 shrink-0" />
                                                            <span>Rejected: {formatDateTime(latestRejectedTrx?.updated_at || latestRejectedTrx?.created_at)}</span>
                                                          </span>
                                                          {mGroup.latestPhotoTrx?.receipt_photo_uploaded_at && (
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                              Received / Slip: {formatDateTime(mGroup.latestPhotoTrx.receipt_photo_uploaded_at)}
                                                            </span>
                                                          )}
                                                          <span className="text-[10px] text-slate-400 font-medium">
                                                            Due: {mGroup.primaryTrx.transaction_date}
                                                          </span>
                                                        </div>
                                                      ) : mGroup.isFullyPaid ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600 inline shrink-0" />
                                                            <span>Settled: {formatDateTime(latestPaidTrx?.updated_at || latestPaidTrx?.created_at || mGroup.primaryTrx.transaction_date)}</span>
                                                          </span>
                                                          {mGroup.latestPhotoTrx?.receipt_photo_uploaded_at && (
                                                            <span className="text-[10px] text-blue-700 font-medium">
                                                              Received / Slip: {formatDateTime(mGroup.latestPhotoTrx.receipt_photo_uploaded_at)}
                                                            </span>
                                                          )}
                                                          <span className="text-[10px] text-slate-400 font-medium">
                                                            Due: {mGroup.primaryTrx.transaction_date}
                                                          </span>
                                                        </div>
                                                      ) : mGroup.isPartial ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="font-bold text-purple-900 text-xs flex items-center gap-1">
                                                            <Wallet className="h-3 w-3 text-purple-700 inline shrink-0" />
                                                            <span>Settled: {formatDateTime(latestPaidTrx?.updated_at || latestPaidTrx?.created_at)}</span>
                                                          </span>
                                                          {mGroup.latestPhotoTrx?.receipt_photo_uploaded_at && (
                                                            <span className="text-[10px] text-blue-700 font-medium">
                                                              Received / Slip: {formatDateTime(mGroup.latestPhotoTrx.receipt_photo_uploaded_at)}
                                                            </span>
                                                          )}
                                                          <span className="text-[10px] text-slate-400 font-medium">
                                                            Due: {mGroup.primaryTrx.transaction_date}
                                                          </span>
                                                        </div>
                                                      ) : mGroup.isSlipReceived ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="font-bold text-blue-800 text-xs flex items-center gap-1">
                                                            <FileCheck className="h-3 w-3 text-blue-600 inline shrink-0" />
                                                            <span>Received / Slip: {formatDateTime(mGroup.latestPhotoTrx?.receipt_photo_uploaded_at || mGroup.primaryTrx.updated_at)}</span>
                                                          </span>
                                                          <span className="text-[10px] text-amber-700 font-medium italic">
                                                            Settlement: Pending Collection
                                                          </span>
                                                          <span className="text-[10px] text-slate-400 font-medium">
                                                            Due: {mGroup.primaryTrx.transaction_date}
                                                          </span>
                                                        </div>
                                                      ) : (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="font-medium text-slate-700 text-xs">
                                                            Due: {mGroup.primaryTrx.transaction_date}
                                                          </span>
                                                          {mGroup.primaryTrx.created_at && (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                              Demand Issued: {formatDateTime(mGroup.primaryTrx.created_at)}
                                                            </span>
                                                          )}
                                                        </div>
                                                      )}
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center font-mono font-bold text-slate-700">
                                                      {mGroup.isRejectedActive || mGroup.currentBatchStatus === 'rejected' ? (
                                                        <span className="text-slate-400 font-normal">-</span>
                                                      ) : mGroup.isFullyPaid || mGroup.isPartial ? (
                                                        (() => {
                                                          const paidRct = latestPaidTrx?.receipt || mGroup.primaryTrx.receipt;
                                                          const refId = extractInputtedReference(latestPaidTrx || mGroup.primaryTrx, paidRct);
                                                          return <span className="font-bold text-slate-800 font-mono">{refId || '-'}</span>;
                                                        })()
                                                      ) : mGroup.isSlipReceived ? (
                                                        (() => {
                                                          const ref = mGroup.latestPhotoTrx?.member_trx_reference;
                                                          return ref ? (
                                                            <span className="font-mono text-slate-800 font-bold">{ref}</span>
                                                          ) : (
                                                            <span className="text-[10px] text-blue-700 italic font-medium">Slip Submitted</span>
                                                          );
                                                        })()
                                                      ) : (
                                                        <span className="text-slate-400 font-normal">-</span>
                                                      )}
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center font-bold text-slate-900 whitespace-nowrap">
                                                      {mGroup.isPartial ? (
                                                        <div className="flex flex-col items-center">
                                                          <span className="text-emerald-800 font-bold">
                                                            Paid: BDT {mGroup.totalPaidAmount.toLocaleString()}
                                                          </span>
                                                          <span className="text-[10px] text-amber-700 font-bold">
                                                            Due: BDT {mGroup.totalDueAmount.toLocaleString()}
                                                          </span>
                                                        </div>
                                                      ) : (
                                                        <span>BDT {Number(mGroup.primaryTrx.amount).toLocaleString()}</span>
                                                      )}
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center">
                                                      {mGroup.latestPhotoTrx?.receipt_photo ? (
                                                        <div className="flex justify-center">
                                                          <ReceiptSlipThumbnail
                                                            photoUrl={mGroup.latestPhotoTrx.receipt_photo}
                                                            title={`${mGroup.memberName} - ${group.title}`}
                                                            date={mGroup.latestPhotoTrx.receipt_photo_uploaded_at ? `Uploaded: ${formatDateTime(mGroup.latestPhotoTrx.receipt_photo_uploaded_at)}` : undefined}
                                                            isRejected={mGroup.isRejectedActive}
                                                            isPartial={mGroup.isPartial}
                                                            isSlipReceived={mGroup.isSlipReceived}
                                                            rejectionReason={mGroup.latestPhotoTrx.rejection_reason}
                                                            onClick={() => viewReceiptPhoto(
                                                              mGroup.latestPhotoTrx!.receipt_photo!,
                                                              `${mGroup.memberName} - ${group.title}`,
                                                              mGroup.latestPhotoTrx!.receipt_photo_uploaded_at,
                                                              mGroup.isRejectedActive,
                                                              mGroup.latestPhotoTrx!.rejection_reason
                                                            )}
                                                          />
                                                        </div>
                                                      ) : (
                                                        <span className="text-[11px] text-slate-400 italic text-center block">
                                                          No slip uploaded
                                                        </span>
                                                      )}
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center">
                                                      {mGroup.isFullyPaid ? (
                                                        <div className="flex flex-col items-center justify-center">
                                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Paid
                                                          </span>
                                                          {renderStaffAuditBadge(getAuditorInfo(latestPaidTrx || mGroup.primaryTrx), true)}
                                                        </div>
                                                      ) : mGroup.isSlipReceived ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap shadow-2xs">
                                                          <FileCheck className="h-3.5 w-3.5 text-blue-600" /> Receipt Received
                                                        </span>
                                                      ) : mGroup.isPartial ? (
                                                        <div className="flex flex-col items-center justify-center">
                                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap shadow-2xs">
                                                            <Wallet className="h-3.5 w-3.5 text-purple-600" /> Partially Paid
                                                          </span>
                                                          {renderStaffAuditBadge(getAuditorInfo(latestPaidTrx || mGroup.primaryTrx), true)}
                                                        </div>
                                                      ) : mGroup.isRejectedActive ? (
                                                        <div className="flex flex-col items-center justify-center">
                                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap shadow-2xs">
                                                            <XCircle className="h-3.5 w-3.5 text-red-600" /> Slip Rejected
                                                          </span>
                                                          {renderStaffAuditBadge(getAuditorInfo(latestRejectedTrx || mGroup.primaryTrx), false)}
                                                        </div>
                                                      ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap shadow-2xs">
                                                          <Clock className="h-3.5 w-3.5 text-amber-600" /> Due Pending
                                                        </span>
                                                      )}
                                                    </TableCell>

                                                    <TableCell className="p-3 align-middle text-center">
                                                      <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                                        {mGroup.isFullyPaid ? (
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                              const rootDemandTrx = mGroup.transactions.find((t) => !t.description || !/partial payment/i.test(t.description)) || mGroup.transactions[mGroup.transactions.length - 1] || mGroup.primaryTrx;
                                                              const rootTrxNo = group.transaction_no || rootDemandTrx?.transaction_no || mGroup.primaryTrx?.transaction_no;
                                                              handlePrint(latestPaidTrx?.receipt, rootDemandTrx || latestPaidTrx || mGroup.primaryTrx, {
                                                                isPartial: mGroup.isPartial,
                                                                totalPaidAmount: mGroup.totalPaidAmount,
                                                                totalDueAmount: mGroup.totalDueAmount,
                                                                totalAssignedAmount: mGroup.totalPaidAmount + mGroup.totalDueAmount,
                                                                demandTrxNo: rootTrxNo,
                                                              });
                                                            }}
                                                            className="h-7 min-w-[68px] px-2 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                                            title="Print receipt"
                                                          >
                                                            <Printer className="h-3.5 w-3.5" /> Print
                                                          </Button>
                                                        ) : canManage ? (
                                                          <Button
                                                            size="sm"
                                                            onClick={() => openCollectPaymentModal(mGroup.primaryTrx)}
                                                            className="h-7 min-w-[68px] px-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                                            title="Settle payment"
                                                          >
                                                            <Wallet className="h-3.5 w-3.5" /> Settle
                                                          </Button>
                                                        ) : null}

                                                        {canManage && mGroup.latestPhotoTrx?.receipt_photo && !mGroup.isRejectedActive && !mGroup.isFullyPaid && (
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openRejectProofModal(mGroup.primaryTrx)}
                                                            className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer shadow-2xs flex items-center justify-center"
                                                            title="Reject slip"
                                                          >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                          </Button>
                                                        )}
                                                      </div>
                                                    </TableCell>
                                                  </TableRow>

                                                  {/* Nested Sub-History for Member Multiple Installments */}
                                                  {isExpanded && (
                                                    <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                                      <TableCell colSpan={8} className="p-3">
                                                        <div className="space-y-2 bg-white rounded-lg border border-slate-200 p-3 shadow-inner">
                                                          <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5 text-emerald-700" />
                                                            Full Payment Progression History for {mGroup.memberName}
                                                          </span>
                                                          <div className="border border-slate-200 rounded overflow-hidden">
                                                            <Table>
                                                              <TableHeader className="bg-slate-100 text-[10px]">
                                                                <TableRow>
                                                                  <TableHead className="p-2 text-center">Ref / Trx No</TableHead>
                                                                  <TableHead className="p-2 text-center">Item</TableHead>
                                                                  <TableHead className="p-2 text-center">Date</TableHead>
                                                                  <TableHead className="p-2 text-center">Amount</TableHead>
                                                                  <TableHead className="p-2 text-center">Proof</TableHead>
                                                                  <TableHead className="p-2 text-center">Status</TableHead>
                                                                  <TableHead className="p-2 text-center">Actions</TableHead>
                                                                </TableRow>
                                                              </TableHeader>
                                                              <TableBody>
                                                                {mGroup.transactions.map((histTrx) => {
                                                                  const isHistPartialPaid = Boolean(histTrx.description && (/partial payment/i.test(histTrx.description) || /remaining due/i.test(histTrx.description)));
                                                                  const isHistRemainingDue = Boolean(histTrx.description && /remaining due/i.test(histTrx.description));
                                                                  const isHistPaid = histTrx.status === 'paid';
                                                                  const isHistRejected = histTrx.status === 'rejected';
                                                                  const isHistSlipReceived = histTrx.status === 'pending' && !!histTrx.receipt_photo;
                                                                  const isHistPendingDue = histTrx.status === 'pending' && !histTrx.receipt_photo;

                                                                  const histLinkedReceipt = rawReceipts.find(
                                                                    (r) => r.transaction?.id === histTrx.id || (r as any).transaction_id === histTrx.id || (histTrx.receipt && r.id === histTrx.receipt.id)
                                                                  ) || histTrx.receipt;

                                                                  return (
                                                                    <TableRow key={histTrx.id} className="text-xs hover:bg-slate-50">
                                                                      <TableCell className="p-2 text-center font-mono text-[11px] text-slate-700 font-bold">
                                                                        {isHistRejected || histTrx.status === 'rejected'
                                                                          ? '-'
                                                                          : extractInputtedReference(histTrx, histLinkedReceipt) || histTrx.transaction_no || '-'}
                                                                      </TableCell>
                                                                      <TableCell className="p-2 text-center font-medium text-slate-700">
                                                                        {histTrx.description || histTrx.month || 'Monthly Subscription'}
                                                                      </TableCell>
                                                                      <TableCell className="p-2 text-center text-slate-500">
                                                                        {isHistRejected ? (
                                                                          <div className="flex flex-col items-center gap-0.5">
                                                                            <span className="font-bold text-rose-700 text-[11px] flex items-center gap-1">
                                                                              <XCircle className="h-3 w-3 inline text-rose-600 shrink-0" />
                                                                              <span>Rejected: {formatDateTime(histTrx.updated_at || histTrx.created_at)}</span>
                                                                            </span>
                                                                            {histTrx.receipt_photo_uploaded_at && (
                                                                              <span className="text-[9px] text-slate-500 font-medium">
                                                                                Received / Slip: {formatDateTime(histTrx.receipt_photo_uploaded_at)}
                                                                              </span>
                                                                            )}
                                                                            <span className="text-[9px] text-slate-400">Due: {histTrx.transaction_date}</span>
                                                                          </div>
                                                                        ) : isHistPaid ? (
                                                                          <div className="flex flex-col items-center gap-0.5">
                                                                            <span className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                                                                              <CheckCircle2 className="h-3 w-3 inline text-emerald-600 shrink-0" />
                                                                              <span>Settled: {formatDateTime(histTrx.updated_at || histTrx.transaction_date)}</span>
                                                                            </span>
                                                                            {histTrx.receipt_photo_uploaded_at && (
                                                                              <span className="text-[9px] text-blue-700 font-medium">
                                                                                Received / Slip: {formatDateTime(histTrx.receipt_photo_uploaded_at)}
                                                                              </span>
                                                                            )}
                                                                            <span className="text-[9px] text-slate-400">Due: {histTrx.transaction_date}</span>
                                                                          </div>
                                                                        ) : isHistSlipReceived ? (
                                                                          <div className="flex flex-col items-center gap-0.5">
                                                                            <span className="font-bold text-blue-800 text-[11px] flex items-center gap-1">
                                                                              <FileCheck className="h-3 w-3 inline text-blue-600 shrink-0" />
                                                                              <span>Received / Slip: {formatDateTime(histTrx.receipt_photo_uploaded_at || histTrx.updated_at)}</span>
                                                                            </span>
                                                                            <span className="text-[9px] text-amber-700 italic">Settlement: Pending</span>
                                                                            <span className="text-[9px] text-slate-400">Due: {histTrx.transaction_date}</span>
                                                                          </div>
                                                                        ) : (
                                                                          <div className="flex flex-col items-center gap-0.5">
                                                                            <span className="font-medium text-slate-700 text-[11px]">Due: {histTrx.transaction_date}</span>
                                                                            {histTrx.created_at && (
                                                                              <span className="text-[9px] text-slate-400">Demand: {formatDateTime(histTrx.created_at)}</span>
                                                                            )}
                                                                          </div>
                                                                        )}
                                                                      </TableCell>
                                                                      <TableCell className="p-2 text-center font-bold text-slate-900 whitespace-nowrap">
                                                                        {isHistRemainingDue && histTrx.status === 'pending' ? (
                                                                          <span className="text-purple-950">BDT {Number(histTrx.amount).toLocaleString()} <span className="text-[10px] text-amber-700 font-bold">(Due)</span></span>
                                                                        ) : (
                                                                          <span>BDT {Number(histTrx.amount).toLocaleString()}</span>
                                                                        )}
                                                                      </TableCell>
                                                                      <TableCell className="p-2 text-center">
                                                                        {histTrx.receipt_photo ? (
                                                                          <div className="flex flex-col items-center justify-center gap-0.5">
                                                                            <ReceiptSlipThumbnail
                                                                              photoUrl={histTrx.receipt_photo}
                                                                              title={`${mGroup.memberName} - ${histTrx.month || histTrx.description || 'Receipt'}`}
                                                                              date={
                                                                                isHistRejected
                                                                                  ? `Rejected: ${formatDateTime(histTrx.updated_at || histTrx.created_at)}`
                                                                                  : histTrx.receipt_photo_uploaded_at
                                                                                  ? `Uploaded: ${formatDateTime(histTrx.receipt_photo_uploaded_at)}`
                                                                                  : undefined
                                                                              }
                                                                              isRejected={isHistRejected}
                                                                              isPartial={isHistPartialPaid || Boolean(isHistRemainingDue)}
                                                                              isSlipReceived={isHistSlipReceived}
                                                                              rejectionReason={histTrx.rejection_reason}
                                                                              onClick={() => viewReceiptPhoto(
                                                                                histTrx.receipt_photo!,
                                                                                `${mGroup.memberName} - ${histTrx.month || histTrx.description || 'Receipt'}`,
                                                                                isHistRejected
                                                                                  ? (histTrx.updated_at || histTrx.created_at || histTrx.receipt_photo_uploaded_at)
                                                                                  : histTrx.receipt_photo_uploaded_at,
                                                                                isHistRejected,
                                                                                histTrx.rejection_reason
                                                                              )}
                                                                            />
                                                                            {histTrx.member_paid_amount && (
                                                                              <span className="text-[9px] font-semibold text-emerald-800">
                                                                                Proof: BDT {Number(histTrx.member_paid_amount).toLocaleString()}
                                                                              </span>
                                                                            )}
                                                                          </div>
                                                                        ) : (
                                                                          <span className="text-[10px] text-slate-400 italic">No slip</span>
                                                                        )}
                                                                      </TableCell>
                                                                      <TableCell className="p-2 text-center">
                                                                        {isHistPaid && isHistPartialPaid ? (
                                                                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap">
                                                                            <Wallet className="h-2.5 w-2.5 text-purple-600" /> Partially Paid
                                                                          </span>
                                                                        ) : isHistPaid ? (
                                                                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                                                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Paid
                                                                          </span>
                                                                        ) : isHistSlipReceived ? (
                                                                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap">
                                                                            <FileCheck className="h-2.5 w-2.5 text-blue-600" /> Receipt Received
                                                                          </span>
                                                                        ) : isHistRejected ? (
                                                                          <div className="flex flex-col items-center">
                                                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap">
                                                                              <XCircle className="h-2.5 w-2.5 text-red-600" /> Rejected
                                                                            </span>
                                                                            {histTrx.rejection_reason && (
                                                                              <span className="text-[9px] text-red-600 italic truncate max-w-[120px]" title={histTrx.rejection_reason}>
                                                                                {histTrx.rejection_reason}
                                                                              </span>
                                                                            )}
                                                                          </div>
                                                                        ) : (
                                                                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
                                                                            <Clock className="h-2.5 w-2.5 text-amber-600" /> Due Pending
                                                                          </span>
                                                                        )}
                                                                      </TableCell>
                                                                      <TableCell className="p-2 text-center">
                                                                        <div className="flex items-center justify-center gap-1 flex-wrap">
                                                                          {(histLinkedReceipt || isHistPaid) ? (
                                                                            (() => {
                                                                              const paidHistory = mGroup.transactions
                                                                                .filter((t) => t.status === 'paid')
                                                                                .sort((a, b) => {
                                                                                  const dateA = a.updated_at || a.created_at || a.transaction_date || '';
                                                                                  const dateB = b.updated_at || b.created_at || b.transaction_date || '';
                                                                                  return dateA.localeCompare(dateB) || (a.id || 0) - (b.id || 0);
                                                                                });

                                                                              const currIndex = paidHistory.findIndex((t) => t.id === histTrx.id);
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
                                                                                cumulativeUpToThis = Number(histTrx.amount || 0);
                                                                              }

                                                                              const totalTarget = mGroup.totalPaidAmount + mGroup.totalDueAmount;
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
                                                                                  onClick={() => {
                                                                                    const rootDemandTrx = mGroup.transactions.find((t) => !t.description || !/partial payment/i.test(t.description)) || mGroup.transactions[mGroup.transactions.length - 1] || mGroup.primaryTrx;
                                                                                    const rootTrxNo = group.transaction_no || rootDemandTrx?.transaction_no;
                                                                                    handlePrint(histLinkedReceipt, histTrx, {
                                                                                      isPartial: dueRemainingAfterThis > 0 && totalTarget > cumulativeUpToThis,
                                                                                      totalPaidAmount: cumulativeUpToThis,
                                                                                      previousPaidAmount: prevUpToThis,
                                                                                      totalDueAmount: dueRemainingAfterThis,
                                                                                      totalAssignedAmount: totalTarget,
                                                                                      previousReferences: prevRefs,
                                                                                      demandTrxNo: rootTrxNo,
                                                                                    });
                                                                                  }}
                                                                                  className="h-7 min-w-[68px] px-2 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                                                                  title="Print receipt for this payment"
                                                                                >
                                                                                  <Printer className="h-3.5 w-3.5" /> Print
                                                                                </Button>
                                                                              );
                                                                            })()
                                                                          ) : canManage && (isHistPendingDue || isHistSlipReceived || isHistRejected) ? (
                                                                            <Button
                                                                              size="sm"
                                                                              onClick={() => openCollectPaymentModal(histTrx)}
                                                                              className="h-7 min-w-[68px] px-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                                                              title="Settle payment"
                                                                            >
                                                                              <Wallet className="h-3.5 w-3.5" /> Settle
                                                                            </Button>
                                                                          ) : null}
                                                                        </div>
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
                                            });
                                          })()}
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

          {/* VIEW 2: MEMBER-WISE FOLDERS */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {filteredMemberGroups.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                  <ReceiptIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No records found matching your filters.
                </div>
              ) : (
                filteredMemberGroups.map((group) => {
                  const isExpanded = !!expandedMembers[group.memberId];

                  const displayItems = group.items.filter((it) => {
                    if (statusFilter === 'paid' && (it.status !== 'paid' || it.isPartial)) return false;
                    if (statusFilter === 'partial' && !it.isPartial) return false;
                    if (statusFilter === 'received_slip' && (it.status !== 'pending' || !it.receiptPhoto)) return false;
                    if (statusFilter === 'pending' && (it.status !== 'pending' || !!it.receiptPhoto || it.isPartial)) return false;
                    if (statusFilter === 'rejected' && it.status !== 'rejected') return false;
                    if (paymentMethodFilter !== 'all' && it.paymentMethod !== paymentMethodFilter) return false;
                    return true;
                  });

                  return (
                    <div
                      key={group.memberId}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                    >
                      {/* Member Summary Header Bar */}
                      <div
                        onClick={() => toggleExpandMember(group.memberId)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                            {group.memberName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                {group.memberName}
                              </h3>
                              <span className="font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                ID: {group.memberNo}
                              </span>
                              {group.fullyPaidCount > 0 && (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  {group.fullyPaidCount === 1 ? '1 Cleared' : `${group.fullyPaidCount} Cleared`}
                                </span>
                              )}
                              {group.partiallyPaidCount > 0 && (
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-1">
                                  <Wallet className="h-3 w-3 text-purple-600" />
                                  {group.partiallyPaidCount === 1 ? 'Partially Paid' : `${group.partiallyPaidCount} Partially Paid`}
                                </span>
                              )}
                              {group.receivedSlipCount > 0 && (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                                  <FileCheck className="h-3 w-3 text-blue-600" />
                                  {group.receivedSlipCount === 1 ? 'Received Slip' : `${group.receivedSlipCount} Received Slips`}
                                </span>
                              )}
                              {group.pureDuePendingCount > 0 && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  {group.pureDuePendingCount === 1 ? 'Due Pending' : `${group.pureDuePendingCount} Due Pending`}
                                </span>
                              )}
                              {group.rejectedCount > 0 && (
                                <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-red-600" />
                                  {group.rejectedCount} Slip Rejected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {group.fullyPaidCount === 0 && group.partiallyPaidCount > 0
                                ? `${group.partiallyPaidCount} Partially Paid • Last Activity: ${group.lastDate || 'No records'}`
                                : group.fullyPaidCount > 0 && group.partiallyPaidCount > 0
                                ? `${group.fullyPaidCount} Cleared • ${group.partiallyPaidCount} Partially Paid • Last Activity: ${group.lastDate || 'No records'}`
                                : `${group.fullyPaidCount} Cleared Receipt${group.fullyPaidCount !== 1 ? 's' : ''} • Last Activity: ${group.lastDate || 'No records'}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Total Collected
                            </span>
                            <span className="text-sm font-bold text-emerald-900 font-mono">
                              BDT {group.totalPaidAmount.toLocaleString()}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandMember(group.memberId);
                            }}
                            className="h-8 text-xs cursor-pointer border-slate-200 hover:bg-slate-100"
                          >
                            {isExpanded ? 'Hide' : 'Details'} ({group.items.length})
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/90 border-t border-slate-200">
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <ReceiptIcon className="h-4 w-4 text-emerald-700" />
                                Billing Slips &amp; Receipts for {group.memberName}
                              </h4>
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                {group.fullyPaidCount > 0 && (
                                  <span className="text-emerald-700 font-bold">
                                    {group.fullyPaidCount} Cleared (BDT {group.totalPaidAmount.toLocaleString()})
                                  </span>
                                )}
                                {group.partiallyPaidCount > 0 && (
                                  <span className="text-purple-700 font-bold border-l border-slate-300 pl-2">
                                    {group.partiallyPaidCount} Partially Paid (Paid: BDT {group.totalPaidAmount.toLocaleString()} • Due: BDT {group.totalPendingAmount.toLocaleString()})
                                  </span>
                                )}
                                {group.receivedSlipCount > 0 && (
                                  <span className="text-blue-700 font-bold border-l border-slate-300 pl-2">
                                    {group.receivedSlipCount} Receipt{group.receivedSlipCount !== 1 ? 's' : ''} Received
                                  </span>
                                )}
                                {group.pureDuePendingCount > 0 && (
                                  <span className="text-amber-700 font-bold border-l border-slate-300 pl-2">
                                    {group.pureDuePendingCount} Due Pending (BDT {group.totalPendingAmount.toLocaleString()})
                                  </span>
                                )}
                                {group.rejectedCount > 0 && (
                                  <span className="text-red-700 font-bold border-l border-slate-300 pl-2">
                                    {group.rejectedCount} Rejected
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="border border-slate-100 rounded-lg overflow-x-auto">
                              <Table className="table-fixed w-full min-w-[1000px]">
                                <TableHeader className="bg-slate-50">
                                  <TableRow className="text-xs">
                                    <TableHead className="w-[10%] text-center">Member ID</TableHead>
                                    <TableHead className="w-[10%] text-center">Date</TableHead>
                                    <TableHead className="w-[15%] text-center">Reference ID</TableHead>
                                    <TableHead className="w-[12%] text-center">Amount</TableHead>
                                    <TableHead className="w-[13%] text-center">Receipt Proof</TableHead>
                                    <TableHead className="w-[14%] text-center">Status</TableHead>
                                    <TableHead className="w-[26%] text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {displayItems.length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={7} className="text-center py-8 text-slate-400 italic text-xs">
                                        No payment proof slips or cleared receipts submitted by {group.memberName} yet.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                  {displayItems.map((item) => {
                                    const isPendingDue = item.status === 'pending' || (item.isPartial && item.recordType === 'pending_slip');
                                    const isRejected = item.status === 'rejected';

                                    return (
                                      <TableRow
                                        key={item.id}
                                        className={`text-xs transition-colors ${
                                          isRejected
                                            ? 'bg-red-50/30 hover:bg-red-50/60'
                                            : isPendingDue
                                            ? 'hover:bg-amber-50/40'
                                            : 'hover:bg-slate-50/80'
                                        }`}
                                      >
                                        <TableCell className="p-3 align-middle text-center font-mono text-emerald-800 font-bold truncate">
                                          {group.memberNo}
                                        </TableCell>
                                        <TableCell className="p-3 align-middle text-center text-slate-600 font-medium whitespace-nowrap">
                                          {item.date}
                                        </TableCell>
                                        <TableCell className="p-3 align-middle text-center font-mono font-bold text-slate-700 text-[11px] truncate">
                                           {item.status === 'rejected' || item.isRejected ? (
                                             <span className="text-slate-400 font-normal">-</span>
                                           ) : item.status === 'paid' || item.recordType === 'receipt' || (item.isPartial && item.rawReceipt) ? (
                                             <span className="font-bold text-slate-800 font-mono">{item.inputtedReference || item.receiptNo || item.transactionNo || '-'}</span>
                                           ) : item.receiptPhoto ? (
                                             item.memberTrxReference ? (
                                               <span className="font-mono text-slate-800 font-bold">{item.memberTrxReference}</span>
                                             ) : (
                                               <span className="text-[10px] text-blue-700 italic font-medium">Slip Submitted</span>
                                             )
                                           ) : (
                                             <span className="text-slate-400 font-normal">-</span>
                                           )}
                                        </TableCell>
                                        <TableCell className="p-3 align-middle text-center font-bold text-slate-900 whitespace-nowrap">
                                          BDT {item.amount.toLocaleString()}
                                        </TableCell>

                                        <TableCell className="p-3 align-middle text-center">
                                          {item.receiptPhoto ? (
                                            <div className="flex flex-col items-center justify-center gap-1">
                                              <ReceiptSlipThumbnail
                                                photoUrl={item.receiptPhoto}
                                                title={`${group.memberName} - ${item.receiptNo || item.transactionNo}`}
                                                date={item.receiptPhotoUploadedAt ? `Uploaded: ${item.receiptPhotoUploadedAt}` : undefined}
                                                isRejected={item.isRejected}
                                                isPartial={item.isPartial}
                                                isSlipReceived={!item.isPartial && item.status === 'pending' && !!item.receiptPhoto}
                                                rejectionReason={item.rejectionReason}
                                                onClick={() => viewReceiptPhoto(
                                                  item.receiptPhoto!,
                                                  `${group.memberName} - ${item.receiptNo || item.transactionNo}`,
                                                  item.receiptPhotoUploadedAt,
                                                  item.isRejected,
                                                  item.rejectionReason
                                                )}
                                              />
                                            </div>
                                          ) : (
                                            <span className="text-[11px] text-slate-400 italic text-center block">
                                              No slip uploaded
                                            </span>
                                          )}
                                        </TableCell>

                                        {/* Status Column */}
                                        <TableCell className="p-3 align-middle text-center">
                                          {item.isPartial ? (
                                            item.recordType === 'receipt' || item.status === 'paid' ? (
                                              <div className="flex flex-col items-center justify-center gap-0.5">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap shadow-2xs">
                                                  <Wallet className="h-3.5 w-3.5 text-purple-600" /> Partially Paid
                                                </span>
                                                <span className="text-[9px] text-purple-700 font-semibold">Partial Payment</span>
                                                {renderStaffAuditBadge(getAuditorInfo(item), true)}
                                              </div>
                                            ) : item.receiptPhoto ? (
                                              <div className="flex justify-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap shadow-2xs">
                                                  <FileCheck className="h-3.5 w-3.5 text-blue-600" /> Receipt Received
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-center justify-center gap-0.5">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap shadow-2xs">
                                                  <Clock className="h-3.5 w-3.5 text-amber-600" /> Remaining Due
                                                </span>
                                                <span className="text-[9px] text-purple-700 font-semibold">Partially Paid</span>
                                              </div>
                                            )
                                          ) : item.status === 'paid' ? (
                                            <div className="flex flex-col items-center justify-center">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Paid
                                              </span>
                                              {renderStaffAuditBadge(getAuditorInfo(item), true)}
                                            </div>
                                          ) : isPendingDue && item.receiptPhoto ? (
                                            <div className="flex justify-center">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap shadow-2xs">
                                                <FileCheck className="h-3.5 w-3.5 text-blue-600" /> Receipt Received
                                              </span>
                                            </div>
                                          ) : isRejected ? (
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap shadow-2xs">
                                                <XCircle className="h-3.5 w-3.5 text-red-600" /> Rejected
                                              </span>
                                              {renderStaffAuditBadge(getAuditorInfo(item), false)}
                                            </div>
                                          ) : (
                                            <div className="flex justify-center">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap shadow-2xs">
                                                <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Due
                                              </span>
                                            </div>
                                          )}
                                        </TableCell>

                                        {/* Action Column */}
                                        <TableCell className="p-3 align-middle text-center">
                                          <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                            {(item.rawReceipt || item.status === 'paid' || item.recordType === 'receipt') ? (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePrint(item.rawReceipt, item.rawTransaction)}
                                                className="h-7 min-w-[68px] px-2 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                                title="Print receipt"
                                              >
                                                <Printer className="h-3.5 w-3.5" /> Print
                                              </Button>
                                            ) : canManage && item.rawTransaction ? (
                                              <Button
                                                size="sm"
                                                onClick={() => openCollectPaymentModal(item.rawTransaction!)}
                                                className="h-7 min-w-[68px] px-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                                title="Settle payment"
                                              >
                                                <Wallet className="h-3.5 w-3.5" /> Settle
                                              </Button>
                                            ) : null}

                                            {canManage && item.receiptPhoto && !item.isRejected && item.status !== 'paid' && item.rawTransaction && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openRejectProofModal(item.rawTransaction!)}
                                                className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer shadow-2xs flex items-center justify-center"
                                                title="Reject slip"
                                              >
                                                <XCircle className="h-3.5 w-3.5" />
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 3: ALL INDIVIDUAL RECEIPTS & SLIPS TABLE */}
          {activeTab === 'all' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Chronological Billing Records &amp; Slips
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing {allChronologicalItems.length} records matching current filter
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="table-fixed w-full min-w-[1000px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="text-xs">
                      <TableHead className="w-[12%] text-center font-semibold text-slate-700">Member Name</TableHead>
                      <TableHead className="w-[10%] text-center font-semibold text-slate-700">Member ID</TableHead>
                      <TableHead className="w-[11%] text-center font-semibold text-slate-700">Date</TableHead>
                      <TableHead className="w-[14%] text-center font-semibold text-slate-700">Reference ID</TableHead>
                      <TableHead className="w-[12%] text-center font-semibold text-slate-700">Amount</TableHead>
                      <TableHead className="w-[12%] text-center font-semibold text-slate-700">Receipt Photo / Proof</TableHead>
                      <TableHead className="w-[13%] text-center font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="w-[16%] text-center font-semibold text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allChronologicalItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allChronologicalItems.map((item) => {
                        const isPendingDue = item.status === 'pending' || (item.isPartial && item.recordType === 'pending_slip');
                        const isRejected = item.status === 'rejected';

                        return (
                          <TableRow key={item.id} className="text-xs hover:bg-slate-50/80">
                            <TableCell className="p-3 align-middle text-center font-semibold text-slate-900">
                              {item.memberName}
                            </TableCell>
                            <TableCell className="p-3 align-middle text-center font-mono font-bold text-slate-700">
                              {item.memberNo}
                            </TableCell>
                            <TableCell className="p-3 align-middle text-center text-slate-600 whitespace-nowrap">
                              {item.date}
                            </TableCell>
                            <TableCell className="p-3 align-middle text-center font-mono font-bold text-slate-700">
                               {item.isRejected || item.status === 'rejected' ? (
                                 <span className="text-slate-400 font-normal">-</span>
                               ) : item.status === 'paid' || item.recordType === 'receipt' || (item.isPartial && item.rawReceipt) ? (
                                 <span className="font-bold text-slate-800 font-mono">{item.inputtedReference || item.receiptNo || item.transactionNo || '-'}</span>
                               ) : item.receiptPhoto ? (
                                 item.memberTrxReference ? (
                                   <span className="font-mono text-slate-800 font-bold">{item.memberTrxReference}</span>
                                 ) : (
                                   <span className="text-[10px] text-blue-700 italic font-medium">Slip Submitted</span>
                                 )
                               ) : (
                                 <span className="text-slate-400 font-normal">-</span>
                               )}
                            </TableCell>
                            <TableCell className="p-3 align-middle text-center font-bold text-slate-900 whitespace-nowrap">
                              BDT {item.amount.toLocaleString()}
                            </TableCell>

                            <TableCell className="p-3 align-middle text-center">
                              {item.receiptPhoto ? (
                                <div className="flex justify-center">
                                  <ReceiptSlipThumbnail
                                    photoUrl={item.receiptPhoto}
                                    title={`${item.memberName} - ${item.receiptNo || item.transactionNo}`}
                                    date={item.receiptPhotoUploadedAt ? `Uploaded: ${item.receiptPhotoUploadedAt}` : undefined}
                                    isRejected={item.isRejected}
                                    isPartial={item.isPartial}
                                    isSlipReceived={!item.isPartial && item.status === 'pending' && !!item.receiptPhoto}
                                    rejectionReason={item.rejectionReason}
                                    onClick={() => viewReceiptPhoto(
                                      item.receiptPhoto!,
                                      `${item.memberName} - ${item.receiptNo || item.transactionNo}`,
                                      item.receiptPhotoUploadedAt,
                                      item.isRejected,
                                      item.rejectionReason
                                    )}
                                  />
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic text-center block">
                                  No slip uploaded
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="p-3 align-middle text-center">
                              {item.isPartial ? (
                                item.recordType === 'receipt' || item.status === 'paid' ? (
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap">
                                      <Wallet className="h-3 w-3 text-purple-600" /> Partially Paid
                                    </span>
                                    <span className="text-[9px] text-purple-700 font-semibold">Partial Payment</span>
                                    {renderStaffAuditBadge(getAuditorInfo(item), true)}
                                  </div>
                                ) : item.receiptPhoto ? (
                                  <div className="flex justify-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap">
                                      <FileCheck className="h-3 w-3 text-blue-600" /> Receipt Received
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap">
                                      <Clock className="h-3 w-3 text-amber-600" /> Remaining Due
                                    </span>
                                    <span className="text-[9px] text-purple-700 font-semibold">Partially Paid</span>
                                  </div>
                                )
                              ) : item.status === 'paid' ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                                  </span>
                                  {renderStaffAuditBadge(getAuditorInfo(item), true)}
                                </div>
                              ) : isPendingDue && item.receiptPhoto ? (
                                <div className="flex justify-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap">
                                    <FileCheck className="h-3 w-3 text-blue-600" /> Receipt Received
                                  </span>
                                </div>
                              ) : isPendingDue ? (
                                <div className="flex justify-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
                                    <Clock className="h-3 w-3 text-amber-600" /> Pending Due
                                  </span>
                                </div>
                              ) : isRejected ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap">
                                    <XCircle className="h-3 w-3 text-red-600" /> Rejected
                                  </span>
                                  {renderStaffAuditBadge(getAuditorInfo(item), false)}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                                  </span>
                                  {renderStaffAuditBadge(getAuditorInfo(item), true)}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="p-3 align-middle text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                {(item.rawReceipt || item.status === 'paid' || item.recordType === 'receipt') ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrint(item.rawReceipt, item.rawTransaction, {
                                      demandTrxNo: item.transactionNo || item.rawTransaction?.transaction_no,
                                    })}
                                    className="h-7 min-w-[68px] px-2 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                    title="Print receipt"
                                  >
                                    <Printer className="h-3.5 w-3.5" /> Print
                                  </Button>
                                ) : canManage && item.rawTransaction ? (
                                  <Button
                                    size="sm"
                                    onClick={() => openCollectPaymentModal(item.rawTransaction!)}
                                    className="h-7 min-w-[68px] px-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                                    title="Settle payment"
                                  >
                                    <Wallet className="h-3.5 w-3.5" /> Settle
                                  </Button>
                                ) : null}

                                {canManage && item.receiptPhoto && !item.isRejected && item.status !== 'paid' && item.rawTransaction && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openRejectProofModal(item.rawTransaction!)}
                                    className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer shadow-2xs flex items-center justify-center"
                                    title="Reject slip"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}

                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* DIALOG 1: CREATE & ASSIGN PAYMENT DUES (BILLING DEMAND GENERATOR) */}
        <Dialog open={openDemand} onOpenChange={setOpenDemand}>
          <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CalendarCheck className="h-5 w-5 text-emerald-700" />
                Create &amp; Assign Payment Dues
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={onSubmitDemand} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setDemandCategory('monthly_payment');
                    const settingsList = Array.isArray(settings) ? settings : (settings as any)?.data || [];
                    const defaultMonthly =
                      settingsList.find((s: any) => s.setting_key === 'monthly_subscription_default')?.setting_value ||
                      settingsList.find((s: any) => s.setting_key === 'payment_amount_1')?.setting_value ||
                      '2000';
                    setDemandAmount(defaultMonthly);
                  }}
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
                  onClick={() => {
                    setDemandCategory('one_time');
                    const settingsList = Array.isArray(settings) ? settings : (settings as any)?.data || [];
                    const defaultOneTime =
                      settingsList.find((s: any) => s.setting_key === 'one_time_payment_default')?.setting_value ||
                      settingsList.find((s: any) => s.setting_key === 'payment_amount_2')?.setting_value ||
                      '3000';
                    setDemandAmount(defaultOneTime);
                  }}
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
                          const firstAvailable = MONTH_NAMES
                            .map((m) => `${m} ${newYr}`)
                            .find((mKey) => !createdMonthsSet.has(mKey));
                          setSelectedMonths(firstAvailable ? [firstAvailable] : []);
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
                        Available Months
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

                  {MONTH_NAMES.every((m) => createdMonthsSet.has(`${m} ${demandYear}`) || createdMonthsSet.has(m)) && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>All 12 months for <b>{demandYear}</b> have already been created.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {MONTH_NAMES.map((m) => {
                      const monthKey = `${m} ${demandYear}`;
                      const isAlreadyCreated = createdMonthsSet.has(monthKey) || createdMonthsSet.has(m);
                      const isSelected = selectedMonths.includes(monthKey);

                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={isAlreadyCreated}
                          onClick={() => handleToggleMonth(monthKey)}
                          title={isAlreadyCreated ? `${monthKey} demand has already been created` : undefined}
                          className={`p-2 text-xs font-semibold rounded-md border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isAlreadyCreated
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none opacity-60'
                              : isSelected
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs cursor-pointer'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <span className={isAlreadyCreated ? 'line-through decoration-slate-400' : ''}>{m}</span>
                          {isAlreadyCreated ? (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-200/80 px-1 py-0.2 rounded">
                              Created
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-emerald-800">
                    A separate pending payment transaction of <b>BDT {demandAmount}</b> will be generated for each selected month per member.
                  </p>
                </div>
              )}

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

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">Custom Transaction ID / No (Optional)</Label>
                  <button
                    type="button"
                    onClick={generateAutoTrxNo}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" /> Auto Generate
                  </button>
                </div>
                <Input
                  placeholder="e.g. TRX-20250101-1001 (Leave blank for auto)"
                  value={demandTrxNo}
                  onChange={(e) => setDemandTrxNo(e.target.value)}
                  className={`mt-1 text-xs font-mono transition-colors ${
                    isTrxNoDuplicate
                      ? 'border-rose-500 ring-2 ring-rose-500/30 text-rose-900 bg-rose-50/50'
                      : 'bg-white'
                  }`}
                />
                {isTrxNoDuplicate ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-1.5 text-xs text-rose-700 font-medium">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Duplicate Transaction ID:</strong> &ldquo;{demandTrxNo.trim()}&rdquo; is already taken by another transaction. Please choose a unique Transaction ID or click <strong>Auto Generate</strong>.
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Must be unique. If left empty, a unique ID like <code>TRX-YYYYMMDD-XXXXX</code> is generated automatically.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs text-slate-600">Additional Instructions / Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Please pay before the monthly society meeting."
                  value={demandDescription}
                  onChange={(e) => setDemandDescription(e.target.value)}
                  className="bg-white mt-1 text-sm"
                />
              </div>

              <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDemand(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isGenerating || isTrxNoDuplicate}
                  className={`cursor-pointer ${
                    isTrxNoDuplicate
                      ? 'bg-slate-400 cursor-not-allowed text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-slate-50'
                  }`}
                >
                  {isGenerating ? 'Generating...' : 'Assign & Send Pending Dues'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG 2: MANUAL RECORD TRANSACTION */}
        <Dialog open={openSingle} onOpenChange={setOpenSingle}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <PlusCircle className="h-5 w-5 text-emerald-700" />
                <span>Record Manual Transaction</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitSingle(onSubmitSingle)} className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Member</Label>
                <select className="w-full border border-slate-200 rounded-md p-2 bg-white text-xs mt-1" {...registerSingle('member_id')}>
                  <option value="">Select member</option>
                  {membersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (ID: {u.member_profile?.member_no || 'No ID'})
                    </option>
                  ))}
                </select>
                {errorsSingle.member_id && <p className="text-xs text-red-600 mt-1">{String(errorsSingle.member_id.message)}</p>}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Type</Label>
                <select className="w-full border border-slate-200 rounded-md p-2 bg-white text-xs mt-1" {...registerSingle('type')}>
                  {['payment', 'share', 'fdr', 'expense', 'other'].map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Amount (BDT)</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...registerSingle('amount')} className="bg-white mt-1 text-sm font-bold font-mono" />
                {errorsSingle.amount && <p className="text-xs text-red-600 mt-1">{String(errorsSingle.amount.message)}</p>}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Transaction Date</Label>
                <Input type="date" {...registerSingle('transaction_date')} className="bg-white mt-1 text-xs" />
                {errorsSingle.transaction_date && <p className="text-xs text-red-600 mt-1">{String(errorsSingle.transaction_date.message)}</p>}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Description</Label>
                <Input placeholder="Optional notes / transaction details" {...registerSingle('description')} className="bg-white mt-1 text-xs" />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenSingle(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingSingle} className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white">
                  {isCreatingSingle ? 'Saving...' : 'Save Transaction'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG 3: EDIT SINGLE TRANSACTION / PRICE MODAL */}
        <Dialog open={openEditTrxModal} onOpenChange={setOpenEditTrxModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Edit2 className="h-5 w-5 text-emerald-700" />
                <span>Edit Transaction &amp; Price</span>
              </DialogTitle>
            </DialogHeader>

            {editingTrx && (
              <form onSubmit={handleSaveEditTrx} className="space-y-4 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction No:</span>
                    <strong className="font-mono text-slate-900">{editingTrx.transaction_no}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Member:</span>
                    <strong className="text-slate-900">{editingTrx.member?.name || 'Unassigned'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold uppercase text-slate-700">{editingTrx.status}</span>
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-slate-900 text-xs">Transaction Amount / Price (BDT) *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">BDT</span>
                    <Input
                      type="number"
                      min="1"
                      step="any"
                      value={editTrxAmount}
                      onChange={(e) => setEditTrxAmount(e.target.value)}
                      required
                      className="pl-12 font-bold font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-slate-900 text-xs">Description / Month</Label>
                  <Input
                    type="text"
                    value={editTrxDescription}
                    onChange={(e) => setEditTrxDescription(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="font-bold text-slate-900 text-xs">Transaction / Due Date</Label>
                  <Input
                    type="date"
                    value={editTrxDueDate}
                    onChange={(e) => setEditTrxDueDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpenEditTrxModal(false)} className="cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdating} className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white">
                    {isUpdating ? 'Saving...' : 'Update Price & Details'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG 4: EDIT BATCH GROUP DEMAND PRICE MODAL */}
        <Dialog open={openEditGroupModal} onOpenChange={setOpenEditGroupModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Edit2 className="h-5 w-5 text-emerald-700" />
                <span>Edit Demand Price for Assigned Members</span>
              </DialogTitle>
            </DialogHeader>

            {editingGroup && (
              <form onSubmit={handleSaveEditGroup} className="space-y-4 pt-1">
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 text-sm">{editingGroup.title}</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Assigned Members:</span>
                    <strong className="font-mono text-slate-900">{editingGroup.totalMembersAssigned}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Unpaid / Pending Members:</span>
                    <strong className="font-mono text-amber-900">{editingGroup.pendingCount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Cleared / Paid Members:</span>
                    <strong className="font-mono text-emerald-800">{editingGroup.paidCount}</strong>
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-slate-900 text-xs">New Fee / Price per Member (BDT) *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">BDT</span>
                    <Input
                      type="number"
                      min="1"
                      step="any"
                      value={editGroupAmount}
                      onChange={(e) => setEditGroupAmount(e.target.value)}
                      required
                      className="pl-12 font-bold font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="editGroupScope"
                      checked={editGroupOnlyUnpaid}
                      onChange={() => setEditGroupOnlyUnpaid(true)}
                      className="mt-0.5 text-emerald-700 focus:ring-emerald-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Only Update Unpaid / Pending Dues (Recommended)</span>
                      <span className="text-[11px] text-slate-500">Preserves existing settled receipts without altering already paid amounts.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="editGroupScope"
                      checked={!editGroupOnlyUnpaid}
                      onChange={() => setEditGroupOnlyUnpaid(false)}
                      className="mt-0.5 text-emerald-700 focus:ring-emerald-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Update All Assigned Records</span>
                      <span className="text-[11px] text-slate-500">Applies new price to all records regardless of current status.</span>
                    </div>
                  </label>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpenEditGroupModal(false)} className="cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdating} className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white">
                    {isUpdating ? 'Updating...' : 'Save New Price'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG 5: DELETE CONFIRMATION MODAL */}
        <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
          <DialogContent className="max-w-md border-red-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-900">
                <Trash2 className="h-5 w-5 text-red-600" />
                <span>Confirm Delete</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-1 text-xs">
              {deletingTrx && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <p className="text-red-950 font-medium">Are you sure you want to delete this transaction record?</p>
                  <div className="text-slate-700 space-y-0.5 pt-1 font-mono">
                    <div>Trx No: <strong>{deletingTrx.transaction_no}</strong></div>
                    <div>Member: <strong>{deletingTrx.member?.name || 'Unassigned'}</strong></div>
                    <div>Amount: <strong>BDT {Number(deletingTrx.amount).toLocaleString()}</strong></div>
                    <div>Status: <strong className="uppercase">{deletingTrx.status}</strong></div>
                  </div>
                </div>
              )}

              {deletingGroup && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <p className="text-red-950 font-medium">
                    Are you sure you want to delete this entire billing demand and all its assigned records?
                  </p>
                  <div className="text-slate-700 space-y-0.5 pt-1">
                    <div>Demand Title: <strong className="text-red-950">{deletingGroup.title}</strong></div>
                    <div>Total Assigned Records: <strong className="font-mono text-red-950">{deletingGroup.transactions.length}</strong></div>
                    <div>Total Target Amount: <strong className="font-mono text-red-950">BDT {deletingGroup.totalDemandAmount.toLocaleString()}</strong></div>
                  </div>
                </div>
              )}

              <p className="text-slate-500 italic text-[11px]">
                * This action will permanently remove the record(s) from the system.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenDeleteModal(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeletingTrx}
                onClick={handleConfirmDelete}
                className="cursor-pointer bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingTrx ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 6: COLLECT / SETTLE PAYMENT & ISSUE RECEIPT */}
        <Dialog open={openCollectModal} onOpenChange={setOpenCollectModal}>
          <DialogContent className={collectingTrx?.receipt_photo ? "w-[98vw] max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1750px] max-h-[96vh] overflow-y-auto p-6 sm:p-8" : "w-[95vw] max-w-2xl sm:max-w-3xl max-h-[94vh] overflow-y-auto p-6 sm:p-8"}>
            <DialogHeader>
              <div className="flex items-center justify-between flex-wrap gap-2 pr-6">
                <DialogTitle className="flex items-center gap-2.5 text-emerald-800 text-xl font-bold">
                  <Wallet className="h-6 w-6 text-emerald-700" />
                  Collect Payment &amp; Issue Official Receipt
                </DialogTitle>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-2xs font-medium">
                  <Clock className="h-3.5 w-3.5 text-emerald-700 animate-pulse shrink-0" />
                  <span className="text-slate-500">Current Time:</span>
                  <span className="font-bold text-slate-900 font-mono">{currentTime}</span>
                </div>
              </div>
            </DialogHeader>

            {collectingTrx && (
              <div className={collectingTrx.receipt_photo ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2" : "pt-1"}>
                
                {/* LEFT SIDE: Full Image Slip Preview with 2.5x Magnifier */}
                {collectingTrx.receipt_photo && (
                  <div className="lg:col-span-6 flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner text-white min-h-[560px] h-full">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                        <ImageIcon className="h-4.5 w-4.5 text-emerald-400" /> Member Payment Slip
                      </span>
                      {collectingTrx.receipt_photo_uploaded_at && (
                        <span className="text-xs text-slate-300 font-mono font-medium">
                          Uploaded: {formatDateTime(collectingTrx.receipt_photo_uploaded_at)}
                        </span>
                      )}
                    </div>

                    <div className="py-4 my-auto w-full flex-1 flex items-center justify-center">
                      <MagnifiableModalImage
                        src={collectingTrx.receipt_photo}
                        alt={`${collectingTrx.member?.name || 'Member'} Slip`}
                        zoomScale={2.5}
                        className="min-h-[460px] max-h-[620px] w-full"
                      />
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1">
                        <ZoomIn className="h-3.5 w-3.5 text-emerald-400" /> Hover over image to magnify details
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectProofModal(collectingTrx)}
                          className="h-7 text-[11px] border-red-800 bg-red-950/70 text-red-300 hover:bg-red-900 hover:text-red-100 cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-400" /> Reject Slip
                        </Button>
                        <a
                          href={collectingTrx.receipt_photo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline flex items-center gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> Full Image
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* RIGHT SIDE: Payment Info & Settlement Form */}
                <div className={collectingTrx.receipt_photo ? "lg:col-span-6 flex flex-col justify-between" : ""}>
                  <form onSubmit={handleConfirmCollectPayment} className="space-y-4">
                    {/* Transaction Summary Card */}
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base sm:text-lg text-emerald-950">
                          Member: {collectingTrx.member?.name}
                        </span>
                        <span className="font-mono text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md font-bold border border-emerald-200">
                          ID: {collectingTrx.member?.member_no || 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-sm text-emerald-900 pt-2 border-t border-emerald-200/80">
                        <div>
                          <span className="text-slate-500 font-medium">Transaction No:</span>{' '}
                          <span className="font-mono font-bold">{collectingTrx.transaction_no}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Fee Item:</span>{' '}
                          <span className="font-bold">{collectingTrx.month || collectingTrx.description || 'Monthly Fee'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Due Amount:</span>{' '}
                          <span className="font-bold font-mono text-emerald-950">BDT {Number(collectingTrx.amount).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Billing Date:</span>{' '}
                          <span className="font-semibold">{collectingTrx.transaction_date}</span>
                          {collectingTrx.created_at && (
                            <span className="text-xs text-slate-500 block font-normal mt-0.5">
                              Issued: {formatDateTime(collectingTrx.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Proof Auto-filled Note Banner (if member submitted proof details) */}
                    {(collectingTrx.receipt_photo || collectingTrx.member_paid_amount || collectingTrx.member_trx_reference || collectingTrx.member_comment) && (
                      <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2 text-sm shadow-2xs">
                        <div className="flex items-center justify-between font-bold text-emerald-950 text-sm sm:text-base">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                            Member Proof Auto-Filled (Review &amp; Confirm)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-emerald-900 pt-1">
                          <div>Submitted Amount: <b className="text-emerald-950">BDT {Number(collectingTrx.member_paid_amount || collectingTrx.amount).toLocaleString()}</b></div>
                          <div>Payment Type: <b className="capitalize text-emerald-950">{collectingTrx.member_payment_method?.replace(/_/g, ' ') || 'Not specified'}</b></div>
                          {collectingTrx.receipt_photo_uploaded_at && (
                            <div className="sm:col-span-2 text-xs">
                              <span className="text-emerald-800 font-medium">Slip Uploaded At:</span>{' '}
                              <b className="text-emerald-950 font-bold">{formatDateTime(collectingTrx.receipt_photo_uploaded_at)}</b>
                            </div>
                          )}
                          {collectingTrx.member_trx_reference && (
                            <div className="sm:col-span-2 font-mono">Reference / TrxID: <b className="text-emerald-950">{collectingTrx.member_trx_reference}</b></div>
                          )}
                          {collectingTrx.member_comment && (
                            <div className="sm:col-span-2">Member Note: <i className="text-emerald-950 font-semibold">&ldquo;{collectingTrx.member_comment}&rdquo;</i></div>
                          )}
                        </div>

                        <p className="text-xs text-emerald-700 italic border-t border-emerald-200/80 pt-1.5 leading-relaxed">
                          * The fields below have been auto-filled with these member details. You can adjust any value before confirming settlement.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <Calculator className="h-4 w-4 text-emerald-700" />
                            Collected Amount (BDT) <span className="text-rose-600">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setPaidAmountInput(String(collectingTrx.amount))}
                            className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"
                          >
                            Pay Full (BDT {Number(collectingTrx.amount).toLocaleString()})
                          </button>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={paidAmountInput}
                          onChange={(e) => setPaidAmountInput(e.target.value)}
                          placeholder="e.g. 2000"
                          className="mt-1.5 font-mono font-bold text-emerald-900 text-base h-10 bg-white"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm font-bold text-slate-800">Payment Method</Label>
                          <select
                            value={paymentMethodInput}
                            onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                            className="w-full border border-slate-300 rounded-md p-2.5 text-sm bg-white mt-1.5 capitalize h-10"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="mobile_banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm font-bold text-slate-800">Settlement Date</Label>
                          <Input
                            type="date"
                            value={paymentDateInput}
                            onChange={(e) => setPaymentDateInput(e.target.value)}
                            className="mt-1.5 text-sm bg-white h-10"
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-800">Settlement Time</Label>
                            <button
                              type="button"
                              onClick={() => setPaymentTimeInput(getCurrentTimeHM())}
                              className="text-[10px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                              title="Set to Current Time"
                            >
                              <Clock className="h-2.5 w-2.5" /> Now
                            </button>
                          </div>
                          <Input
                            type="time"
                            value={paymentTimeInput}
                            onChange={(e) => setPaymentTimeInput(e.target.value)}
                            className="mt-1.5 text-sm bg-white h-10 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-bold text-slate-800">Transaction Reference / TrxID</Label>
                          <Input
                            type="text"
                            value={paymentTrxRefInput}
                            onChange={(e) => setPaymentTrxRefInput(e.target.value)}
                            placeholder="e.g. bKash TrxID, Bank Ref, etc."
                            className={`mt-1.5 text-sm bg-white font-mono h-10 transition-colors ${
                              isCollectTrxRefDuplicate
                                ? 'border-rose-500 ring-2 ring-rose-500/30 text-rose-900 bg-rose-50/50'
                                : ''
                            }`}
                          />
                          {isCollectTrxRefDuplicate && (
                            <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5 font-medium animate-in fade-in duration-200">
                              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                              <div>
                                <strong>Duplicate Reference Code:</strong> This TrxID is already used on an active payment ({isCollectTrxRefDuplicate.member?.name || 'Member'} - {isCollectTrxRefDuplicate.month || isCollectTrxRefDuplicate.transaction_no}).
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-bold text-slate-800">Admin Settlement Note (Optional)</Label>
                          <Input
                            type="text"
                            value={paymentNotesInput}
                            onChange={(e) => setPaymentNotesInput(e.target.value)}
                            placeholder="e.g. Verified via Bank statement / Office deposit"
                            className="mt-1.5 text-sm bg-white h-10"
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenCollectModal(false)}
                        className="cursor-pointer text-sm h-10 px-4"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isCollecting}
                        className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm h-10 px-5"
                      >
                        {isCollecting ? 'Processing...' : 'Confirm & Settle Payment'}
                      </Button>
                    </DialogFooter>
                  </form>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG 7: REJECT PAYMENT PROOF SLIP */}
        <Dialog open={openRejectModal} onOpenChange={setOpenRejectModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700 text-lg">
                <Ban className="h-5 w-5 text-red-600" />
                Reject Payment Proof Slip
              </DialogTitle>
            </DialogHeader>

            {rejectingTrx && (
              <form onSubmit={handleConfirmRejectProof} className="space-y-4 pt-1">
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-red-950">
                      Member: {rejectingTrx.member?.name}
                    </span>
                    <span className="font-mono text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                      ID: {rejectingTrx.member?.member_no || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-red-200/80">
                    <div>
                      <span className="text-red-700">Fee Item:</span>{' '}
                      <span className="font-bold text-red-950">{rejectingTrx.month || rejectingTrx.description || 'Monthly Fee'}</span>
                    </div>
                    <div>
                      <span className="text-red-700">Claimed Amount:</span>{' '}
                      <span className="font-bold text-red-950">BDT {Number(rejectingTrx.member_paid_amount || rejectingTrx.amount).toLocaleString()}</span>
                    </div>
                    {rejectingTrx.member_trx_reference && (
                      <div className="col-span-2">
                        <span className="text-red-700">Reference:</span>{' '}
                        <span className="font-mono font-bold text-red-950">{rejectingTrx.member_trx_reference}</span>
                      </div>
                    )}
                  </div>

                  {rejectingTrx.receipt_photo && (
                    <div className="pt-2 border-t border-red-200 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-red-900">Submitted Proof Slip:</span>
                      <ReceiptSlipThumbnail
                        photoUrl={rejectingTrx.receipt_photo}
                        title={`Slip Proof - ${rejectingTrx.member?.name}`}
                        date={rejectingTrx.receipt_photo_uploaded_at ? `Uploaded: ${rejectingTrx.receipt_photo_uploaded_at}` : undefined}
                        onClick={() =>
                          viewReceiptPhoto(
                            rejectingTrx.receipt_photo!,
                            `Slip Proof - ${rejectingTrx.member?.name}`,
                            rejectingTrx.receipt_photo_uploaded_at
                          )
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-900">
                    Reason for Rejection <span className="text-rose-600">*</span>
                  </Label>
                  <textarea
                    rows={3}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="e.g. Amount on slip does not match bank deposit, blurry photo, or invalid transaction ID."
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    * The member will see this exact message on their dashboard and will be able to re-upload a valid slip.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <b>Are you sure?</b> Rejecting this submission will archive this slip and automatically create a fresh pending due for the member.
                  </p>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenRejectModal(false)}
                    className="cursor-pointer text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isRejecting}
                    className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                  >
                    {isRejecting ? 'Rejecting...' : 'Confirm & Reject Slip'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG 8: LIGHTBOX PHOTO VIEWER */}
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
                    <span>Payment Proof Slip Rejected by Admin</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-red-200 text-red-900">
                    <span className="font-bold text-[10px] text-red-950 block uppercase tracking-wider mb-0.5">Admin Rejection Reason:</span>
                    <p className="text-xs font-semibold leading-relaxed text-red-950">
                      {photoModalRejectionReason || 'Payment proof slip could not be verified by Admin. Please re-upload a valid slip.'}
                    </p>
                  </div>
                  <p className="text-[10px] text-red-700 italic pt-0.5">
                    * This slip is preserved as rejected for member and administrative audit.
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
                <Button
                  type="button"
                  onClick={() => setOpenPhotoModal(false)}
                  className={`cursor-pointer text-white text-xs ${
                    photoModalIsRejected ? 'bg-red-700 hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  Close Viewer
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ReceiptPrintArea receipt={printReceipt} />
    </>
  );
}
