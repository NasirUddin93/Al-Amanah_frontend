'use client';
import React, { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TransactionsPage() {
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
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'pending' | 'cleared'>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedMembers, setExpandedMembers] = useState<Record<number, boolean>>({});

  // Query all transactions for full progress & member computation
  const { data: allTrxData, isLoading: loadingAllTrx } = useGetTransactionsQuery({
    per_page: 3000,
  });

  const [createTransaction, { isLoading: isCreatingSingle }] = useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();
  const [collectPayment, { isLoading: isCollecting }] = useCollectPaymentMutation();
  const [uploadReceiptPhoto, { isLoading: isUploadingPhoto }] = useUploadReceiptPhotoMutation();
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

  // Partial / Full Collection Modal State
  const [openCollect, setOpenCollect] = useState(false);
  const [collectingTrx, setCollectingTrx] = useState<Transaction | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile_banking' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [createReceipt, setCreateReceipt] = useState<boolean>(true);
  const [collectionReceiptPhoto, setCollectionReceiptPhoto] = useState<string | null>(null);

  // Lightbox Receipt Photo Modal
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');

  // Hidden File Input Trigger
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadTrxId, setTargetUploadTrxId] = useState<number | null>(null);

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

  // Open Collect Payment Modal (Partial or Full)
  const openCollectPaymentModal = (trx: Transaction) => {
    setCollectingTrx(trx);
    setPaidAmountInput(String(trx.amount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setCreateReceipt(true);
    setCollectionReceiptPhoto(trx.receipt_photo || null);
    setOpenCollect(true);
  };

  // Open Lightbox Photo Viewer
  const viewReceiptPhoto = (url: string, title: string, date?: string) => {
    setPhotoModalUrl(url);
    setPhotoModalTitle(title);
    setPhotoModalDate(date || '');
    setOpenPhotoModal(true);
  };

  // Trigger File Upload for a Transaction
  const triggerPhotoUpload = (trxId: number) => {
    setTargetUploadTrxId(trxId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadTrxId) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        await uploadReceiptPhoto({
          id: targetUploadTrxId,
          body: { photo_data: base64 },
        }).unwrap();
        alert('Receipt slip photo uploaded successfully!');
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to upload receipt photo.');
      }
    };
    reader.readAsDataURL(file);
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

    try {
      const res = await collectPayment({
        id: collectingTrx.id,
        body: {
          paid_amount: inputNum,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: paymentNotes || undefined,
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

  // Helper to extract last modifier (admin / super admin)
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

  // =========================================================================
  // VIEW 1 DATA: Group transactions into created billing campaigns / demands
  // =========================================================================
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
      const memberIds = new Set(g.transactions.map((t) => t.member?.id).filter(Boolean));
      const totalMembersAssigned = memberIds.size || g.transactions.length;

      const totalDemandAmount = g.transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalCollectedAmount = g.transactions
        .filter((t) => t.status === 'paid')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const pendingTrx = g.transactions.filter((t) => t.status === 'pending');
      const pendingMembersCount = new Set(pendingTrx.map((t) => t.member?.id).filter(Boolean)).size;
      const paidMembersCount = totalMembersAssigned - pendingMembersCount;

      const progressPercent = totalDemandAmount > 0
        ? Math.min(100, Math.round((totalCollectedAmount / totalDemandAmount) * 100))
        : 100;
      const isFullyPaid = pendingMembersCount === 0 && totalMembersAssigned > 0;

      return {
        ...g,
        totalMembersAssigned,
        paidCount: paidMembersCount,
        pendingCount: pendingMembersCount,
        totalDemandAmount,
        totalCollectedAmount,
        progressPercent,
        isFullyPaid,
      };
    });

    return groupList.sort((a, b) => {
      const dateA = a.updated_at || a.created_at || a.dueDate || '';
      const dateB = b.updated_at || b.created_at || b.dueDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [allTransactions]);

  // Filtered Created Records for View 1
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

  // =========================================================================
  // VIEW 2 DATA: Member-wise calculation
  // =========================================================================
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
      if (memberStatusFilter === 'pending' && !m.hasPending) return false;
      if (memberStatusFilter === 'cleared' && m.hasPending) return false;

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

  // Calculation values for Partial/Full payment modal
  const origDue = collectingTrx ? Number(collectingTrx.amount) : 0;
  const numInputPaid = Number(paidAmountInput) || 0;
  const computedRemainingDue = Math.max(0, Math.round((origDue - numInputPaid) * 100) / 100);
  const isFullSettlement = computedRemainingDue === 0 && numInputPaid >= origDue;

  return (
    <div className="space-y-5">
      {/* Hidden File Input for Receipt Slip Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        accept="image/*,.pdf"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions & Billing</h1>
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

      {/* =========================================================================
          VIEW 1: TRANSACTIONS & CREATED RECORDS (WITH MEMBER PROGRESS LINES)
          ========================================================================= */}
      {activeTab === 'created' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
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

          {/* Filter Strip */}
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

          {/* Created Demands Table with Real-Time Progress Lines */}
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
                          {/* Col 1: Campaign Title and Fee */}
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
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span className="font-semibold text-emerald-800 font-mono">BDT {group.perMemberAmount.toLocaleString()} / member</span>
                                {group.dueDate && <span>• Due: {group.dueDate}</span>}
                              </div>
                            </div>
                          </TableCell>

                          {/* Col 2: Created / Updated By (Admin) */}
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

                          {/* Col 3: Real-Time Member Numbers & Progress Line */}
                          <TableCell>
                            <div className="space-y-1 max-w-xs">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 flex items-center gap-1">
                                  <Users className="h-3 w-3 text-slate-500 inline" />
                                  <span>{group.paidCount} / {group.totalMembersAssigned} Paid</span>
                                </span>
                                <span className={`font-bold text-[11px] ${
                                  group.isFullyPaid ? 'text-emerald-700' : 'text-amber-800'
                                }`}>
                                  {group.progressPercent}%
                                </span>
                              </div>

                              {/* Visual Progress Line Bar */}
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    group.isFullyPaid
                                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                                      : 'bg-gradient-to-r from-emerald-600 to-teal-500'
                                  }`}
                                  style={{ width: `${group.progressPercent}%` }}
                                />
                                {!group.isFullyPaid && (
                                  <div
                                    className="bg-amber-200 h-full transition-all duration-500"
                                    style={{ width: `${100 - group.progressPercent}%` }}
                                  />
                                )}
                              </div>

                              <div className="text-[10px] text-slate-500 flex justify-between">
                                <span>Collected: BDT {group.totalCollectedAmount.toLocaleString()}</span>
                                <span>Target: BDT {group.totalDemandAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Col 4: Status: Pending -> Complete when line is full */}
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

                          {/* Col 5: Updated Date */}
                          <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                            {displayDate}
                          </TableCell>

                          {/* Col 6: Expand Members Breakdown */}
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
                                    {group.paidCount} of {group.totalMembersAssigned} members cleared ({group.progressPercent}% collected)
                                  </span>
                                </div>

                                <div className="border border-slate-100 rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-slate-50">
                                      <TableRow className="text-xs">
                                        <TableHead>Member Name</TableHead>
                                        <TableHead>Member ID</TableHead>
                                        <TableHead>Transaction No</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Receipt Photo / Proof</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.transactions.map((trx) => {
                                        const isPending = trx.status === 'pending';

                                        return (
                                          <TableRow key={trx.id} className="text-xs">
                                            <TableCell className="font-bold text-slate-900">{trx.member?.name ?? '-'}</TableCell>
                                            <TableCell className="font-mono text-emerald-800 font-bold">{trx.member?.member_no ?? 'Unassigned'}</TableCell>
                                            <TableCell className="font-mono text-slate-500">{trx.transaction_no}</TableCell>
                                            <TableCell className="font-bold text-slate-900">BDT {Number(trx.amount).toLocaleString()}</TableCell>
                                            
                                            {/* Receipt Photo Column in Details */}
                                            <TableCell>
                                              {trx.receipt_photo ? (
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => viewReceiptPhoto(trx.receipt_photo!, `${trx.member?.name || 'Member'} - ${trx.month || trx.description || 'Receipt'}`, trx.receipt_photo_uploaded_at)}
                                                    className="group relative w-10 h-10 rounded-lg border border-emerald-300 overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs hover:border-emerald-600 transition-all"
                                                  >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                      src={trx.receipt_photo}
                                                      alt="Receipt Proof"
                                                      className="w-full h-full object-cover group-hover:scale-110 transition-all duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                      <ZoomIn className="h-4 w-4 text-white" />
                                                    </div>
                                                  </button>
                                                  <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                                      <FileImage className="h-3 w-3 text-emerald-700" /> Slip Attached
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() => triggerPhotoUpload(trx.id)}
                                                      className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer text-left"
                                                    >
                                                      Re-upload
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => triggerPhotoUpload(trx.id)}
                                                  className="h-7 text-[11px] text-slate-600 border-dashed border-slate-300 hover:border-emerald-500 hover:text-emerald-800 cursor-pointer"
                                                >
                                                  <Camera className="h-3 w-3 mr-1 text-slate-400" /> Attach Slip
                                                </Button>
                                              )}
                                            </TableCell>

                                            <TableCell>
                                              {isPending ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                                  <Clock className="h-3 w-3 text-amber-600" /> Pending Due
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                                                </span>
                                              )}
                                            </TableCell>
                                            
                                            <TableCell className="text-right">
                                              {isPending ? (
                                                <Button
                                                  size="sm"
                                                  onClick={() => openCollectPaymentModal(trx)}
                                                  className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs"
                                                >
                                                  <Wallet className="h-3 w-3 mr-1" /> Collect / Partial Pay
                                                </Button>
                                              ) : (
                                                <span className="text-[11px] text-slate-400 font-medium">Cleared</span>
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

                        {/* Progress Bar Line */}
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

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {pendingTransactions.map((pt) => (
                                <div
                                  key={pt.id}
                                  className="p-3.5 bg-white rounded-lg border border-amber-300 shadow-2xs flex flex-col justify-between gap-3"
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

                                    {/* Uploaded Receipt Photo in Pending Card */}
                                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                      {pt.receipt_photo ? (
                                        <button
                                          type="button"
                                          onClick={() => viewReceiptPhoto(pt.receipt_photo!, `${member.name} - ${pt.month || pt.description || 'Receipt Slip'}`, pt.receipt_photo_uploaded_at)}
                                          className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold hover:underline cursor-pointer bg-emerald-50 px-2 py-1 rounded"
                                        >
                                          <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> View Attached Slip
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => triggerPhotoUpload(pt.id)}
                                          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-700 cursor-pointer"
                                        >
                                          <Camera className="h-3 w-3" /> Upload Slip Photo
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {staff && (
                                    <Button
                                      size="sm"
                                      onClick={() => openCollectPaymentModal(pt)}
                                      className="w-full h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs"
                                    >
                                      <Wallet className="h-3.5 w-3.5 mr-1" /> Collect / Partial Pay
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
                            Completed / Paid Records & Receipt Photos ({paidTransactions.length})
                          </h4>

                          {paidTransactions.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No completed payments recorded yet.</p>
                          ) : (
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow className="text-xs">
                                    <TableHead>Transaction No</TableHead>
                                    <TableHead>Month / Description</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Receipt Photo / Slip</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Payment Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paidTransactions.map((paid) => (
                                    <TableRow key={paid.id} className="text-xs">
                                      <TableCell className="font-mono font-medium">{paid.transaction_no}</TableCell>
                                      <TableCell>{paid.month || paid.description || paid.type}</TableCell>
                                      <TableCell className="font-bold text-slate-900">BDT {Number(paid.amount).toLocaleString()}</TableCell>
                                      
                                      {/* Receipt Photo in History */}
                                      <TableCell>
                                        {paid.receipt_photo ? (
                                          <button
                                            type="button"
                                            onClick={() => viewReceiptPhoto(paid.receipt_photo!, `${member.name} - ${paid.month || paid.description || 'Receipt Slip'}`, paid.receipt_photo_uploaded_at)}
                                            className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                          >
                                            <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> View Slip
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => triggerPhotoUpload(paid.id)}
                                            className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                                          >
                                            <Camera className="h-3 w-3" /> Attach Slip
                                          </button>
                                        )}
                                      </TableCell>

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
          DIALOG: LIGHTBOX RECEIPT PHOTO VIEWER
          ========================================================================= */}
      <Dialog open={openPhotoModal} onOpenChange={setOpenPhotoModal}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <FileImage className="h-5 w-5 text-emerald-700" />
              <span>{photoModalTitle || 'Member Payment Receipt Photo'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="relative w-full min-h-[300px] max-h-[550px] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center shadow-inner border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoModalUrl}
                alt="Receipt Slip Proof"
                className="max-h-[520px] w-auto max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              {photoModalDate && <span>Uploaded at: {photoModalDate}</span>}
              <a
                href={photoModalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 ml-auto"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Image in New Tab
              </a>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" onClick={() => setOpenPhotoModal(false)} className="cursor-pointer bg-slate-900 text-white">
                Close Viewer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG: COLLECT PAYMENT (PARTIAL OR FULL WITH REMAINING DUE CALCULATION)
          ========================================================================= */}
      <Dialog open={openCollect} onOpenChange={setOpenCollect}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Wallet className="h-5 w-5 text-emerald-700" />
              Collect Payment & Settle Dues
            </DialogTitle>
          </DialogHeader>

          {collectingTrx && (
            <form onSubmit={onConfirmCollection} className="space-y-4 pt-2">
              {/* Member and Fee Information Card */}
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

                <div className="text-[11px] text-slate-600 border-t border-slate-200/80 pt-1.5 flex justify-between">
                  <span>Fee Item: <b>{collectingTrx.month || collectingTrx.description || collectingTrx.type}</b></span>
                  <span className="font-mono text-slate-400">{collectingTrx.transaction_no}</span>
                </div>
              </div>

              {/* Attached Slip Preview (if already uploaded by member) */}
              {collectingTrx.receipt_photo && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={collectingTrx.receipt_photo}
                      alt="Slip"
                      className="w-9 h-9 rounded object-cover border border-emerald-300"
                    />
                    <div>
                      <span className="font-bold text-emerald-900 block">Member Slip Attached</span>
                      <span className="text-[10px] text-emerald-700">Proof photo provided by member</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => viewReceiptPhoto(collectingTrx.receipt_photo!, `${collectingTrx.member?.name} - Proof Slip`, collectingTrx.receipt_photo_uploaded_at)}
                    className="h-7 text-xs border-emerald-300 text-emerald-800 cursor-pointer"
                  >
                    <Eye className="h-3 w-3 mr-1" /> View Photo
                  </Button>
                </div>
              )}

              {/* Paid Amount Input Field */}
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

              {/* Live Remaining Due Calculation Display */}
              <div className={`p-3.5 rounded-xl border transition-all ${
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

                  <span className={`font-mono text-sm ${
                    isFullSettlement ? 'text-emerald-800' : 'text-amber-900'
                  }`}>
                    {isFullSettlement ? 'BDT 0.00 Remaining Due' : `BDT ${computedRemainingDue.toLocaleString()} Remaining Due`}
                  </span>
                </div>

                {!isFullSettlement && computedRemainingDue > 0 && (
                  <p className="text-[11px] text-amber-800 mt-1.5">
                    A new pending due transaction of <b>BDT {computedRemainingDue.toLocaleString()}</b> will remain on the member&rsquo;s account until cleared.
                  </p>
                )}
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-900">Payment Method</Label>
                  <select
                    className="w-full border border-slate-300 rounded-md p-2 bg-white text-xs mt-1 font-medium cursor-pointer"
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
                  <Label className="text-xs font-bold text-slate-900">Payment Date</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="bg-white mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <Label className="text-xs text-slate-600">Payment Notes / Reference (Optional)</Label>
                <Input
                  placeholder="e.g. bKash TrxID: 9X29A..., Received at monthly meeting"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="bg-white mt-1 text-xs"
                />
              </div>

              {/* Receipt Generation Toggle */}
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

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenCollect(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCollecting}
                  className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {isCollecting ? 'Processing...' : `Confirm & Settle (BDT ${numInputPaid.toLocaleString()})`}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
