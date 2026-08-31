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
  useCollectPaymentMutation,
  useUploadReceiptPhotoMutation,
  useRejectReceiptPhotoMutation,
  useDeleteTransactionMutation,
  useGeneratePaymentsMutation,
  useGetUsersQuery,
  useGetSettingsQuery,
} from '@/lib/api';
import { transactionSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import type { Transaction, User } from '@/types';
import { formatDateTime, formatDate } from '@/lib/utils';
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
  Check,
  Wallet,
  UserCheck,
  UserX,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Receipt as ReceiptIcon,
  Calculator,
  Camera,
  Image as ImageIcon,
  Upload,
  Eye,
  ZoomIn,
  FileImage,
  ExternalLink,
  XCircle,
  Ban,
  FileCheck,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminTransactionsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const staff = canManageTransactions(user);
  const isSuperAdmin = user?.role?.name === 'super_admin';

  // Toggle View: 'created' (Created Demands & Progress) vs 'members_status' (Per-Member Matrix)
  const [activeTab, setActiveTab] = useState<'created' | 'members_status'>('created');

  // Tab 1: Created Demands Filters & State
  const [createdStatusFilter, setCreatedStatusFilter] = useState<'all' | 'pending' | 'complete'>('all');
  const [createdSearch, setCreatedSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Tab 2: Members Dues Matrix State
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'pending' | 'cleared' | 'rejected'>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedMembers, setExpandedMembers] = useState<Record<number, boolean>>({});

  // Query all transactions for full progress & member computation with real-time live polling
  const { data: allTrxData, isLoading: loadingAllTrx } = useGetTransactionsQuery(
    { per_page: 3000 },
    { pollingInterval: 3000 }
  );

  const [createTransaction, { isLoading: isCreatingSingle }] = useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();
  const [collectPayment, { isLoading: isCollecting }] = useCollectPaymentMutation();
  const [uploadReceiptPhoto, { isLoading: isUploadingPhoto }] = useUploadReceiptPhotoMutation();
  const [rejectReceiptPhoto, { isLoading: isRejectingProof }] = useRejectReceiptPhotoMutation();
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

  // Rejection Modal State
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectingTrx, setRejectingTrx] = useState<Transaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Payment proof slip could not be verified by Admin. Please re-upload a clear slip.');

  // Partial / Full Collection Modal State
  const [openCollect, setOpenCollect] = useState(false);
  const [collectingTrx, setCollectingTrx] = useState<Transaction | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile_banking' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [createReceipt, setCreateReceipt] = useState<boolean>(true);
  const [collectionReceiptPhoto, setCollectionReceiptPhoto] = useState<string | null>(null);

  const getCurrentTimeHM = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  React.useEffect(() => {
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

  // Lightbox Receipt Photo Modal (View-only for Admins)
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

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

  // Open Collect Payment Modal (Auto-fill Member Proof Details for Admin)
  const openCollectPaymentModal = (trx: Transaction) => {
    setCollectingTrx(trx);

    const defaultAmount =
      trx.member_paid_amount !== null && trx.member_paid_amount !== undefined
        ? String(trx.member_paid_amount)
        : String(trx.amount);
    setPaidAmountInput(defaultAmount);

    const defaultMethod = (trx.member_payment_method as any) || 'cash';
    setPaymentMethod(defaultMethod);

    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentTime(getCurrentTimeHM());

    const noteParts: string[] = [];
    if (trx.member_trx_reference) {
      noteParts.push(`Ref: ${trx.member_trx_reference}`);
    }
    if (trx.member_comment) {
      noteParts.push(`Note: ${trx.member_comment}`);
    }
    setPaymentNotes(noteParts.join(' | '));

    setCreateReceipt(true);
    setCollectionReceiptPhoto(trx.receipt_photo || null);
    setOpenCollect(true);
  };

  // Open Lightbox Photo Viewer
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

  // Open Rejection Confirmation Dialog
  const openRejectProofModal = (trx: Transaction) => {
    setRejectingTrx(trx);
    setRejectionReason('Payment proof slip could not be verified by Admin. Please re-upload a clear slip.');
    setOpenRejectModal(true);
  };

  // Confirm Rejection of Member Payment Proof Slip
  const onConfirmRejectProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTrx) return;

    const confirmed = window.confirm(
      `Are you sure you want to reject the payment proof slip for ${rejectingTrx.member?.name || 'Member'}?\n\nRejection Reason:\n"${rejectionReason}"\n\nThe slip will be marked as Rejected (Red) and a new pending due will be generated for them.`
    );
    if (!confirmed) return;

    try {
      const res = await rejectReceiptPhoto({
        id: rejectingTrx.id,
        body: { reason: rejectionReason },
      }).unwrap();

      alert(res.message || 'Payment proof slip rejected. Member has been notified to re-submit.');
      setOpenRejectModal(false);
      setRejectingTrx(null);
      if (openCollect && collectingTrx?.id === rejectingTrx.id) {
        setOpenCollect(false);
        setCollectingTrx(null);
      }
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to reject payment proof.');
    }
  };

  // Confirm Collection of Partial or Full Payment
  const onConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingTrx) return;

    const inputNum = Number(paidAmountInput);
    if (isNaN(inputNum) || inputNum <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    const memberName = collectingTrx.member?.name || 'Member';
    const confirmed = window.confirm(
      `Are you sure you want to collect and record payment of BDT ${inputNum.toLocaleString()} for ${memberName}?`
    );
    if (!confirmed) return;

    try {
      const combinedNotes: string[] = [];
      if (paymentNotes.trim()) combinedNotes.push(paymentNotes.trim());
      if (paymentTime.trim()) combinedNotes.push(`Settlement Time: ${paymentTime.trim()}`);

      const res = await collectPayment({
        id: collectingTrx.id,
        body: {
          paid_amount: inputNum,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: combinedNotes.length > 0 ? combinedNotes.join(' | ') : undefined,
          create_receipt: createReceipt,
        },
      }).unwrap();

      alert(res.message);
      setOpenCollect(false);
      setCollectingTrx(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to process payment.');
    }
  };

  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleExpandMember = (memberId: number) => {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

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

  const membersList = useMemo(() => {
    const rawUsers = usersData?.data || [];
    return rawUsers.filter((u) => u.role?.name === 'member');
  }, [usersData]);

  const allTransactions = useMemo(() => {
    return allTrxData?.data || [];
  }, [allTrxData]);

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

    allTransactions.forEach((t) => {
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

      // Progress percentage based on fully cleared members count vs total members
      // (Partial payments do not increment fully cleared member count, but show partial tag and collected amount)
      const memberProgressPercent = totalMembersAssigned > 0
        ? Math.min(100, Math.round((fullyPaidMembersCount / totalMembersAssigned) * 100))
        : 0;

      const progressPercent = totalDemandAmount > 0
        ? Math.min(100, Math.round((totalCollectedAmount / totalDemandAmount) * 100))
        : (totalCollectedAmount > 0 ? 100 : 0);
      const isFullyPaid = pendingMembersCount === 0 && totalMembersAssigned > 0;

      // Calculate 5-status count breakdown for each demand group
      let duePendingCount = 0;
      let receivedSlipCount = 0;
      let rejectedCount = 0;

      Object.entries(memberStatusMap).forEach(([mId, st]) => {
        if (st.hasPaid && !st.hasPending) {
          return;
        }
        const mTrxList = g.transactions.filter((t) => (String(t.member?.id) === String(mId) || String((t as any).member_id) === String(mId)));
        const hasSlip = mTrxList.some((t) => t.status === 'pending' && !!t.receipt_photo);
        const isRej = mTrxList.some((t) => t.status === 'rejected');
        if (hasSlip) receivedSlipCount += 1;
        else if (isRej) rejectedCount += 1;
        else duePendingCount += 1;
      });

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
  }, [allTransactions]);

  const filteredCreatedGroups = useMemo(() => {
    return createdDemandGroups.filter((g) => {
      if (createdStatusFilter === 'pending' && g.isFullyPaid) return false;
      if (createdStatusFilter === 'complete' && !g.isFullyPaid) return false;

      if (createdSearch.trim()) {
        const q = createdSearch.toLowerCase();
        const modifier = getModifierInfo(g);
        const titleMatch = g.title.toLowerCase().includes(q);
        const monthMatch = g.month?.toLowerCase().includes(q);
        const catMatch = g.category.toLowerCase().includes(q);
        const adminMatch = modifier.name.toLowerCase().includes(q) || modifier.role.toLowerCase().includes(q);
        return titleMatch || monthMatch || catMatch || adminMatch;
      }

      return true;
    });
  }, [createdDemandGroups, createdStatusFilter, createdSearch]);

  const memberMatrix = useMemo(() => {
    const trxByMember: Record<number, Transaction[]> = {};
    const paidDueKeySet = new Set<string>();
    const paidMemberMonthSet = new Set<string>();

    allTransactions.forEach((t) => {
      const mId = t.member?.id;
      if (mId) {
        if (!trxByMember[mId]) trxByMember[mId] = [];
        trxByMember[mId].push(t);
      }
      if (t.status === 'paid') {
        const memId = t.member?.id || (t as any).member_id;
        if (memId) {
          if (t.month) paidMemberMonthSet.add(`${memId}___${t.month.trim().toLowerCase()}`);
          if (t.description) paidMemberMonthSet.add(`${memId}___${t.description.trim().toLowerCase()}`);
          const dueKey = `${memId}_${t.payment_category || t.type || ''}_${t.month || ''}_${t.description || ''}`;
          paidDueKeySet.add(dueKey);
        }
      }
    });

    return membersList.map((m) => {
      const memberTrx = trxByMember[m.id] || [];
      const pendingTrx = memberTrx.filter((t) => t.status === 'pending');
      const paidTrx = memberTrx.filter((t) => t.status === 'paid');

      // Keep rejected transactions for dues that are NOT paid yet
      const rejectedTrx = memberTrx.filter((t) => {
        if (t.status !== 'rejected' && !t.rejection_reason) return false;
        const dueKey = `${m.id}_${t.payment_category || t.type || ''}_${t.month || ''}_${t.description || ''}`;
        const isPaid =
          paidDueKeySet.has(dueKey) ||
          (t.month && paidMemberMonthSet.has(`${m.id}___${t.month.trim().toLowerCase()}`)) ||
          (t.description && paidMemberMonthSet.has(`${m.id}___${t.description.trim().toLowerCase()}`));
        return !isPaid;
      });

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
        rejectedTransactions: rejectedTrx,
        totalPendingAmount,
        totalPaidAmount,
        totalDuesAssigned,
        completionPercent,
        hasPending: pendingTrx.length > 0,
        hasRejected: rejectedTrx.length > 0,
      };
    });
  }, [membersList, allTransactions]);

  const stats = useMemo(() => {
    const totalCollected = memberMatrix.reduce((s, m) => s + m.totalPaidAmount, 0);
    const totalPending = memberMatrix.reduce((s, m) => s + m.totalPendingAmount, 0);
    const countWithPending = memberMatrix.filter((m) => m.hasPending).length;
    const countCleared = memberMatrix.filter((m) => !m.hasPending).length;
    const countWithRejected = memberMatrix.filter((m) => m.hasRejected).length;
    const totalRejectedCount = memberMatrix.reduce((sum, m) => sum + m.rejectedTransactions.length, 0);
    const totalMembers = memberMatrix.length;

    return {
      totalCollected,
      totalPending,
      countWithPending,
      countCleared,
      countWithRejected,
      totalRejectedCount,
      totalMembers,
    };
  }, [memberMatrix]);

  const filteredMembers = useMemo(() => {
    return memberMatrix.filter((m) => {
      if (memberStatusFilter === 'pending' && !m.hasPending) return false;
      if (memberStatusFilter === 'cleared' && m.hasPending) return false;
      if (memberStatusFilter === 'rejected' && !m.hasRejected) return false;

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

  const origDue = collectingTrx ? Number(collectingTrx.amount) : 0;
  const numInputPaid = Number(paidAmountInput) || 0;
  const computedRemainingDue = Math.max(0, Math.round((origDue - numInputPaid) * 100) / 100);
  const isFullSettlement = computedRemainingDue === 0 && numInputPaid >= origDue;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Demands & Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'created'
              ? 'Create monthly subscriptions & one-time dues, track campaign collection progress lines, and view member receipt slips.'
              : 'Monitor member payment statuses, view uploaded receipt photos, and collect pending dues with live settlement.'}
          </p>
        </div>
        {staff && activeTab === 'created' && (
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
                setOpenDemand(true);
              }}
              className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm"
            >
              <CalendarCheck className="h-4 w-4" /> Create / Assign Payment
            </Button>
          </div>
        )}
      </div>

      {/* 2 TOP-LEVEL TOGGLE PAGES / TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('created')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'created'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Transactions & Created Records</span>
          <span className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
            activeTab === 'created' ? 'bg-emerald-950/80 text-emerald-200' : 'bg-slate-200 text-slate-700'
          }`}>
            {createdDemandGroups.length} Campaigns
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

      {/* VIEW 1: TRANSACTIONS & CREATED RECORDS */}
      {activeTab === 'created' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">Total Created Fee Campaigns</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {createdDemandGroups.length} Billing Demands
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 block">Total Collected to Date</span>
              <div className="text-xl font-bold text-emerald-900 mt-0.5">
                BDT {stats.totalCollected.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800 block">Total Outstanding Pending</span>
              <div className="text-xl font-bold text-amber-900 mt-0.5">
                BDT {stats.totalPending.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setCreatedStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  createdStatusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Created Demands ({createdDemandGroups.length})
              </button>

              <button
                onClick={() => setCreatedStatusFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  createdStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <Clock className="h-3 w-3" />
                Pending Collection ({createdDemandGroups.filter((g) => !g.isFullyPaid).length})
              </button>

              <button
                onClick={() => setCreatedStatusFilter('complete')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  createdStatusFilter === 'complete'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-100/80 text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Fully Completed ({createdDemandGroups.filter((g) => g.isFullyPaid).length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search by demand title, admin, month..."
                value={createdSearch}
                onChange={(e) => setCreatedSearch(e.target.value)}
                className="pl-9 bg-slate-50 text-xs h-9"
              />
            </div>
          </div>

          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-900">Billing Demand / Record</TableHead>
                    <TableHead className="font-bold text-slate-900">Created / Updated By</TableHead>
                    <TableHead className="font-bold text-slate-900 min-w-[240px]">Total Members & Progress Line</TableHead>
                    <TableHead className="font-bold text-slate-900">Status</TableHead>
                    <TableHead className="font-bold text-slate-900">Updated Date</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">Assigned Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAllTrx && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading created fee records...</TableCell></TableRow>
                  )}
                  {filteredCreatedGroups.length === 0 && !loadingAllTrx && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No created billing records found.</TableCell></TableRow>
                  )}
                  {filteredCreatedGroups.map((group) => {
                    const modifier = getModifierInfo(group);
                    const isExpanded = !!expandedGroups[group.key];
                    const displayDate = group.updated_at || group.created_at || group.dueDate;

                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="hover:bg-slate-50/70 transition-colors">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{group.title}</span>
                                <Badge variant="secondary" className="capitalize text-[10px] font-semibold">
                                  {group.category === 'monthly_payment'
                                    ? 'Monthly'
                                    : group.category === 'one_time'
                                    ? 'One-Time'
                                    : group.category}
                                </Badge>
                                {(group.transaction_no || group.id) && (
                                  <span className="text-[11px] font-mono text-slate-500">
                                    #{group.transaction_no || group.id}
                                  </span>
                                )}
                              </div>
                              {group.dueDate && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span>Due: {group.dueDate}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 text-xs">{modifier.name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 capitalize ${
                                    modifier.role?.toLowerCase().includes('super')
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

                          <TableCell>
                            <div className="space-y-1 max-w-xs">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                  <Users className="h-3 w-3 text-slate-500 inline" />
                                  <span>{group.paidCount} / {group.totalMembersAssigned} Paid</span>
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

                          <TableCell>
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

                          <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                            {displayDate}
                          </TableCell>

                          <TableCell className="text-right whitespace-nowrap">
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

                        {/* Expandable Members Sub-Table */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                            <TableCell colSpan={6} className="p-4">
                              <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-emerald-700" />
                                    Assigned Member Details & Receipt Slips for &ldquo;{group.title}&rdquo;
                                  </h4>
                                  <span className="text-xs text-slate-500">
                                    {group.paidCount} of {group.totalMembersAssigned} members cleared ({group.memberProgressPercent}% cleared)
                                    {group.partiallyPaidCount > 0 && (
                                      <span className="text-purple-700 font-semibold ml-1.5">
                                        • {group.partiallyPaidCount} partially paid
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="border border-slate-100 rounded-lg overflow-x-auto">
                                  <Table className="table-fixed w-full min-w-[1000px]">
                                    <TableHeader className="bg-slate-50">
                                      <TableRow className="text-xs">
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Member Name</TableHead>
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Member ID</TableHead>
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Date</TableHead>
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Transaction No</TableHead>
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Amount</TableHead>
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Receipt Photo / Proof</TableHead>
                                        <TableHead className="w-[14.28%] text-center font-semibold text-slate-700">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(() => {
                                        const memberTrxMap: Record<string | number, any[]> = {};

                                        // Group all transactions in this campaign by member
                                        group.transactions.forEach((trx) => {
                                          const mId = trx.member?.id || (trx as any).member_id || `anon_${trx.id}`;
                                          if (!memberTrxMap[mId]) {
                                            memberTrxMap[mId] = [];
                                          }
                                          memberTrxMap[mId].push(trx);
                                        });

                                        // For each member, determine their latest status:
                                        // If member has both paid and pending due -> Partially Paid (use pending due for action)
                                        // If latest is paid -> Paid
                                        // If latest is pending with a new slip -> Slip Received
                                        // If latest is empty pending due, but prior submission was rejected -> Rejected
                                        // Otherwise -> latest (Pending Due)
                                        const currentTransactions = Object.values(memberTrxMap).map((mTrxList) => {
                                          const sorted = [...mTrxList].sort((a, b) => {
                                            const dateA = a.created_at || a.updated_at || a.transaction_date || '';
                                            const dateB = b.created_at || b.updated_at || b.transaction_date || '';
                                            return dateB.localeCompare(dateA) || (b.id || 0) - (a.id || 0);
                                          });

                                          const hasPaid = mTrxList.some((t) => t.status === 'paid');
                                          const pendingTrx = mTrxList.find((t) => t.status === 'pending');

                                          if (hasPaid && pendingTrx) {
                                            const totalPaidPortion = mTrxList
                                              .filter((t) => t.status === 'paid')
                                              .reduce((sum, t) => sum + Number(t.amount || 0), 0);
                                            const totalPendingPortion = mTrxList
                                              .filter((t) => t.status === 'pending')
                                              .reduce((sum, t) => sum + Number(t.amount || 0), 0);

                                            return {
                                              ...pendingTrx,
                                              isPartialPayment: true,
                                              paidAmountSummary: totalPaidPortion,
                                              totalAssignedAmount: totalPaidPortion + totalPendingPortion,
                                            } as any;
                                          }

                                          const latest = sorted[0];

                                          if (latest.status === 'pending' && !latest.receipt_photo) {
                                            const lastRejected = sorted.find((t) => t.status === 'rejected' || !!t.rejection_reason);
                                            if (lastRejected) {
                                              return lastRejected;
                                            }
                                          }

                                          return latest;
                                        }).sort((a, b) =>
                                          (a.member?.name || '').localeCompare(b.member?.name || '')
                                        );

                                        return currentTransactions.map((trx: any) => {
                                          const isPartial = trx.isPartialPayment || trx.status === 'partial' || trx.status === 'partially_paid';
                                          const isPaid = !isPartial && trx.status === 'paid';
                                          const isRejected = !isPartial && trx.status === 'rejected';
                                          const isSlipReceived = !isPartial && trx.status === 'pending' && !!trx.receipt_photo;
                                          const isPendingDue = !isPartial && trx.status === 'pending' && !trx.receipt_photo;

                                          return (
                                            <TableRow key={trx.id} className="text-xs">
                                              <TableCell className="p-3 align-middle text-center font-bold text-slate-900 truncate" title={trx.member?.name}>
                                                {trx.member?.name ?? '-'}
                                              </TableCell>
                                              <TableCell className="p-3 align-middle text-center font-mono text-emerald-800 font-bold truncate">
                                                {trx.member?.member_no ?? 'Unassigned'}
                                              </TableCell>
                                              <TableCell className="p-3 align-middle text-center text-slate-600 font-medium whitespace-nowrap">
                                                {trx.transaction_date}
                                              </TableCell>
                                              <TableCell className="p-3 align-middle text-center font-mono text-slate-500 text-[11px] truncate" title={trx.transaction_no}>
                                                {trx.transaction_no}
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
                                                    {trx.member_trx_reference && (
                                                      <span className="text-[9px] font-mono text-slate-500 truncate max-w-full text-center block" title={trx.member_trx_reference}>
                                                        Ref: {trx.member_trx_reference}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="text-[11px] text-slate-400 italic text-center block">No slip uploaded</span>
                                                )}
                                              </TableCell>

                                              {/* Status Column with Distinct Colors */}
                                              <TableCell className="p-3 align-middle text-center">
                                                {isPaid ? (
                                                  <div className="flex justify-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs">
                                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Paid
                                                    </span>
                                                  </div>
                                                ) : isSlipReceived ? (
                                                  <div className="flex justify-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 whitespace-nowrap shadow-2xs">
                                                      <FileCheck className="h-3.5 w-3.5 text-blue-600" /> Received Slip
                                                    </span>
                                                  </div>
                                                ) : isPartial ? (
                                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 whitespace-nowrap shadow-2xs">
                                                      <Wallet className="h-3.5 w-3.5 text-purple-600" /> Partially Paid
                                                    </span>
                                                    {trx.paidAmountSummary && trx.totalAssignedAmount && (
                                                      <span className="text-[9px] font-mono text-purple-700 font-semibold">
                                                        {Math.round((trx.paidAmountSummary / trx.totalAssignedAmount) * 100)}% Cleared
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : isRejected ? (
                                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300 whitespace-nowrap shadow-2xs">
                                                      <XCircle className="h-3.5 w-3.5 text-red-600" /> Slip Rejected
                                                    </span>
                                                    {trx.rejection_reason && (
                                                      <span className="text-[9px] text-red-700 italic max-w-full truncate text-center block font-medium" title={`Reason: ${trx.rejection_reason}`}>
                                                        {trx.rejection_reason}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="flex justify-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap shadow-2xs">
                                                      <Clock className="h-3.5 w-3.5 text-amber-600" /> Due Pending
                                                    </span>
                                                  </div>
                                                )}
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

      {/* VIEW 2: MEMBERS PAYMENT STATUS MATRIX */}
      {activeTab === 'members_status' && (
        <div className="space-y-5">
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

              {stats.countWithRejected > 0 && (
                <button
                  onClick={() => setMemberStatusFilter('rejected')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    memberStatusFilter === 'rejected'
                      ? 'bg-red-700 text-white shadow-2xs'
                      : 'bg-red-100/80 text-red-900 hover:bg-red-200'
                  }`}
                >
                  <XCircle className="h-3 w-3 text-red-600" />
                  Has Rejected Slips ({stats.countWithRejected})
                </button>
              )}
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
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                            {(() => {
                              const slipReceivedCount = pendingTransactions.filter((t) => !!t.receipt_photo).length;
                              const duePendingCount = pendingTransactions.filter((t) => !t.receipt_photo).length;
                              const partiallyPaidCount = pendingTransactions.filter((t) => {
                                const dueKey = `${member.id}_${t.payment_category || t.type || ''}_${t.month || ''}_${t.description || ''}`;
                                return paidTransactions.some((p) => {
                                  const pKey = `${member.id}_${p.payment_category || p.type || ''}_${p.month || ''}_${p.description || ''}`;
                                  return pKey === dueKey || (t.month && p.month === t.month);
                                });
                              }).length;

                              return (
                                <>
                                  {partiallyPaidCount > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-purple-50 text-purple-800 border-purple-300 flex items-center gap-1">
                                      <Wallet className="h-3 w-3 text-purple-600" />
                                      {partiallyPaidCount === 1 ? 'Partially Paid' : `${partiallyPaidCount} Partially Paid`}
                                    </span>
                                  )}
                                  {slipReceivedCount > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-blue-50 text-blue-800 border-blue-300 flex items-center gap-1">
                                      <FileCheck className="h-3 w-3 text-blue-600" />
                                      {slipReceivedCount === 1 ? 'Received Slip' : `${slipReceivedCount} Received Slips`}
                                    </span>
                                  )}
                                  {duePendingCount > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-amber-600" />
                                      {duePendingCount === 1 ? 'Due Pending' : `${duePendingCount} Due Pending`}
                                    </span>
                                  )}
                                  {!hasPending && paidTransactions.length > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      All Cleared
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            {item.hasRejected && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-red-50 text-red-800 border-red-300 flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-600" />
                                {item.rejectedTransactions.length} Slip Rejected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {member.member_profile?.phone && <span>{member.member_profile.phone}</span>}
                            <span>•</span>
                            <span>{member.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-emerald-700">Paid: BDT {totalPaidAmount.toLocaleString()}</span>
                          {hasPending && (
                            <span className="text-amber-800 font-bold">
                              Due: BDT {totalPendingAmount.toLocaleString()}
                            </span>
                          )}
                        </div>

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

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleExpandMember(member.id)}
                          className="h-8 text-xs cursor-pointer text-slate-700 border-slate-200 hover:bg-slate-100"
                        >
                          {isExpanded ? (
                            <>
                              Hide Details <ChevronUp className="h-3.5 w-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              View Details & Slips ({item.transactions.length}) <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-4">
                        {pendingTransactions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              Unpaid / Pending Payment Dues ({pendingTransactions.length})
                            </h4>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {pendingTransactions.map((pt) => {
                                const isRemainingDue = (pt.description && /remaining due/i.test(pt.description)) || (pt.description && /partial payment/i.test(pt.description));

                                return (
                                <div
                                  key={pt.id}
                                  className={`p-3.5 bg-white rounded-lg border shadow-2xs flex flex-col justify-between gap-3 ${
                                    isRemainingDue ? 'border-purple-300' : 'border-amber-300'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-slate-900">
                                        {pt.month ? pt.month : pt.description || 'Assigned Payment'}
                                      </span>
                                      <div className="flex flex-col items-end">
                                        <span className={`font-mono text-xs font-bold ${isRemainingDue ? 'text-purple-900' : 'text-amber-900'}`}>
                                          BDT {Number(pt.amount).toLocaleString()}
                                        </span>
                                        {isRemainingDue && (
                                          <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 mt-0.5">
                                            Remaining Due
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-0.5">
                                      <div className="flex items-center justify-between">
                                        <span>Due Date: <b>{pt.transaction_date}</b></span>
                                        <span className="font-mono text-[10px] text-slate-400">{pt.transaction_no}</span>
                                      </div>
                                      {pt.receipt_photo_uploaded_at && (
                                        <div className="text-[10px] text-blue-700 font-medium">
                                          Received / Slip: <b>{formatDateTime(pt.receipt_photo_uploaded_at)}</b>
                                        </div>
                                      )}
                                      {pt.created_at && (
                                        <div className="text-[10px] text-slate-400">
                                          Demand Issued: {formatDateTime(pt.created_at)}
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                                      {pt.receipt_photo ? (
                                        <>
                                          <div className="flex items-center justify-between flex-wrap gap-1">
                                            <ReceiptSlipThumbnail
                                              photoUrl={pt.receipt_photo}
                                              title={`${member.name} - ${pt.month || pt.description || 'Receipt Slip'}`}
                                              date={pt.receipt_photo_uploaded_at ? `Uploaded: ${formatDateTime(pt.receipt_photo_uploaded_at)}` : undefined}
                                              isRejected={pt.status === 'rejected'}
                                              isPartial={Boolean(isRemainingDue)}
                                              rejectionReason={pt.rejection_reason}
                                              onClick={() => viewReceiptPhoto(pt.receipt_photo!, `${member.name} - ${pt.month || pt.description || 'Receipt Slip'}`, pt.receipt_photo_uploaded_at, pt.status === 'rejected', pt.rejection_reason)}
                                            />
                                            {pt.member_paid_amount && (
                                              <span className={`text-[11px] font-bold ${isRemainingDue ? 'text-purple-800' : 'text-emerald-800'}`}>
                                                Paid: BDT {Number(pt.member_paid_amount).toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                          {(pt.member_trx_reference || pt.member_payment_method || pt.member_comment) && (
                                            <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                                              {pt.member_payment_method && (
                                                <span className="font-semibold capitalize text-emerald-900">
                                                  {pt.member_payment_method.replace(/_/g, ' ') || 'mobile_banking'}
                                                </span>
                                              )}
                                              {pt.member_trx_reference && (
                                                <span className="font-mono ml-1.5 font-bold text-slate-700">
                                                  ID: {pt.member_trx_reference}
                                                </span>
                                              )}
                                              {pt.member_comment && (
                                                <div className="italic text-slate-500 mt-0.5">&ldquo;{pt.member_comment}&rdquo;</div>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[11px] text-slate-400 italic">No slip uploaded by member</span>
                                      )}
                                    </div>
                                  </div>

                                  {staff && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => openCollectPaymentModal(pt)}
                                        className="flex-1 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs"
                                      >
                                        <Wallet className="h-3.5 w-3.5 mr-1" /> Collect / Settle
                                      </Button>
                                      {pt.receipt_photo && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openRejectProofModal(pt)}
                                          className="h-8 px-2.5 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 cursor-pointer shadow-2xs"
                                          title="Reject invalid payment proof slip"
                                        >
                                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {item.rejectedTransactions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                              Rejected Payment Proof Slips & Declined Claims ({item.rejectedTransactions.length})
                            </h4>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {item.rejectedTransactions.map((rt) => (
                                <div
                                  key={rt.id}
                                  className="p-3.5 bg-red-50/50 rounded-lg border border-red-200 shadow-2xs flex flex-col justify-between gap-3"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-slate-900">
                                        {rt.month ? rt.month : rt.description || 'Assigned Fee'}
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                        <XCircle className="h-3 w-3 text-red-600" /> Rejected
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                                      <span>Due: <b className="font-mono text-slate-800">BDT {Number(rt.amount).toLocaleString()}</b></span>
                                      <span className="font-mono text-[10px] text-slate-400">{rt.transaction_no}</span>
                                    </div>

                                    {/* Decline Reason Banner */}
                                    <div className="mt-2 p-2 bg-red-100/90 border border-red-300 rounded text-xs text-red-950">
                                      <span className="font-bold text-[10px] uppercase text-red-800 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3 text-red-600" /> Decline Reason:
                                      </span>
                                      <p className="text-[11px] italic mt-0.5">&ldquo;{rt.rejection_reason || 'Payment proof slip could not be verified by Admin.'}&rdquo;</p>
                                    </div>

                                    {/* Slip thumbnail & info */}
                                    {rt.receipt_photo && (
                                      <div className="mt-2.5 pt-2 border-t border-red-200 flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between flex-wrap gap-1">
                                          <ReceiptSlipThumbnail
                                            photoUrl={rt.receipt_photo}
                                            title={`${member.name} - ${rt.month || rt.description || 'Rejected Slip'}`}
                                            date={rt.receipt_photo_uploaded_at ? `Uploaded: ${rt.receipt_photo_uploaded_at}` : undefined}
                                            isRejected={true}
                                            rejectionReason={rt.rejection_reason}
                                            onClick={() => viewReceiptPhoto(
                                              rt.receipt_photo!,
                                              `${member.name} - ${rt.month || rt.description || 'Rejected Slip'}`,
                                              rt.receipt_photo_uploaded_at,
                                              true,
                                              rt.rejection_reason
                                            )}
                                          />
                                          {rt.member_paid_amount && (
                                            <span className="text-[11px] font-bold text-red-950">
                                              Claimed: BDT {Number(rt.member_paid_amount).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                        {(rt.member_trx_reference || rt.member_payment_method || rt.member_comment) && (
                                          <div className="text-[10px] text-slate-700 bg-white p-1.5 rounded border border-red-200">
                                            {rt.member_payment_method && (
                                              <span className="font-semibold capitalize text-slate-900">
                                                {rt.member_payment_method.replace(/_/g, ' ')}
                                              </span>
                                            )}
                                            {rt.member_trx_reference && (
                                              <span className="font-mono ml-1.5 font-bold text-slate-800">
                                                ID: {rt.member_trx_reference}
                                              </span>
                                            )}
                                            {rt.member_comment && (
                                              <div className="italic text-slate-500 mt-0.5">&ldquo;{rt.member_comment}&rdquo;</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Completed / Paid Records & Receipt Photos ({paidTransactions.length})
                          </h4>

                          {paidTransactions.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No completed payments recorded yet.</p>
                          ) : (
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <Table className="table-fixed w-full min-w-[750px]">
                                <TableHeader className="bg-slate-50">
                                  <TableRow className="text-xs">
                                    <TableHead className="w-[18%] text-center font-semibold text-slate-700">Transaction No</TableHead>
                                    <TableHead className="w-[22%] text-center font-semibold text-slate-700">Month / Description</TableHead>
                                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Amount</TableHead>
                                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Receipt Photo / Slip</TableHead>
                                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Status</TableHead>
                                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Payment Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paidTransactions.map((paid) => {
                                    const isPartialPaid = (paid.description && /partial payment/i.test(paid.description)) || (paid.description && /remaining due/i.test(paid.description));

                                    return (
                                      <TableRow key={paid.id} className="text-xs">
                                        <TableCell className="p-3 align-middle text-center font-mono font-medium text-slate-600">{paid.transaction_no}</TableCell>
                                        <TableCell className="p-3 align-middle text-center font-medium text-slate-800">{paid.month || paid.description || paid.type}</TableCell>
                                        <TableCell className="p-3 align-middle text-center font-bold text-slate-900">BDT {Number(paid.amount).toLocaleString()}</TableCell>
                                        
                                        <TableCell className="p-3 align-middle text-center">
                                          {paid.receipt_photo ? (
                                            <div className="flex justify-center">
                                              <ReceiptSlipThumbnail
                                                photoUrl={paid.receipt_photo}
                                                title={`${member.name} - ${paid.month || paid.description || 'Receipt Slip'}`}
                                                date={paid.receipt_photo_uploaded_at ? `Uploaded: ${paid.receipt_photo_uploaded_at}` : undefined}
                                                isRejected={paid.status === 'rejected'}
                                                isPartial={Boolean(isPartialPaid)}
                                                rejectionReason={paid.rejection_reason}
                                                onClick={() => viewReceiptPhoto(
                                                  paid.receipt_photo!,
                                                  `${member.name} - ${paid.month || paid.description || 'Receipt Slip'}`,
                                                  paid.receipt_photo_uploaded_at,
                                                  paid.status === 'rejected',
                                                  paid.rejection_reason
                                                )}
                                              />
                                            </div>
                                          ) : (
                                            <span className="text-[11px] text-slate-400 italic text-center block">-</span>
                                          )}
                                        </TableCell>

                                        <TableCell className="p-3 align-middle text-center">
                                          <div className="flex justify-center">
                                            {isPartialPaid ? (
                                              <div className="flex flex-col items-center justify-center gap-0.5">
                                                <Badge className="bg-purple-50 text-purple-800 border-purple-300 text-[10px]">
                                                  Partially Paid
                                                </Badge>
                                                <span className="text-[9px] text-purple-700 font-semibold">Partial Payment</span>
                                              </div>
                                            ) : (
                                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                                                Paid
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="p-3 align-middle text-center text-slate-600">
                                          <div className="flex flex-col items-center gap-0.5">
                                            <span className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                                              <CheckCircle2 className="h-3 w-3 inline text-emerald-600 shrink-0" />
                                              <span>Settled: {formatDateTime(paid.updated_at || paid.transaction_date)}</span>
                                            </span>
                                            {paid.receipt_photo_uploaded_at && (
                                              <span className="text-[10px] text-blue-700 font-medium">
                                                Received / Slip: {formatDateTime(paid.receipt_photo_uploaded_at)}
                                              </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-medium">
                                              Due: {paid.transaction_date}
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
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

      {/* DIALOG: COLLECT PAYMENT */}
      <Dialog open={openCollect} onOpenChange={setOpenCollect}>
        <DialogContent className={collectingTrx?.receipt_photo ? "w-[96vw] max-w-6xl xl:max-w-7xl max-h-[95vh] overflow-y-auto p-5 sm:p-6" : "max-w-lg"}>
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2 pr-6">
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg">
                <Wallet className="h-5 w-5 text-emerald-700" />
                Collect Payment &amp; Settle Dues
              </DialogTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-2xs font-medium">
                <Clock className="h-3.5 w-3.5 text-emerald-700 animate-pulse shrink-0" />
                <span className="text-slate-500">Current Time:</span>
                <span className="font-bold text-slate-900 font-mono">{currentTime}</span>
              </div>
            </div>
          </DialogHeader>

          {collectingTrx && (
            <div className={collectingTrx.receipt_photo ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2" : "pt-1"}>
              {collectingTrx.receipt_photo && (
                <div className="lg:col-span-6 flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner text-white min-h-[500px] h-full">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-emerald-400" /> Member Payment Slip
                    </span>
                    {collectingTrx.receipt_photo_uploaded_at && (
                      <span className="text-[11px] text-slate-300 font-mono font-medium">
                        Uploaded: {formatDateTime(collectingTrx.receipt_photo_uploaded_at)}
                      </span>
                    )}
                  </div>

                  <div className="py-3 my-auto w-full">
                    <MagnifiableModalImage
                      src={collectingTrx.receipt_photo}
                      alt={`${collectingTrx.member?.name || 'Member'} Slip`}
                      zoomScale={2.5}
                      className="min-h-[420px] max-h-[560px]"
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

              <div className={collectingTrx.receipt_photo ? "lg:col-span-6 flex flex-col justify-between" : ""}>
                <form onSubmit={onConfirmCollection} className="space-y-3.5">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block">Member</span>
                        <span className="font-bold text-slate-900 text-sm">{collectingTrx.member?.name ?? '-'}</span>
                        {collectingTrx.member?.member_no && (
                          <span className="text-[10px] font-mono text-emerald-800 ml-1.5 font-bold">
                            (ID: {collectingTrx.member.member_no})
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 block">Total Due Amount</span>
                        <span className="text-base font-bold text-slate-900 font-mono">
                          BDT {origDue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 border-t border-slate-200/80 pt-1.5 flex justify-between items-center">
                      <span>Fee Item: <b>{collectingTrx.month || collectingTrx.description || collectingTrx.type}</b></span>
                      <div className="text-right font-mono text-slate-400 text-[10px]">
                        <div>{collectingTrx.transaction_no}</div>
                        {collectingTrx.created_at && <div>Issued: {formatDateTime(collectingTrx.created_at)}</div>}
                      </div>
                    </div>
                  </div>

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
                        <div>Transaction Type: <b className="capitalize">{collectingTrx.member_payment_method?.replace(/_/g, ' ') || 'Not specified'}</b></div>
                        {collectingTrx.receipt_photo_uploaded_at && (
                          <div className="sm:col-span-2 text-[10px]">
                            <span className="text-emerald-800 font-medium">Slip Uploaded At:</span>{' '}
                            <b className="text-emerald-950 font-bold">{formatDateTime(collectingTrx.receipt_photo_uploaded_at)}</b>
                          </div>
                        )}
                        {collectingTrx.member_trx_reference && (
                          <div className="sm:col-span-2 font-mono">Reference Code / TrxID: <b>{collectingTrx.member_trx_reference}</b></div>
                        )}
                        {collectingTrx.member_comment && (
                          <div className="sm:col-span-2">Member Note: <i>&ldquo;{collectingTrx.member_comment}&rdquo;</i></div>
                        )}
                      </div>

                      <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/80 pt-1">
                        * The fields below have been auto-filled with these member details. You can edit and adjust any value before confirming settlement.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-slate-900 text-xs flex items-center gap-1">
                        <Calculator className="h-3.5 w-3.5 text-emerald-700" />
                        Paid Amount (BDT Input Value)
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPaidAmountInput(String(origDue))}
                          className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded"
                        >
                          Pay Full (BDT {origDue})
                        </button>
                        {origDue >= 2 && (
                          <button
                            type="button"
                            onClick={() => setPaidAmountInput(String(origDue / 2))}
                            className="text-[11px] font-bold text-slate-700 hover:underline cursor-pointer bg-slate-100 px-2 py-0.5 rounded"
                          >
                            50% (BDT {origDue / 2})
                          </button>
                        )}
                      </div>
                    </div>

                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount member is paying"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="bg-white text-base font-bold font-mono text-slate-900 border-emerald-600 focus:ring-emerald-700"
                      required
                      autoFocus
                    />
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${
                    isFullSettlement
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-amber-50 border-amber-300'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        {isFullSettlement ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-emerald-900">Payment Status: Full Payment</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-950">Payment Status: Partial Payment</span>
                          </>
                        )}
                      </span>

                      <span className={`font-mono text-xs ${
                        isFullSettlement ? 'text-emerald-800' : 'text-amber-900'
                      }`}>
                        {isFullSettlement ? 'BDT 0.00 Remaining Due' : `BDT ${computedRemainingDue.toLocaleString()} Remaining Due`}
                      </span>
                    </div>

                    {!isFullSettlement && computedRemainingDue > 0 && (
                      <p className="text-[11px] text-amber-800 mt-1">
                        A new pending due transaction of <b>BDT {computedRemainingDue.toLocaleString()}</b> will remain on the member&rsquo;s account until cleared.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-900">Payment Method</Label>
                      <select
                        className="w-full border border-slate-300 rounded-md p-2 bg-white text-xs mt-1 font-medium cursor-pointer h-9"
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                      >
                        <option value="cash">Cash in Hand</option>
                        <option value="mobile_banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                        <option value="bank">Bank Transfer / Deposit</option>
                        <option value="other">Other Method</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-900">Settlement Date</Label>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="bg-white mt-1 text-xs h-9"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900">Settlement Time</Label>
                        <button
                          type="button"
                          onClick={() => setPaymentTime(getCurrentTimeHM())}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                          title="Set to Current Time"
                        >
                          <Clock className="h-2.5 w-2.5" /> Now
                        </button>
                      </div>
                      <Input
                        type="time"
                        value={paymentTime}
                        onChange={(e) => setPaymentTime(e.target.value)}
                        className="bg-white mt-1 text-xs font-mono h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">Payment Notes / Reference (Optional)</Label>
                    <Input
                      placeholder="e.g. bKash TrxID: 9X29A..., Received at monthly meeting"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="bg-white mt-1 text-xs"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={createReceipt}
                      onChange={(e) => setCreateReceipt(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-700"
                    />
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <ReceiptIcon className="h-3.5 w-3.5 text-emerald-700" />
                      Generate Official Printable Receipt for BDT {numInputPaid.toLocaleString()}
                    </span>
                  </label>

                  <DialogFooter className="pt-2 flex items-center justify-between flex-wrap gap-2">
                    {collectingTrx.receipt_photo && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openRejectProofModal(collectingTrx)}
                        className="cursor-pointer text-red-700 border-red-300 hover:bg-red-50 hover:text-red-800 flex items-center gap-1.5 text-xs mr-auto"
                      >
                        <XCircle className="h-4 w-4 text-red-600" /> Reject Proof Slip
                      </Button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button type="button" variant="outline" onClick={() => setOpenCollect(false)} className="cursor-pointer text-xs">
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isCollecting}
                        className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                      >
                        {isCollecting ? 'Processing...' : `Confirm & Settle (BDT ${numInputPaid.toLocaleString()})`}
                      </Button>
                    </div>
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
            <form onSubmit={onConfirmRejectProof} className="space-y-4 pt-1">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-red-950">
                    Member: {rejectingTrx.member?.name || 'Member'}
                  </span>
                  {rejectingTrx.member?.member_no && (
                    <span className="font-mono text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                      ID: {rejectingTrx.member.member_no}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-red-800 border-t border-red-200/80 pt-1.5 flex justify-between">
                  <span>Fee Item: <b>{rejectingTrx.month || rejectingTrx.description || rejectingTrx.transaction_no}</b></span>
                  <span className="font-mono font-bold">Due: BDT {Number(rejectingTrx.amount).toLocaleString()}</span>
                </div>

                <div className="text-[10px] text-red-700 pt-1 border-t border-red-200/80 flex items-start gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    This row will be preserved as <b>Rejected</b>. A <b>new pending row</b> will be automatically created so the member can upload a valid proof.
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Quick Select Reason</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Transaction ID not found in bank statement',
                    'Receipt slip image is blurry or unreadable',
                    'Amount mismatch between slip and bank record',
                    'Duplicate slip already used for another payment',
                    'Transferred to incorrect bank account',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer text-left ${
                        rejectionReason === preset
                          ? 'bg-red-600 text-white border-red-600 font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Rejection Reason (Directly Delivered to Member)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Editable</span>
                </Label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs mt-1.5 focus:ring-red-500 focus:border-red-500 min-h-[85px] leading-relaxed"
                  placeholder="Explain why this proof slip was rejected so the member understands what to fix..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-red-100/90 border border-red-300 rounded-xl text-red-950 text-xs flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-xs text-red-950">Confirmation: Are you sure you want to reject this slip?</p>
                  <p className="text-[11px] text-red-900 leading-normal">
                    This slip will turn <b>Red (Rejected)</b>. The member will receive an instant alert with your rejection reason, and a <b>new pending due ({rejectingTrx.amount ? `BDT ${Number(rejectingTrx.amount).toLocaleString()}` : ''})</b> will be generated for them to re-submit.
                  </p>
                </div>
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
                  disabled={isRejectingProof}
                  className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isRejectingProof ? 'Processing...' : 'Yes, Confirm Rejection & Notify Member'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 1: CREATE / ASSIGN PAYMENT DEMAND */}
      <Dialog open={openDemand} onOpenChange={setOpenDemand}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CalendarCheck className="h-5 w-5 text-emerald-700" />
              Create & Assign Payment Dues
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

      {/* DIALOG 2: MANUAL RECORD TRANSACTION */}
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

      {/* Lightbox Dialog with 2.5x Magnifier Lens */}
      <Dialog open={openPhotoModal} onOpenChange={setOpenPhotoModal}>
        <DialogContent className={`max-w-2xl max-h-[92vh] overflow-y-auto ${
          photoModalIsRejected ? 'border-red-500/60 shadow-2xl' : ''
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              {photoModalIsRejected ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <span className="text-red-950 font-bold">{photoModalTitle || 'Member Payment Slip'} (Rejected)</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-emerald-700 shrink-0" />
                  <span>{photoModalTitle || 'Member Payment Slip / Receipt Photo'}</span>
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
                  * This slip is archived as Rejected. A new pending due row has been generated for the member.
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
                <Eye className="h-3.5 w-3.5" /> Open Full Image in New Tab
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
    </div>
  );
}
