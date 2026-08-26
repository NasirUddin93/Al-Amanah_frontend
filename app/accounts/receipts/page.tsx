'use client';
import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppSelector } from '@/store/hooks';
import { canManageReceipts } from '@/lib/roles';
import {
  useGetReceiptsQuery,
  useCreateReceiptMutation,
  useGetUsersQuery,
  useGetTransactionsQuery,
  useCollectPaymentMutation,
  useRejectReceiptPhotoMutation,
} from '@/lib/api';
import { receiptSchema } from '@/lib/schemas';
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
} from 'lucide-react';

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
  isRejected: boolean;
  isPartial?: boolean;
  rejectionReason?: string | null;
  status: 'paid' | 'rejected' | 'pending' | 'partial' | 'partially_paid';
  rawReceipt?: Receipt;
  rawTransaction?: Transaction;
}

export default function AdminReceiptsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = canManageReceipts(user);

  // Top Tabs: Created Transaction Batches vs Member-wise Receipts vs All Receipts Table
  const [activeTab, setActiveTab] = useState<'created' | 'members' | 'all'>('created');

  // Status Filter: All, Cleared Receipts, Partially Paid, Received Slips, Due Pending, Rejected Slips
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'mobile_banking' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedMembers, setExpandedMembers] = useState<Record<string | number, boolean>>({});

  // Modals & Lightbox State
  const [openNewModal, setOpenNewModal] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

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
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');

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

  const [createReceipt, { isLoading: isCreating }] = useCreateReceiptMutation();
  const [collectPayment, { isLoading: isCollecting }] = useCollectPaymentMutation();
  const [rejectReceiptPhoto, { isLoading: isRejecting }] = useRejectReceiptPhotoMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      transaction_id: '',
      amount: '',
      payment_method: 'cash',
      receipt_date: new Date().toISOString().split('T')[0],
    },
  });

  const rawReceipts: Receipt[] = useMemo(() => {
    return receiptsData?.data || [];
  }, [receiptsData]);

  const rawTransactions: Transaction[] = useMemo(() => {
    return transactionsData?.data || [];
  }, [transactionsData]);

  const membersList: User[] = useMemo(() => {
    const rawUsers = usersData?.data || [];
    return rawUsers.filter((u) => u.role?.name === 'member');
  }, [usersData]);

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
      lastDate?: string;
    }> = {};

    // Build sets of paid & pending member months/dues
    const paidDueKeySet = new Set<string>();
    const paidMemberMonthSet = new Set<string>();
    const pendingMemberMonthSet = new Set<string>();

    rawTransactions.forEach((trx) => {
      const memId = trx.member?.id || (trx as any).member_id;
      if (!memId) return;

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

      if (trx.status === 'paid') {
        const memId = trx.member?.id || (trx as any).member_id;
        const isPartialPaid = Boolean(
          (trx.description && (/partial payment/i.test(trx.description) || /remaining due/i.test(trx.description))) ||
          (trx.month && pendingMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`))
        );

        map[mId].items.push({
          id: `trx_paid_${trx.id}`,
          recordType: 'receipt',
          receiptNo: linkedReceipt?.receipt_no || trx.receipt?.receipt_no,
          transactionNo: trx.transaction_no,
          date: trx.transaction_date,
          monthOrDesc: trx.month || trx.description || 'Payment Receipt',
          amount: Number(trx.amount || 0),
          paymentMethod: linkedReceipt?.payment_method || trx.member_payment_method || 'cash',
          receiptPhoto: trx.receipt_photo,
          receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
          memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
          memberTrxReference: trx.member_trx_reference,
          isRejected: false,
          isPartial: isPartialPaid,
          rejectionReason: null,
          status: isPartialPaid ? 'partial' : 'paid',
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
        const memId = trx.member?.id || (trx as any).member_id;
        const dueKey = `${memId}_${trx.payment_category || trx.type || ''}_${trx.month || ''}_${trx.description || ''}`;
        const isThisDuePaid =
          paidDueKeySet.has(dueKey) ||
          (trx.month && paidMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`)) ||
          (trx.description && paidMemberMonthSet.has(`${memId}___${trx.description.trim().toLowerCase()}`));

        if (isThisDuePaid) {
          return;
        }

        map[mId].items.push({
          id: `trx_rej_${trx.id}`,
          recordType: 'rejected_slip',
          receiptNo: undefined,
          transactionNo: trx.transaction_no,
          date: trx.transaction_date,
          monthOrDesc: trx.month || trx.description || 'Declined Proof',
          amount: Number(trx.amount || 0),
          paymentMethod: trx.member_payment_method || 'mobile_banking',
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
        const memId = trx.member?.id || (trx as any).member_id;
        const isRemainingDue = (trx.description && /remaining due/i.test(trx.description)) || (trx.description && /partial payment/i.test(trx.description));
        const dueKey = `${memId}_${trx.payment_category || trx.type || ''}_${trx.month || ''}_${trx.description || ''}`;
        const isThisDuePartiallyPaid = Boolean(isRemainingDue || (trx.month && paidMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`)));

        if (isThisDuePartiallyPaid && map[mId].partiallyPaidCount === 0) {
          map[mId].partiallyPaidCount += 1;
        }

        if (trx.receipt_photo) {
          map[mId].items.push({
            id: `trx_pend_${trx.id}`,
            recordType: 'pending_slip',
            receiptNo: undefined,
            transactionNo: trx.transaction_no,
            date: trx.transaction_date,
            monthOrDesc: trx.month || trx.description || 'Submitted Proof Due',
            amount: Number(trx.amount || 0),
            paymentMethod: trx.member_payment_method || 'pending',
            receiptPhoto: trx.receipt_photo,
            receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
            memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
            memberTrxReference: trx.member_trx_reference,
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
            date: trx.transaction_date,
            monthOrDesc: trx.month || trx.description || 'Assigned Due',
            amount: Number(trx.amount || 0),
            paymentMethod: trx.member_payment_method || 'pending',
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

    // Sort items for each member by date descending
    Object.values(map).forEach((m) => {
      m.items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    });

    return Object.values(map).sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [membersList, rawTransactions, rawReceipts]);

  const stats = useMemo(() => {
    const totalReceipts = rawReceipts.length;
    const totalClearedAmount = rawReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalReceivedSlips = memberReceiptGroups.reduce((sum, g) => sum + g.receivedSlipCount, 0);
    const totalDuePending = memberReceiptGroups.reduce((sum, g) => sum + g.pureDuePendingCount, 0);
    const totalPartiallyPaid = memberReceiptGroups.reduce((sum, g) => sum + g.partiallyPaidCount, 0);
    const totalRejectedSlips = memberReceiptGroups.reduce((sum, g) => sum + g.rejectedCount, 0);
    const totalMembers = memberReceiptGroups.length;

    return {
      totalReceipts,
      totalClearedAmount,
      totalReceivedSlips,
      totalDuePending,
      totalPartiallyPaid,
      totalRejectedSlips,
      totalMembers,
    };
  }, [rawReceipts, rawTransactions, memberReceiptGroups]);

  const filteredMemberGroups = useMemo(() => {
    return memberReceiptGroups.filter((g) => {
      if (statusFilter === 'paid' && g.fullyPaidCount === 0) return false;
      if (statusFilter === 'partial' && g.partiallyPaidCount === 0) return false;
      if (statusFilter === 'received_slip' && g.receivedSlipCount === 0) return false;
      if (statusFilter === 'pending' && g.pureDuePendingCount === 0) return false;
      if (statusFilter === 'rejected' && g.rejectedCount === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = g.memberName.toLowerCase().includes(q);
        const idMatch = g.memberNo.toLowerCase().includes(q);
        const hasItemMatch = g.items.some(
          (it) =>
            it.receiptNo?.toLowerCase().includes(q) ||
            it.transactionNo?.toLowerCase().includes(q) ||
            it.monthOrDesc?.toLowerCase().includes(q) ||
            it.rejectionReason?.toLowerCase().includes(q) ||
            it.paymentMethod?.toLowerCase().includes(q)
        );
        if (!nameMatch && !idMatch && !hasItemMatch) return false;
      }

      if (paymentMethodFilter !== 'all') {
        const hasMethod = g.items.some((it) => it.paymentMethod === paymentMethodFilter);
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
        if (statusFilter === 'paid' && (it.status !== 'paid' || it.isPartial)) return false;
        if (statusFilter === 'partial' && !it.isPartial) return false;
        if (statusFilter === 'received_slip' && (it.status !== 'pending' || !it.receiptPhoto)) return false;
        if (statusFilter === 'pending' && (it.status !== 'pending' || !!it.receiptPhoto || it.isPartial)) return false;
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
    if (t.last_modified_by && typeof t.last_modified_by === 'object') {
      return {
        name: t.last_modified_by.name,
        role: t.last_modified_by.role || 'Admin',
        action: t.last_modified_by.action || 'Created',
      };
    }

    if (t.updated_by) {
      if (typeof t.updated_by === 'object') {
        return {
          name: t.updated_by.name,
          role: t.updated_by.role || 'Admin',
          action: 'Updated',
        };
      }
      return { name: String(t.updated_by), role: 'Admin', action: 'Updated' };
    }

    if (t.created_by) {
      if (typeof t.created_by === 'object') {
        return {
          name: t.created_by.name,
          role: t.created_by.role || 'Admin',
          action: 'Created',
        };
      }
      return { name: String(t.created_by), role: 'Admin', action: 'Created' };
    }

    return { name: 'Super Admin', role: 'super_admin', action: 'Created' };
  };

  const createdDemandGroups = useMemo(() => {
    const groups: Record<string, {
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

      // Group active transactions by member ID to evaluate each member's status
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

      Object.values(memberStatusMap).forEach((st) => {
        if (st.hasPaid && !st.hasPending) {
          fullyPaidMembersCount += 1;
        } else if (st.hasPaid && st.hasPending) {
          partiallyPaidMembersCount += 1;
        } else if (!st.hasPaid && st.hasPending) {
          unpaidMembersCount += 1;
        }
      });

      const pendingMembersCount = partiallyPaidMembersCount + unpaidMembersCount;

      const memberProgressPercent = totalMembersAssigned > 0
        ? Math.min(100, Math.round((fullyPaidMembersCount / totalMembersAssigned) * 100))
        : 0;

      const progressPercent = totalDemandAmount > 0
        ? Math.min(100, Math.round((totalCollectedAmount / totalDemandAmount) * 100))
        : (totalCollectedAmount > 0 ? 100 : 0);
      const isFullyPaid = pendingMembersCount === 0 && totalMembersAssigned > 0;

      return {
        ...g,
        totalMembersAssigned,
        paidCount: fullyPaidMembersCount,
        partiallyPaidCount: partiallyPaidMembersCount,
        pendingCount: pendingMembersCount,
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
      if (statusFilter === 'partial' && g.partiallyPaidCount === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const modifier = getModifierInfo(g);
        const titleMatch = g.title.toLowerCase().includes(q);
        const monthMatch = g.month?.toLowerCase().includes(q);
        const catMatch = g.category.toLowerCase().includes(q);
        const adminMatch = modifier.name.toLowerCase().includes(q) || modifier.role.toLowerCase().includes(q);
        const hasMatchingMember = g.transactions.some((t) => {
          const mName = t.member?.name?.toLowerCase() || '';
          const mNo = (t.member?.member_no || (t.member as any)?.member_profile?.member_no || '').toLowerCase();
          const tNo = (t.transaction_no || '').toLowerCase();
          return mName.includes(q) || mNo.includes(q) || tNo.includes(q);
        });
        return titleMatch || monthMatch || catMatch || adminMatch || hasMatchingMember;
      }

      return true;
    });
  }, [createdDemandGroups, statusFilter, searchQuery]);

  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleExpandMember = (mId: string | number) => {
    setExpandedMembers((prev) => ({ ...prev, [mId]: !prev[mId] }));
  };

  const handlePrint = (r?: Receipt | null, fallbackTrx?: Transaction | null) => {
    if (r) {
      setPrintReceipt(r);
    } else if (fallbackTrx) {
      const syntheticReceipt: Receipt = {
        id: fallbackTrx.id,
        receipt_no: fallbackTrx.receipt?.receipt_no || `RCT-${fallbackTrx.transaction_no}`,
        receipt_date: fallbackTrx.transaction_date || new Date().toISOString().split('T')[0],
        amount: Number(fallbackTrx.amount || 0),
        payment_method: (fallbackTrx.member_payment_method as any) || 'cash',
        member: fallbackTrx.member,
        transaction: fallbackTrx,
        created_at: fallbackTrx.created_at,
        updated_at: fallbackTrx.updated_at,
      };
      setPrintReceipt(syntheticReceipt);
    } else {
      return;
    }

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

    const noteParts: string[] = [];
    if (trx.member_trx_reference) noteParts.push(`Ref: ${trx.member_trx_reference}`);
    if (trx.member_comment) noteParts.push(`Note: ${trx.member_comment}`);
    setPaymentNotesInput(noteParts.join(' | '));
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
      const res = await collectPayment({
        id: collectingTrx.id,
        body: {
          paid_amount: numAmount,
          payment_method: paymentMethodInput,
          payment_date: paymentDateInput,
          notes: paymentNotesInput || undefined,
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

  const onSubmit = async (values: any) => {
    try {
      await createReceipt({
        ...values,
        transaction_id: Number(values.transaction_id),
        amount: Number(values.amount),
      }).unwrap();

      alert('Receipt issued successfully!');
      setOpenNewModal(false);
      reset();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create receipt.');
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

          {canManage && (
            <Button
              onClick={() => setOpenNewModal(true)}
              className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm self-start sm:self-auto"
            >
              <PlusCircle className="h-4 w-4" /> Issue New Receipt
            </Button>
          )}
        </div>

        {/* Top Quick Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
              Total Receipts Cleared
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalReceipts} Receipts
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 block">
              Total Cleared Amount
            </span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              BDT {stats.totalClearedAmount.toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-800 block">
              Received Slips
            </span>
            <div className="text-2xl font-bold text-blue-950 mt-1">
              {stats.totalReceivedSlips} Received
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800 block">
              Due Pending
            </span>
            <div className="text-2xl font-bold text-amber-950 mt-1">
              {stats.totalDuePending} Pending
            </div>
          </div>

          <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-bold text-red-800 block">
              Rejected Proof Slips
            </span>
            <div className="text-2xl font-bold text-red-950 mt-1">
              {stats.totalRejectedSlips} Rejected
            </div>
          </div>
        </div>

        {/* 2 View Tabs: Member-Wise Groups vs All Chronological Records */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab('created')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'created'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ReceiptIcon className="h-4 w-4" />
            <span>Demand Batches Created</span>
            <span
              className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
                activeTab === 'created'
                  ? 'bg-emerald-950/80 text-emerald-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {createdDemandGroups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Member-wise Receipts &amp; Slips</span>
            <span
              className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
                activeTab === 'members'
                  ? 'bg-emerald-950/80 text-emerald-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {memberReceiptGroups.length} Members
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ReceiptIcon className="h-4 w-4" />
            <span>All Receipts &amp; Slips Table</span>
            <span
              className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
                activeTab === 'all'
                  ? 'bg-emerald-950/80 text-emerald-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allChronologicalItems.length}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Cleared Receipts ({stats.totalReceipts})
              </button>
              {stats.totalPartiallyPaid > 0 && (
                <button
                  onClick={() => setStatusFilter('partial')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'partial'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <Wallet className="h-3 w-3" />
                  Partially Paid ({stats.totalPartiallyPaid})
                </button>
              )}
              <button
                onClick={() => setStatusFilter('received_slip')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'received_slip'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <FileCheck className="h-3 w-3" />
                Received Slips ({stats.totalReceivedSlips})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Clock className="h-3 w-3" />
                Due Pending ({stats.totalDuePending})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                <XCircle className="h-3 w-3" />
                Rejected Slips ({stats.totalRejectedSlips})
              </button>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="text-xs font-bold text-slate-500">Method:</span>
              {(['all', 'cash', 'bank', 'mobile_banking'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethodFilter(method)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer capitalize ${
                    paymentMethodFilter === method
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {method === 'all' ? 'All' : method.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search member, ID, receipt no, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 text-xs h-9"
            />
          </div>
        </div>

        {/* =========================================================================
            VIEW 1: DEMAND BATCHES CREATED (ALL MEMBERS COLLAPSED UNDER TRANSACTION CREATED)
            ========================================================================= */}
        {activeTab === 'created' && (
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ReceiptIcon className="h-5 w-5 text-emerald-700" />
                    <span>Transactions Created &amp; Assigned Billing ({filteredCreatedGroups.length})</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any transaction demand campaign to expand and view individual member billing receipts, payment slips, and verification actions.
                  </p>
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
                                  <span className="text-[11px] text-slate-500">
                                    BDT {group.perMemberAmount.toLocaleString()} / member
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="px-3 py-3.5">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
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
                                <span className="text-[10px] text-slate-500">
                                  {modifier.action} entry
                                </span>
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

                                <div className="text-[10px] text-slate-500 flex justify-between">
                                  <span>Collected: BDT {group.totalCollectedAmount.toLocaleString()}</span>
                                  <span>Target: BDT {group.totalDemandAmount.toLocaleString()}</span>
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
                                  Pending ({group.pendingCount} Unpaid)
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="px-3 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                              {displayDate}
                            </TableCell>

                            <TableCell className="px-3 py-3.5 text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleExpandGroup(group.key)}
                                className="h-8 text-xs cursor-pointer border-slate-200 hover:bg-slate-100"
                              >
                                {isExpanded ? 'Hide' : 'View Details'} ({group.totalMembersAssigned})
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                              </Button>
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
                                          <TableHead className="w-[16%] text-center">Member Name</TableHead>
                                          <TableHead className="w-[12%] text-center">Member ID</TableHead>
                                          <TableHead className="w-[12%] text-center">Date</TableHead>
                                          <TableHead className="w-[14%] text-center">Receipt / Trx No</TableHead>
                                          <TableHead className="w-[14%] text-center">Amount</TableHead>
                                          <TableHead className="w-[14%] text-center">Receipt Proof</TableHead>
                                          <TableHead className="w-[18%] text-center">Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(() => {
                                          const transactionsByMember: Record<string | number, Transaction[]> = {};
                                          group.transactions.forEach((t) => {
                                            const mId = t.member?.id || (t as any).member_id;
                                            if (!mId) return;
                                            if (!transactionsByMember[mId]) {
                                              transactionsByMember[mId] = [];
                                            }
                                            transactionsByMember[mId].push(t);
                                          });

                                          const currentTransactions = Object.entries(transactionsByMember)
                                            .map(([memberId, memberTrxList]) => {
                                              const sorted = [...memberTrxList].sort((a, b) => {
                                                const dateA = a.updated_at || a.created_at || a.transaction_date || '';
                                                const dateB = b.updated_at || b.created_at || b.transaction_date || '';
                                                return dateB.localeCompare(dateA);
                                              });

                                              const paidTrxList = sorted.filter((t) => t.status === 'paid');
                                              const pendingTrxList = sorted.filter((t) => t.status === 'pending');

                                              if (paidTrxList.length > 0 && pendingTrxList.length > 0) {
                                                const activePending = pendingTrxList[0];
                                                const totalPaidAmount = paidTrxList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                                const totalDueAmount = Number(activePending.amount || 0);
                                                const totalAssigned = totalPaidAmount + totalDueAmount;

                                                return {
                                                  ...activePending,
                                                  isPartialPayment: true,
                                                  paidAmountSummary: totalPaidAmount,
                                                  totalAssignedAmount: totalAssigned,
                                                } as Transaction & { isPartialPayment?: boolean; paidAmountSummary?: number; totalAssignedAmount?: number };
                                              }

                                              const latest = sorted[0];
                                              if (latest.status === 'pending' && !latest.receipt_photo) {
                                                const lastRejected = sorted.find((t) => t.status === 'rejected' || !!t.rejection_reason);
                                                if (lastRejected) {
                                                  return lastRejected;
                                                }
                                              }
                                              return latest;
                                            })
                                            .sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''));

                                          return currentTransactions.map((trx: any) => {
                                            const isPartial = trx.isPartialPayment || trx.status === 'partial' || trx.status === 'partially_paid';
                                            const isPaid = !isPartial && trx.status === 'paid';
                                            const isRejected = !isPartial && trx.status === 'rejected';
                                            const isSlipReceived = !isPartial && trx.status === 'pending' && !!trx.receipt_photo;
                                            const isPendingDue = !isPartial && trx.status === 'pending' && !trx.receipt_photo;

                                            const linkedReceipt = rawReceipts.find(
                                              (r) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id || (trx.receipt && r.id === trx.receipt.id)
                                            ) || trx.receipt;

                                            return (
                                              <TableRow key={trx.id} className="text-xs">
                                                <TableCell className="p-3 align-middle text-center font-bold text-slate-900 truncate" title={trx.member?.name}>
                                                  {trx.member?.name ?? '-'}
                                                </TableCell>
                                                <TableCell className="p-3 align-middle text-center font-mono text-emerald-800 font-bold truncate">
                                                  {trx.member?.member_no || (trx.member as any)?.member_profile?.member_no || 'Unassigned'}
                                                </TableCell>
                                                <TableCell className="p-3 align-middle text-center text-slate-600 font-medium whitespace-nowrap">
                                                  {trx.transaction_date}
                                                </TableCell>
                                                <TableCell className="p-3 align-middle text-center font-mono text-slate-600 text-[11px] truncate">
                                                  {linkedReceipt ? (
                                                    <div className="flex flex-col items-center">
                                                      <span className="font-bold text-emerald-900">{linkedReceipt.receipt_no}</span>
                                                      <span className="text-[10px] text-slate-400">Trx: {trx.transaction_no}</span>
                                                    </div>
                                                  ) : (
                                                    trx.transaction_no
                                                  )}
                                                </TableCell>
                                                <TableCell className="p-3 align-middle text-center font-bold text-slate-900 whitespace-nowrap">
                                                  {isPartial && trx.paidAmountSummary ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                      <span className="font-bold text-purple-950">BDT {Number(trx.amount).toLocaleString()} <span className="text-[10px] text-amber-700 font-bold">(Due)</span></span>
                                                      <span className="text-[10px] text-emerald-700 font-medium">Paid: BDT {trx.paidAmountSummary.toLocaleString()}</span>
                                                    </div>
                                                  ) : (
                                                    <span>BDT {Number(trx.amount).toLocaleString()}</span>
                                                  )}
                                                </TableCell>

                                                {/* Receipt Photo & Member Proof Column */}
                                                <TableCell className="p-3 align-middle text-center">
                                                  {trx.receipt_photo ? (
                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                      <ReceiptSlipThumbnail
                                                        photoUrl={trx.receipt_photo}
                                                        title={`${trx.member?.name || 'Member'} - ${trx.month || trx.description || 'Receipt'}`}
                                                        date={trx.receipt_photo_uploaded_at ? `Uploaded: ${trx.receipt_photo_uploaded_at}` : undefined}
                                                        isRejected={isRejected}
                                                        isPartial={isPartial}
                                                        rejectionReason={trx.rejection_reason}
                                                        onClick={() => viewReceiptPhoto(
                                                          trx.receipt_photo!,
                                                          `${trx.member?.name || 'Member'} - ${trx.month || trx.description || 'Receipt'}`,
                                                          trx.receipt_photo_uploaded_at,
                                                          isRejected,
                                                          trx.rejection_reason
                                                        )}
                                                      />
                                                      {trx.member_paid_amount && (
                                                        <span className="text-[10px] font-semibold text-emerald-800 text-center">
                                                          Proof: BDT {Number(trx.member_paid_amount).toLocaleString()}
                                                          {trx.member_payment_method && <span className="capitalize text-slate-500 font-normal"> ({trx.member_payment_method.replace(/_/g, ' ')})</span>}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="text-[11px] text-slate-400 italic text-center block">No slip uploaded</span>
                                                  )}
                                                </TableCell>

                                                {/* Status Column & Actions */}
                                                <TableCell className="p-3 align-middle text-center">
                                                  <div className="flex items-center justify-center gap-2 flex-wrap">
                                                    {isPaid ? (
                                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                                                      </span>
                                                    ) : isSlipReceived ? (
                                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap shadow-2xs">
                                                        <FileCheck className="h-3 w-3 text-blue-600" /> Received Slip
                                                      </span>
                                                    ) : isPartial ? (
                                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap shadow-2xs">
                                                        <Wallet className="h-3 w-3 text-purple-600" /> Partially Paid
                                                      </span>
                                                    ) : isRejected ? (
                                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap shadow-2xs">
                                                        <XCircle className="h-3 w-3 text-red-600" /> Slip Rejected
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap shadow-2xs">
                                                        <Clock className="h-3 w-3 text-amber-600" /> Due Pending
                                                      </span>
                                                    )}

                                                    {/* Print / Collect Actions */}
                                                    {linkedReceipt && (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePrint(linkedReceipt)}
                                                        className="h-6 px-2 text-[10px] cursor-pointer border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                                                        title="Print official receipt"
                                                      >
                                                        <Printer className="h-3 w-3 mr-1" /> Print
                                                      </Button>
                                                    )}

                                                    {canManage && (isPendingDue || isSlipReceived || isPartial) && (
                                                      <Button
                                                        size="sm"
                                                        onClick={() => openCollectPaymentModal(trx)}
                                                        className="h-6 px-2 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs"
                                                        title="Collect payment and issue receipt"
                                                      >
                                                        <Wallet className="h-3 w-3 mr-1" /> Settle
                                                      </Button>
                                                    )}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
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

        {/* =========================================================================
            VIEW 2: MEMBER-WISE RECEIPTS & SLIPS (WITH EXPANDABLE DETAILS CONTAINER)
            ========================================================================= */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {loadingReceipts || loadingTransactions ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                Loading member receipts and billing slips...
              </div>
            ) : filteredMemberGroups.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                <ReceiptIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                No receipt or billing records found matching your criteria.
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
                          {isExpanded ? 'Hide' : 'View Details'} ({group.items.length})
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 ml-1 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 ml-1 text-slate-500" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Member Expanded Sub-Table */}
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
                                  {group.receivedSlipCount} Received Slips
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
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Member Name
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Member ID
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Date
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Transaction No
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Amount
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Receipt Photo / Proof
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Status
                                  </TableHead>
                                  <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">
                                    Action
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {displayItems.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-400 italic text-xs">
                                      No payment proof slips or cleared receipts submitted by {group.memberName} yet.
                                    </TableCell>
                                  </TableRow>
                                )}
                                {displayItems.map((item) => {
                                  const isPendingDue = item.status === 'pending' || (item.isPartial && item.recordType === 'pending_slip');
                                  const isRejected = item.status === 'rejected';

                                  return (
                                    <TableRow key={item.id} className="text-xs hover:bg-slate-50/80">
                                      <TableCell className="p-3 align-middle text-center font-semibold text-slate-900">
                                        {group.memberName}
                                      </TableCell>
                                      <TableCell className="p-3 align-middle text-center font-mono font-bold text-slate-700">
                                        {group.memberNo}
                                      </TableCell>
                                      <TableCell className="p-3 align-middle text-center text-slate-600 whitespace-nowrap">
                                        {item.date}
                                      </TableCell>
                                      <TableCell className="p-3 align-middle text-center font-mono text-slate-700">
                                        <div className="flex flex-col items-center">
                                          <span className="font-semibold">{item.transactionNo}</span>
                                          {item.receiptNo && (
                                            <span className="text-[10px] font-bold text-emerald-700">
                                              Receipt: {item.receiptNo}
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-3 align-middle text-center font-bold text-slate-900 whitespace-nowrap">
                                        BDT {item.amount.toLocaleString()}
                                      </TableCell>

                                      <TableCell className="p-3 align-middle text-center">
                                        {item.receiptPhoto ? (
                                          <div className="flex justify-center">
                                            <ReceiptSlipThumbnail
                                              photoUrl={item.receiptPhoto}
                                              title={`${group.memberName} - ${item.receiptNo || item.transactionNo}`}
                                              date={item.receiptPhotoUploadedAt ? `Uploaded: ${item.receiptPhotoUploadedAt}` : undefined}
                                              isRejected={item.isRejected}
                                              isPartial={item.isPartial}
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

                                      <TableCell className="p-3 align-middle text-center">
                                        {item.isPartial ? (
                                          item.recordType === 'receipt' || item.status === 'paid' ? (
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap shadow-2xs">
                                                <Wallet className="h-3.5 w-3.5 text-purple-600" /> Partially Paid
                                              </span>
                                              <span className="text-[9px] text-purple-700 font-semibold">Partial Payment</span>
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
                                          <div className="flex justify-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs">
                                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Paid
                                            </span>
                                          </div>
                                        ) : isPendingDue && item.receiptPhoto ? (
                                          <div className="flex justify-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap shadow-2xs">
                                              <FileCheck className="h-3.5 w-3.5 text-blue-600" /> Slip Received
                                            </span>
                                          </div>
                                        ) : isRejected ? (
                                          <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap shadow-2xs">
                                              <XCircle className="h-3.5 w-3.5 text-red-600" /> Rejected
                                            </span>
                                            {item.rejectionReason && (
                                              <span
                                                className="text-[9px] text-red-700 italic max-w-full truncate text-center block font-medium"
                                                title={`Reason: ${item.rejectionReason}`}
                                              >
                                                {item.rejectionReason}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex justify-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap shadow-2xs">
                                              <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Due
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>

                                      <TableCell className="p-3 align-middle text-center">
                                        {isPendingDue && item.rawTransaction ? (
                                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                            <Button
                                              size="sm"
                                              onClick={() => openCollectPaymentModal(item.rawTransaction!)}
                                              className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs"
                                            >
                                              <Wallet className="h-3 w-3 mr-1" /> Collect / Settle
                                            </Button>
                                            {item.receiptPhoto && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openRejectProofModal(item.rawTransaction!)}
                                                className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 cursor-pointer shadow-2xs"
                                                title="Reject invalid or unverified proof slip"
                                              >
                                                <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" /> Reject Slip
                                              </Button>
                                            )}
                                          </div>
                                        ) : item.rawReceipt ? (
                                          <div className="flex justify-center">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handlePrint(item.rawReceipt)}
                                              className="h-7 px-2.5 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs font-bold"
                                            >
                                              <Printer className="h-3 w-3 mr-1" /> Print
                                            </Button>
                                          </div>
                                        ) : isRejected ? (
                                          <span className="text-[11px] text-red-600 font-medium text-center block">
                                            Archived Rejected
                                          </span>
                                        ) : item.isPartial ? (
                                          <span className="text-[11px] text-purple-700 font-medium text-center block">Cleared Portion</span>
                                        ) : (
                                          <span className="text-[11px] text-slate-400 font-medium text-center block">Cleared</span>
                                        )}
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

        {/* VIEW 2: ALL INDIVIDUAL RECEIPTS & SLIPS TABLE */}
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
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Member Name</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Member ID</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Date</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Receipt / Trx No</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Amount</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Receipt Photo / Proof</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="w-[12.5%] text-center font-semibold text-slate-700">Action</TableHead>
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
                          <TableCell className="p-3 align-middle text-center font-mono text-slate-700">
                            {item.receiptNo ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-900">{item.receiptNo}</span>
                                <span className="text-[10px] text-slate-400">Trx: {item.transactionNo}</span>
                              </div>
                            ) : (
                              item.transactionNo
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
                              <div className="flex justify-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
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
                                {item.rejectionReason && (
                                  <span
                                    className="text-[9px] text-red-700 italic max-w-full truncate text-center block font-medium"
                                    title={`Reason: ${item.rejectionReason}`}
                                  >
                                    {item.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                                </span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="p-3 align-middle text-center">
                            {isPendingDue && item.rawTransaction ? (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => openCollectPaymentModal(item.rawTransaction!)}
                                  className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs"
                                >
                                  <Wallet className="h-3 w-3 mr-1" /> Collect / Settle
                                </Button>
                                {item.receiptPhoto && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openRejectProofModal(item.rawTransaction!)}
                                    className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 cursor-pointer shadow-2xs"
                                    title="Reject invalid or unverified proof slip"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" /> Reject Slip
                                  </Button>
                                )}
                              </div>
                            ) : item.rawReceipt ? (
                              <div className="flex justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrint(item.rawReceipt)}
                                  className="h-7 px-2.5 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-2xs font-bold"
                                >
                                  <Printer className="h-3 w-3 mr-1" /> Print
                                </Button>
                              </div>
                            ) : isRejected ? (
                              <span className="text-[11px] text-red-600 font-medium text-center block">
                                Archived Rejected
                              </span>
                            ) : item.isPartial ? (
                              <span className="text-[11px] text-purple-700 font-medium text-center block">Cleared Portion</span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium text-center block">Cleared</span>
                            )}
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

        {/* DIALOG: ISSUE NEW DIRECT RECEIPT */}
        <Dialog open={openNewModal} onOpenChange={setOpenNewModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <ReceiptIcon className="h-5 w-5 text-emerald-700" />
                Issue New Payment Receipt
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-1">
              <div>
                <Label className="text-xs font-bold text-slate-700">Transaction ID (Optional / Ref)</Label>
                <Input
                  type="number"
                  placeholder="Enter Transaction ID or leave empty"
                  {...register('transaction_id')}
                  className="mt-1 bg-white text-xs"
                />
                {errors.transaction_id && (
                  <p className="text-xs text-red-600 mt-0.5">{String(errors.transaction_id.message)}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Paid Amount (BDT)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2000"
                  {...register('amount')}
                  className="mt-1 bg-white text-xs font-bold"
                  required
                />
                {errors.amount && (
                  <p className="text-xs text-red-600 mt-0.5">{String(errors.amount.message)}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Payment Method</Label>
                <select
                  className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white mt-1 capitalize"
                  {...register('payment_method')}
                >
                  {['cash', 'bank', 'mobile_banking', 'other'].map((m) => (
                    <option key={m} value={m} className="capitalize">
                      {m.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Receipt Date</Label>
                <Input
                  type="date"
                  {...register('receipt_date')}
                  className="mt-1 bg-white text-xs"
                  required
                />
                {errors.receipt_date && (
                  <p className="text-xs text-red-600 mt-0.5">{String(errors.receipt_date.message)}</p>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenNewModal(false)}
                  className="cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  {isCreating ? 'Issuing...' : 'Save & Issue Receipt'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG: COLLECT / SETTLE PAYMENT & ISSUE RECEIPT */}
        <Dialog open={openCollectModal} onOpenChange={setOpenCollectModal}>
          <DialogContent className={collectingTrx?.receipt_photo ? "w-[96vw] max-w-6xl xl:max-w-7xl max-h-[95vh] overflow-y-auto p-5 sm:p-6" : "max-w-lg"}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800 text-lg font-bold">
                <Wallet className="h-5 w-5 text-emerald-700" />
                Collect Payment &amp; Issue Official Receipt
              </DialogTitle>
            </DialogHeader>

            {collectingTrx && (
              <div className={collectingTrx.receipt_photo ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2" : "pt-1"}>
                
                {/* LEFT SIDE: Full Image Slip Preview with 2.5x Magnifier */}
                {collectingTrx.receipt_photo && (
                  <div className="lg:col-span-6 flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner text-white min-h-[500px] h-full">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-emerald-400" /> Member Payment Slip
                      </span>
                      {collectingTrx.receipt_photo_uploaded_at && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {collectingTrx.receipt_photo_uploaded_at}
                        </span>
                      )}
                    </div>

                    <div className="py-3 my-auto w-full flex-1 flex items-center justify-center">
                      <MagnifiableModalImage
                        src={collectingTrx.receipt_photo}
                        alt={`${collectingTrx.member?.name || 'Member'} Slip`}
                        zoomScale={2.5}
                        className="min-h-[420px] max-h-[560px] w-full"
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
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-950">
                          Member: {collectingTrx.member?.name}
                        </span>
                        <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          ID: {collectingTrx.member?.member_no || 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-900 pt-1 border-t border-emerald-200/80">
                        <div>
                          <span className="text-slate-500">Transaction No:</span>{' '}
                          <span className="font-mono font-bold">{collectingTrx.transaction_no}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Fee Item:</span>{' '}
                          <span className="font-bold">{collectingTrx.month || collectingTrx.description || 'Monthly Fee'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Due Amount:</span>{' '}
                          <span className="font-bold font-mono">BDT {Number(collectingTrx.amount).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Due Date:</span>{' '}
                          <span>{collectingTrx.transaction_date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Member Proof Auto-filled Note Banner (if member submitted proof details) */}
                    {(collectingTrx.receipt_photo || collectingTrx.member_paid_amount || collectingTrx.member_trx_reference || collectingTrx.member_comment) && (
                      <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-1.5 text-xs shadow-2xs">
                        <div className="flex items-center justify-between font-bold text-emerald-950">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                            Member Proof Auto-Filled (Review & Confirm)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-emerald-900 pt-0.5">
                          <div>Submitted Amount: <b>BDT {Number(collectingTrx.member_paid_amount || collectingTrx.amount).toLocaleString()}</b></div>
                          <div>Payment Type: <b className="capitalize">{collectingTrx.member_payment_method?.replace(/_/g, ' ') || 'Not specified'}</b></div>
                          {collectingTrx.member_trx_reference && (
                            <div className="sm:col-span-2 font-mono">Reference / TrxID: <b>{collectingTrx.member_trx_reference}</b></div>
                          )}
                          {collectingTrx.member_comment && (
                            <div className="sm:col-span-2">Member Note: <i>&ldquo;{collectingTrx.member_comment}&rdquo;</i></div>
                          )}
                        </div>

                        <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/80 pt-1">
                          * The fields below have been auto-filled with these member details. You can adjust any value before confirming settlement.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Calculator className="h-3.5 w-3.5 text-emerald-700" />
                            Collected Amount (BDT) <span className="text-rose-600">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setPaidAmountInput(String(collectingTrx.amount))}
                            className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
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
                          className="mt-1 font-mono font-bold text-emerald-900 text-sm bg-white"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-700">Payment Method</Label>
                          <select
                            value={paymentMethodInput}
                            onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                            className="w-full border border-slate-300 rounded-md p-2 text-xs bg-white mt-1 capitalize"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="mobile_banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-700">Settlement Date</Label>
                          <Input
                            type="date"
                            value={paymentDateInput}
                            onChange={(e) => setPaymentDateInput(e.target.value)}
                            className="mt-1 text-xs bg-white"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-700">Payment Notes / Trx Reference</Label>
                        <Input
                          type="text"
                          value={paymentNotesInput}
                          onChange={(e) => setPaymentNotesInput(e.target.value)}
                          placeholder="e.g. Verified via Bank statement / bKash TrxID"
                          className="mt-1 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenCollectModal(false)}
                        className="cursor-pointer text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isCollecting}
                        className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
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

        {/* DIALOG: REJECT PAYMENT PROOF SLIP */}
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

        {/* LIGHTBOX PHOTO VIEWER */}
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
