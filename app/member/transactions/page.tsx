'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useUploadReceiptPhotoMutation,
  useBatchUploadReceiptPhotoMutation,
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
import { useLanguage } from '@/components/language-context';
import { MEMBER_TRANSLATIONS } from '@/lib/member-translations';
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
  Users,
  ListChecks,
} from 'lucide-react';
import {
  formatDateTime,
  formatDate,
  formatMonthI18n,
  formatPaymentCategoryI18n,
  formatDemandTitleI18n,
  toBengaliDigits,
} from '@/lib/utils';

function extractReferenceId(trx?: any, receipt?: any): string {
  // If no slip is uploaded for this row, do not show any reference ID
  const hasSlip = Boolean(trx?.receipt_photo || receipt?.transaction?.receipt_photo || receipt?.receipt_photo);
  if (!hasSlip) {
    return '-';
  }

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

  return '-';
}

export default function MemberTransactionsPage() {
  const { lang, isBn } = useLanguage();
  const t = MEMBER_TRANSLATIONS[lang];
  const user = useAppSelector((s) => s.auth.user);
  const { data: trx, isLoading: loadingTrx } = useGetTransactionsQuery({ per_page: 500 }, { pollingInterval: 3000 });
  const { data: receiptsData } = useGetReceiptsQuery(undefined, { pollingInterval: 3000 });
  const [uploadReceiptPhoto, { isLoading: isUploadingProof }] = useUploadReceiptPhotoMutation();
  const [batchUploadReceiptPhoto, { isLoading: isBatchUploading }] = useBatchUploadReceiptPhotoMutation();

  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  // Batch selection state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchTrxIds, setSelectedBatchTrxIds] = useState<Set<number>>(new Set());
  const [openBatchUploadModal, setOpenBatchUploadModal] = useState(false);
  const [batchSlipPhotoData, setBatchSlipPhotoData] = useState<string | null>(null);
  const [batchTrxReference, setBatchTrxReference] = useState('');
  const [batchPaymentMethod, setBatchPaymentMethod] = useState<'mobile_banking' | 'bank' | 'cash' | 'other'>('mobile_banking');
  const [batchComment, setBatchComment] = useState('');
  const [batchPhotoError, setBatchPhotoError] = useState<string | null>(null);
  const [batchRefError, setBatchRefError] = useState<string | null>(null);
  const [openBatchConfirmModal, setOpenBatchConfirmModal] = useState(false);

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
    const rawTransactions: Transaction[] = trx?.data || [];

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
    const installmentAmount = Number(baseReceipt.amount || 0);

    const targetTrx = fallbackTrx || baseReceipt.transaction;
    const targetMonth = targetTrx?.month;
    const targetTrxNo = targetTrx?.transaction_no;

    const relatedTrxList = rawTransactions.filter((t) => {
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

    const isPartial = partialMeta?.isPartial !== undefined
      ? (partialMeta.isPartial && totalDue > 0)
      : (totalDue > 0 && totalAssigned > totalPaid);

    let previousReferences: (string | { ref: string; amount?: number; date?: string })[] = (partialMeta?.previousReferences as any) || [];
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
      previousReferences?: (string | { ref: string; amount?: number; date?: string })[];
      admin_note?: string;
      confirmed_by?: any;
    } = {
      ...baseReceipt,
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
        targetTrx?.updated_by,
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
    setTrxRefError(null);
    setPhotoError(null);
    setAmountError(null);
    setOpenUploadModal(true);
  };

  const [trxRefError, setTrxRefError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const handleSlipFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('Photo file size must be under 15MB.');
      return;
    }
    setPhotoError(null);
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

  const isTrxRefDuplicate = useMemo(() => {
    if (!slipTrxReference.trim() || !uploadingTrx) return null;
    const cleanRef = slipTrxReference.trim().toLowerCase();
    const allTrx: Transaction[] = trx?.data || [];
    const match = allTrx.find(
      (t) =>
        t.id !== uploadingTrx.id &&
        t.member_trx_reference &&
        t.member_trx_reference.trim().toLowerCase() === cleanRef &&
        t.status !== 'rejected'
    );
    return match || null;
  }, [slipTrxReference, uploadingTrx, trx]);

  const activeRefError = isTrxRefDuplicate
    ? `This Reference Code is already in use on an active payment (${isTrxRefDuplicate.month || isTrxRefDuplicate.transaction_no}). Reference IDs must be unique across all active payments unless the prior submission was rejected.`
    : trxRefError;

  const onSubmitMemberProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingTrx) return;
    setPhotoError(null);
    setAmountError(null);

    const numAmount = Number(slipPaidAmount);
    const maxAllowed = Number(uploadingTrx.amount);
    let hasError = false;

    if (!slipPhotoData) {
      setPhotoError('Please select or upload a payment receipt photo / screenshot slip before submitting.');
      hasError = true;
    }

    if (!slipTrxReference.trim()) {
      setTrxRefError('Please enter the Transaction Reference Code / TrxID (e.g. bKash TrxID, Bank Deposit Slip #).');
      hasError = true;
    } else if (activeRefError) {
      hasError = true;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Please enter a valid positive paid amount.');
      hasError = true;
    } else if (numAmount > maxAllowed) {
      setAmountError(`Paid amount cannot exceed the required remaining due of BDT ${maxAllowed.toLocaleString()}.`);
      hasError = true;
    }

    if (hasError) {
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
      setTrxRefError(null);
    } catch (err: any) {
      const serverErrMsg =
        err?.data?.errors?.trx_reference?.[0] ||
        (err?.data?.message && /trx_reference|reference|trxid/i.test(err.data.message) ? err.data.message : null);
      if (serverErrMsg) {
        setTrxRefError(serverErrMsg);
        setOpenConfirmModal(false);
      } else {
        alert(err?.data?.message || 'Failed to submit payment proof.');
      }
    }
  };
  // View Mode & Filtering States
  const [activeTab, setActiveTab] = useState<'created' | 'all'>('created');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [expandedMembers, setExpandedMembers] = useState<Record<string | number, boolean>>({});
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

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

  // Group member transactions by Member -> Demand Subscriptions -> Receipts Breakdown
  interface DemandSubscriptionItem {
    id?: number | string;
    key: string;
    title: string;
    category: string;
    month?: string;
    transaction_no?: string;
    dueDate: string;
    created_at: string;
    transactions: Transaction[];
    totalDemandAmount: number;
    totalPaidAmount: number;
    totalDueAmount: number;
    isFullyPaid: boolean;
    isPartial: boolean;
    hasReceiptSlip: boolean;
    status: 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected';
  }

  interface MemberGroup {
    memberId: string | number;
    memberName: string;
    memberNo: string;
    isPrimary: boolean;
    totalDemandAmount: number;
    totalPaidAmount: number;
    totalDueAmount: number;
    status: 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected';
    subscriptions: DemandSubscriptionItem[];
  }

  const memberDemandGroups = useMemo<MemberGroup[]>(() => {
    const rawTrx: Transaction[] = trx?.data || [];
    const membersMap: Record<string | number, {
      memberId: string | number;
      memberName: string;
      memberNo: string;
      isPrimary: boolean;
      transactions: Transaction[];
    }> = {};

    rawTrx.forEach((t) => {
      const mId = t.member?.id || (t as any).member_id || user?.id || 'primary';
      if (!membersMap[mId]) {
        const isPrimary = Number(mId) === Number(user?.id);
        const name = t.member?.name || (isPrimary ? user?.name : 'Member');
        const no = t.member?.member_no || (t.member as any)?.member_profile?.member_no || (isPrimary ? user?.member_profile?.member_no : '') || (mId !== 'primary' ? `ID: ${mId}` : 'ID: ACC-0000');
        membersMap[mId] = {
          memberId: mId,
          memberName: name || 'Member',
          memberNo: no,
          isPrimary,
          transactions: [],
        };
      }
      membersMap[mId].transactions.push(t);
    });

    if (Object.keys(membersMap).length === 0 && user) {
      membersMap[user.id] = {
        memberId: user.id,
        memberName: user.name,
        memberNo: user.member_profile?.member_no || '',
        isPrimary: true,
        transactions: [],
      };
    }

    return Object.values(membersMap).map((m) => {
      const subGroups: Record<string, {
        id?: number | string;
        key: string;
        title: string;
        category: string;
        month?: string;
        transaction_no?: string;
        dueDate: string;
        created_at: string;
        transactions: Transaction[];
      }> = {};

      m.transactions.forEach((t) => {
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

        if (!subGroups[groupKey]) {
          let title = t.description || 'Society Payment Demand';
          if (t.payment_category === 'monthly_payment' && t.month) {
            title = `Monthly Subscription (${t.month})`;
          } else if (t.month) {
            title = `Subscription for ${t.month}`;
          } else if (t.payment_category === 'one_time' && t.description) {
            title = t.description;
          }

          subGroups[groupKey] = {
            id: t.id,
            key: `${m.memberId}___${groupKey}`,
            title,
            category: t.payment_category || t.type,
            month: t.month,
            transaction_no: t.transaction_no || '',
            dueDate: (t.transaction_date || '').slice(0, 10),
            created_at: t.created_at || '',
            transactions: [],
          };
        }

        if (t.transaction_no && (!subGroups[groupKey].transaction_no || (!t.description?.toLowerCase().includes('remaining due')))) {
          subGroups[groupKey].transaction_no = t.transaction_no;
        }
        subGroups[groupKey].transactions.push(t);
      });

      const subscriptions = Object.values(subGroups).map((g) => {
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
        } else if (pendingTrx.some((t) => !!t.receipt_photo)) {
          status = 'received_slip';
        } else if (rejectedTrx.length > 0) {
          status = 'rejected';
        } else if (isPartial) {
          status = 'partial';
        } else if (pendingTrx.length > 0) {
          status = 'pending';
        }

        // Sort transactions in chronological order (oldest at 1st row, newest at last row)
        const sortedTransactions = [...g.transactions].sort((a, b) => {
          const dateA = a.created_at || a.updated_at || a.transaction_date || '';
          const dateB = b.created_at || b.updated_at || b.transaction_date || '';
          return dateA.localeCompare(dateB) || (Number(a.id) || 0) - (Number(b.id) || 0);
        });

        const totalDemand = totalPaid + totalDue;

        return {
          ...g,
          transactions: sortedTransactions,
          totalDemandAmount: totalDemand,
          totalPaidAmount: totalPaid,
          totalDueAmount: totalDue,
          isFullyPaid,
          isPartial,
          hasReceiptSlip,
          status,
        };
      }).sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));

      const memberTotalPaid = subscriptions.reduce((sum, s) => sum + s.totalPaidAmount, 0);
      const memberTotalDue = subscriptions.reduce((sum, s) => sum + s.totalDueAmount, 0);
      const memberTotalDemand = memberTotalPaid + memberTotalDue;

      const hasPending = subscriptions.some((s) => s.status === 'pending');
      const hasPartial = subscriptions.some((s) => s.status === 'partial');
      const hasSlip = subscriptions.some((s) => s.status === 'received_slip');
      const hasRej = subscriptions.some((s) => s.status === 'rejected');
      const allPaid = subscriptions.length > 0 && subscriptions.every((s) => s.status === 'paid');

      let memberStatus: 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected' = 'pending';
      if (allPaid) memberStatus = 'paid';
      else if (hasRej) memberStatus = 'rejected';
      else if (hasSlip) memberStatus = 'received_slip';
      else if (hasPartial) memberStatus = 'partial';
      else if (hasPending) memberStatus = 'pending';

      return {
        memberId: m.memberId,
        memberName: m.memberName,
        memberNo: m.memberNo,
        isPrimary: m.isPrimary,
        totalDemandAmount: memberTotalDemand,
        totalPaidAmount: memberTotalPaid,
        totalDueAmount: memberTotalDue,
        status: memberStatus,
        subscriptions,
      };
    }).sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  }, [trx, user]);

  // Keep member groups collapsed by default on initial load
  // (User can expand individual member accounts or subscriptions on demand)

  const toggleExpandMember = (mId: string | number) => {
    setExpandedMembers((prev) => ({ ...prev, [mId]: !prev[mId] }));
  };

  const toggleExpandSub = (subKey: string) => {
    setExpandedSubs((prev) => ({ ...prev, [subKey]: !prev[subKey] }));
  };

  const filteredMemberDemandGroups = useMemo(() => {
    return memberDemandGroups.map((m) => {
      const filteredSubs = m.subscriptions.filter((s) => {
        if (statusFilter === 'paid' && s.status !== 'paid') return false;
        if (statusFilter === 'partial' && s.status !== 'partial') return false;
        if (statusFilter === 'received_slip' && s.status !== 'received_slip') return false;
        if (statusFilter === 'pending' && s.status !== 'pending') return false;
        if (statusFilter === 'rejected' && s.status !== 'rejected') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = s.title.toLowerCase().includes(q);
          const monthMatch = s.month?.toLowerCase().includes(q);
          const catMatch = s.category.toLowerCase().includes(q);
          const memberMatch = m.memberName.toLowerCase().includes(q) || m.memberNo.toLowerCase().includes(q);
          const trxMatch = s.transactions.some((t) => (t.transaction_no || '').toLowerCase().includes(q) || (t.member_trx_reference || '').toLowerCase().includes(q));
          return titleMatch || monthMatch || catMatch || memberMatch || trxMatch;
        }

        return true;
      });

      return {
        ...m,
        subscriptions: filteredSubs,
      };
    }).filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const memberMatch = m.memberName.toLowerCase().includes(q) || m.memberNo.toLowerCase().includes(q);
        if (memberMatch) return true;
      }
      return m.subscriptions.length > 0;
    });
  }, [memberDemandGroups, statusFilter, searchQuery]);

  const totalDemandBatchesCount = useMemo(() => {
    return memberDemandGroups.reduce((acc, m) => acc + m.subscriptions.length, 0);
  }, [memberDemandGroups]);

  const filteredAllTransactions = useMemo(() => {
    return (trx?.data || []).filter((t) => {
      const isRemainingDue = (t.description && /remaining due/i.test(t.description)) || (t.description && /partial payment/i.test(t.description));
      const isPartialPaid = t.status === 'paid' && (
        (t.description && (/partial payment/i.test(t.description) || /remaining due/i.test(t.description))) ||
        (t.month && pendingMonthsSet.has(t.month.trim().toLowerCase()))
      );
      const isPartialPending = t.status === 'pending' && isRemainingDue;
      const isSlipPending = t.status === 'pending' && !!t.receipt_photo;
      const isPurePending = t.status === 'pending' && !t.receipt_photo;

      if (statusFilter === 'paid' && (!isPartialPaid && t.status !== 'paid')) return false;
      if (statusFilter === 'paid' && isPartialPaid) return false;
      if (statusFilter === 'partial' && !isPartialPaid && !isPartialPending) return false;
      if (statusFilter === 'received_slip' && !isSlipPending) return false;
      if (statusFilter === 'pending' && !isPurePending) return false;
      if (statusFilter === 'rejected' && t.status !== 'rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const trxMatch = (t.transaction_no || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const monthMatch = (t.month || '').toLowerCase().includes(q);
        const typeMatch = (t.type || '').toLowerCase().includes(q);
        const refMatch = (t.member_trx_reference || '').toLowerCase().includes(q);
        return trxMatch || descMatch || monthMatch || typeMatch || refMatch;
      }

      return true;
    });
  }, [trx, statusFilter, searchQuery, pendingMonthsSet]);

  // === BATCH SELECTION HELPERS ===
  const toggleBatchTrxId = (id: number) => {
    setSelectedBatchTrxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Collect all eligible pending transaction IDs across all groups for "select all"
  const allEligiblePendingTrxIds = useMemo(() => {
    const ids: number[] = [];
    filteredMemberDemandGroups.forEach((m) =>
      m.subscriptions.forEach((sub) => {
        if (sub.status !== 'paid') {
          const eligible = sub.transactions.find(
            (t) => t.status === 'pending' && !t.receipt_photo
          );
          if (eligible) ids.push(eligible.id);
        }
      })
    );
    return ids;
  }, [filteredMemberDemandGroups]);

  // Compute selected transactions info
  const selectedBatchTransactions = useMemo(() => {
    const allTrx: Transaction[] = trx?.data || [];
    return allTrx.filter((t) => selectedBatchTrxIds.has(t.id));
  }, [trx, selectedBatchTrxIds]);

  const selectedBatchTotal = selectedBatchTransactions.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  // Group selected batch transactions by member as parent for collapse/expand
  const selectedBatchMemberGroups = useMemo(() => {
    const groupMap = new Map<
      number | string,
      {
        memberId: number | string;
        memberName: string;
        memberNo?: string;
        transactions: Transaction[];
        totalAmount: number;
      }
    >();

    selectedBatchTransactions.forEach((t) => {
      const mId = t.member?.id || (t as any).member_id || 'unknown';
      const mName = t.member?.name || (mId !== 'unknown' ? `Member #${mId}` : 'Primary Member');
      const mNo = t.member?.member_no;

      if (!groupMap.has(mId)) {
        groupMap.set(mId, {
          memberId: mId,
          memberName: mName,
          memberNo: mNo,
          transactions: [],
          totalAmount: 0,
        });
      }

      const grp = groupMap.get(mId)!;
      grp.transactions.push(t);
      grp.totalAmount += Number(t.amount || 0);
    });

    return Array.from(groupMap.values());
  }, [selectedBatchTransactions]);

  const [expandedBatchMembers, setExpandedBatchMembers] = useState<Record<string | number, boolean>>({});

  const toggleExpandBatchMember = (memberId: string | number) => {
    setExpandedBatchMembers((prev) => {
      const current = prev[memberId] !== undefined ? prev[memberId] : true;
      return { ...prev, [memberId]: !current };
    });
  };

  const handleBatchSlipFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setBatchPhotoError('Photo file size must be under 15MB.');
      return;
    }
    setBatchPhotoError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 1400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setBatchSlipPhotoData(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setBatchSlipPhotoData(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const openBatchModal = () => {
    setBatchSlipPhotoData(null);
    setBatchTrxReference('');
    setBatchPaymentMethod('mobile_banking');
    setBatchComment('');
    setBatchPhotoError(null);
    setBatchRefError(null);
    setExpandedBatchMembers({});
    setOpenBatchUploadModal(true);
  };

  const onSubmitBatchProof = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!batchSlipPhotoData) {
      setBatchPhotoError('Please upload a payment receipt photo / screenshot slip.');
      hasError = true;
    }
    if (!batchTrxReference.trim()) {
      setBatchRefError('Please enter the Transaction Reference Code / TrxID.');
      hasError = true;
    }
    if (hasError) return;
    setOpenBatchConfirmModal(true);
  };

  const handleBatchConfirmedSubmit = async () => {
    try {
      await batchUploadReceiptPhoto({
        body: {
          transaction_ids: Array.from(selectedBatchTrxIds),
          photo_data: batchSlipPhotoData,
          trx_reference: batchTrxReference,
          payment_method: batchPaymentMethod,
          comment: batchComment || undefined,
          allocations: selectedBatchTransactions.map((t) => ({
            transaction_id: t.id,
            paid_amount: Number(t.amount),
          })),
        },
      }).unwrap();

      alert(`Payment proof submitted successfully for ${selectedBatchTrxIds.size} transactions!`);
      setOpenBatchConfirmModal(false);
      setOpenBatchUploadModal(false);
      setSelectedBatchTrxIds(new Set());
      setBatchMode(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit batch payment proof.');
      setOpenBatchConfirmModal(false);
    }
  };

  return (
    <>
      <div className={printReceipt ? 'space-y-5 w-full max-w-full overflow-x-hidden print:hidden' : 'space-y-5 w-full max-w-full overflow-x-hidden'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.transactions.pageTitle}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t.transactions.pageSub}
          </p>
        </div>
        {pendingTransactions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-amber-50 border border-amber-300 px-3.5 py-1.5 rounded-xl text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>{isBn ? 'মোট বকেয়া চাঁদা:' : 'Outstanding Dues:'} {isBn ? '৳ ' : 'BDT '}{pendingAmount.toLocaleString()} ({pendingTransactions.length} {isBn ? 'টি বাকি' : 'Pending'})</span>
            </div>
            {pendingTransactions.length >= 2 && (
              <Button
                size="sm"
                variant={batchMode ? 'default' : 'outline'}
                onClick={() => {
                  setBatchMode(!batchMode);
                  if (batchMode) setSelectedBatchTrxIds(new Set());
                }}
                className={`h-8 text-xs cursor-pointer gap-1.5 font-bold ${
                  batchMode
                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                    : 'border-purple-300 text-purple-800 hover:bg-purple-50'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                {batchMode ? (isBn ? 'নির্বাচন বাতিল' : 'Cancel Batch Select') : (isBn ? 'একাধিক চাঁদা একসাথে পরিশোধ' : 'Pay Multiple Dues Together')}
              </Button>
            )}
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
                {isBn ? 'চাঁদার বিবরণ' : 'Demand Batches Created'} ({totalDemandBatchesCount})
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
                {isBn ? 'সকল লেনদেন' : 'All Transactions History'} ({trx?.data?.length || 0})
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
                Receipt Sent
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
              placeholder="Search transaction, demand, member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 text-xs h-9"
            />
          </div>
        </div>

        {/* VIEW 1: CREATED DEMAND BATCHES (LEVEL 1: MEMBER LIST -> LEVEL 2: SUBSCRIPTIONS -> LEVEL 3: STATUS OF RECEIPTS) */}
        {activeTab === 'created' && (
          <div className="space-y-4">
            {/* Header info banner if merged accounts exist */}
            {memberDemandGroups.length > 1 && (
              <div className="bg-purple-50/90 border border-purple-200 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-purple-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-700 shrink-0" />
                  <span className="font-bold">Merged Account View:</span>
                  <span>{memberDemandGroups.length} Connected Member Accounts Available. Expand any member to manage individual dues and payments.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allOpen: Record<string | number, boolean> = {};
                      memberDemandGroups.forEach((m) => { allOpen[m.memberId] = true; });
                      setExpandedMembers(allOpen);
                    }}
                    className="text-[11px] font-bold text-purple-800 hover:underline cursor-pointer"
                  >
                    Expand All Members
                  </button>
                  <span className="text-purple-300">|</span>
                  <button
                    onClick={() => setExpandedMembers({})}
                    className="text-[11px] font-bold text-purple-800 hover:underline cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}

            {loadingTrx && (
              <Card className="border-slate-200 shadow-xs bg-white p-12 text-center text-slate-500">
                Loading member subscriptions &amp; billing records...
              </Card>
            )}

            {!loadingTrx && filteredMemberDemandGroups.length === 0 && (
              <Card className="border-slate-200 shadow-xs bg-white p-12 text-center text-slate-500">
                <ReceiptIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                No transaction billing records found matching your filters.
              </Card>
            )}

            {/* LEVEL 1: MEMBER LIST CARDS */}
            {!loadingTrx && filteredMemberDemandGroups.map((m) => {
              const isMemberExpanded = !!expandedMembers[m.memberId];

              return (
                <div
                  key={m.memberId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  {/* MEMBER CARD ACCORDION HEADER */}
                  <div
                    onClick={() => toggleExpandMember(m.memberId)}
                    className="p-4 sm:p-5 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                        {m.memberName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-base">{m.memberName}</span>
                          {m.memberNo && (
                            <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                              ID: {m.memberNo}
                            </span>
                          )}
                          {m.isPrimary ? (
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {isBn ? 'মূল অ্যাকাউন্ট' : 'Primary Account'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {isBn ? 'সংযুক্ত অ্যাকাউন্ট' : 'Linked Account'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{m.subscriptions.length} {isBn ? 'টি নির্ধারিত চাঁদা' : (m.subscriptions.length === 1 ? 'Subscription Demand' : 'Subscription Demands')}</span>
                          {m.status === 'paid' && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {isBn ? 'অনুমোদিত' : 'All Cleared'}</span>
                          )}
                          {m.status === 'partial' && (
                            <span className="text-purple-700 font-bold flex items-center gap-1"><Wallet className="h-3 w-3" /> {isBn ? 'আংশিক পরিশোধিত' : 'Partial Paid'}</span>
                          )}
                          {m.status === 'received_slip' && (
                            <span className="text-blue-700 font-bold flex items-center gap-1"><FileCheck className="h-3 w-3" /> {isBn ? 'স্লিপ জমা' : 'Receipt Sent'}</span>
                          )}
                          {m.status === 'rejected' && (
                            <span className="text-red-700 font-bold flex items-center gap-1"><XCircle className="h-3 w-3" /> {isBn ? 'প্রত্যাখ্যাত' : 'Slip Rejected'}</span>
                          )}
                          {m.status === 'pending' && (
                            <span className="text-amber-700 font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> {isBn ? 'বকেয়া' : 'Dues Pending'}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Financial Summary Badges & Toggle Button */}
                    <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-right">
                          <span className="text-[10px] text-emerald-700 block font-semibold">{isBn ? 'মোট পরিশোধিত' : 'Total Paid'}</span>
                          <span className="text-xs font-bold text-emerald-900">{isBn ? '৳ ' : 'BDT '}{m.totalPaidAmount.toLocaleString()}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-right">
                          <span className="text-[10px] text-amber-700 block font-semibold">{isBn ? 'মোট বকেয়া' : 'Total Due'}</span>
                          <span className="text-xs font-bold text-amber-900">{isBn ? '৳ ' : 'BDT '}{m.totalDueAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandMember(m.memberId);
                        }}
                        className="h-8 text-xs cursor-pointer border-slate-300 hover:bg-slate-100 shrink-0"
                      >
                        {isMemberExpanded ? (isBn ? 'চাঁদা লুকান' : 'Hide Subscriptions') : (isBn ? `চাঁদা দেখুন (${m.subscriptions.length})` : `View Subscriptions (${m.subscriptions.length})`)}
                        {isMemberExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                      </Button>
                    </div>
                  </div>

                  {/* LEVEL 2: EXPANDED SUBSCRIPTIONS LIST FOR THIS MEMBER */}
                  {isMemberExpanded && (
                    <div className="p-0 bg-white">
                      {/* DESKTOP TABLE VIEW (hidden md:block) - 100% Intact */}
                      <div className="hidden md:block">
                        <Table className="table-fixed w-full">
                          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                            <TableRow className="text-xs font-bold text-slate-700">
                              <TableHead className="w-[30%] px-4">Transaction / Demand Name</TableHead>
                              <TableHead className="w-[15%] px-3">Due Date</TableHead>
                              <TableHead className="w-[18%] px-3">Amount &amp; Payment</TableHead>
                              <TableHead className="w-[17%] px-3">Status</TableHead>
                              <TableHead className="w-[20%] px-4 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {m.subscriptions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                  No subscriptions found matching your filters for this member.
                                </TableCell>
                              </TableRow>
                            ) : (
                              m.subscriptions.map((sub) => {
                                const isSubExpanded = !!expandedSubs[sub.key];
                                const hasSlipUnderVerification = sub.transactions.some((t) => t.status === 'pending' && !!t.receipt_photo);
                                const pendingTrxToUpload = !hasSlipUnderVerification && sub.status !== 'paid'
                                  ? (sub.transactions.find((t) => t.status === 'rejected') || sub.transactions.find((t) => t.status === 'pending' && !t.receipt_photo))
                                  : null;

                                return (
                                  <React.Fragment key={sub.key}>
                                    {/* Subscription Row */}
                                    <TableRow className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
                                      <TableCell className="px-4 py-3.5">
                                        <div className="flex items-start gap-2.5">
                                          {batchMode && pendingTrxToUpload && (
                                            <label className="mt-1 cursor-pointer flex-shrink-0">
                                              <input
                                                type="checkbox"
                                                checked={selectedBatchTrxIds.has(pendingTrxToUpload.id)}
                                                onChange={() => toggleBatchTrxId(pendingTrxToUpload.id)}
                                                className="w-4 h-4 rounded border-purple-400 text-purple-700 focus:ring-purple-500 cursor-pointer accent-purple-700"
                                              />
                                            </label>
                                          )}
                                          <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm truncate" title={formatDemandTitleI18n(sub.title, sub.month, sub.category, isBn)}>
                                              {formatDemandTitleI18n(sub.title, sub.month, sub.category, isBn)}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                              <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                                                {formatPaymentCategoryI18n(sub.category, isBn)}
                                              </Badge>
                                              {sub.month && (
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                  {isBn ? 'মাস:' : 'Month:'} {formatMonthI18n(sub.month, isBn)}
                                                </span>
                                              )}
                                              {(sub.transaction_no || sub.id) && (
                                                <span className="text-[11px] font-mono text-slate-500">
                                                  #{sub.transaction_no || sub.id}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>

                                      <TableCell className="px-3 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                                        {sub.dueDate}
                                      </TableCell>

                                      <TableCell className="px-3 py-3.5">
                                        {sub.isPartial && sub.status !== 'paid' ? (
                                          <div className="flex flex-col">
                                            <span className="font-bold text-purple-950 text-sm">
                                              {isBn ? '৳ ' : 'BDT '}{Number(sub.totalPaidAmount).toLocaleString()}{' '}
                                              <span className="text-[10px] text-emerald-700 font-semibold">({isBn ? 'জমা' : 'Paid'})</span>
                                            </span>
                                            <span className="text-[11px] text-amber-800 font-medium">
                                              {isBn ? 'বকেয়া:' : 'Due:'} {isBn ? '৳ ' : 'BDT '}{Number(sub.totalDemandAmount).toLocaleString()}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="font-bold text-slate-900 text-sm">
                                            {isBn ? '৳ ' : 'BDT '}{Number(sub.totalDemandAmount || sub.totalPaidAmount).toLocaleString()}
                                          </span>
                                        )}
                                      </TableCell>

                                      <TableCell className="px-3 py-3.5">
                                        {sub.status === 'paid' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            {isBn ? 'পরিশোধিত' : 'Paid'}
                                          </span>
                                        ) : sub.status === 'partial' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
                                            <Wallet className="h-3.5 w-3.5 text-purple-600" />
                                            {isBn ? 'আংশিক পরিশোধিত' : 'Partially Paid'}
                                          </span>
                                        ) : sub.status === 'received_slip' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs">
                                            <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                                            {isBn ? 'স্লিপ জমা' : 'Receipt Sent'}
                                          </span>
                                        ) : sub.status === 'rejected' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300 shadow-2xs">
                                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                                            {isBn ? 'প্রত্যাখ্যাত' : 'Slip Rejected'}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                                            {isBn ? 'বকেয়া' : 'Due Pending'}
                                          </span>
                                        )}
                                      </TableCell>

                                      <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-2">
                                          {(() => {
                                            const paidTrx = sub.transactions.find((t) => t.status === 'paid');
                                            if (!paidTrx) return null;
                                            const linkedReceipt = receiptsData?.data?.find(
                                              (r: Receipt) => r.transaction?.id === paidTrx.id || (r as any).transaction_id === paidTrx.id
                                            );
                                            return (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePrint(linkedReceipt, paidTrx, {
                                                  isPartial: sub.isPartial,
                                                  totalPaidAmount: sub.totalPaidAmount,
                                                  totalDueAmount: sub.totalDueAmount ?? 0,
                                                  totalAssignedAmount: sub.totalDemandAmount,
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
                                              className="h-8 gap-1.5 text-xs cursor-pointer text-white shadow-2xs font-semibold bg-emerald-700 hover:bg-emerald-800"
                                              title="Upload payment slip"
                                            >
                                              <Camera className="h-3.5 w-3.5" />
                                              Upload Slip
                                            </Button>
                                          )}

                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => toggleExpandSub(sub.key)}
                                            className="h-8 text-xs cursor-pointer border-slate-200 hover:bg-slate-100"
                                          >
                                            {isSubExpanded ? 'Hide' : 'Details'}
                                            {isSubExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* LEVEL 3: STATUS OF RECEIPTS & PAYMENT SLIPS BREAKDOWN */}
                                    {isSubExpanded && (
                                      <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                        <TableCell colSpan={5} className="p-4">
                                          <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                                <ReceiptIcon className="h-4 w-4 text-emerald-700" />
                                                Payment &amp; Receipts Breakdown for {sub.title} ({m.memberName})
                                              </h4>
                                            </div>

                                            <div className="border border-slate-100 rounded-lg overflow-x-auto">
                                              <Table className="w-full">
                                                <TableHeader className="bg-slate-50">
                                                  <TableRow className="text-xs">
                                                    <TableHead className="text-center">Reference ID</TableHead>
                                                    <TableHead className="text-center">Date</TableHead>
                                                    <TableHead className="text-center">Amount</TableHead>
                                                    <TableHead className="text-center">Payment Slip / Proof</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                    <TableHead className="text-center">Action</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {sub.transactions.map((trx) => {
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
                                                    const isPartialSlip = isSlipPending && (
                                                      (trx.member_paid_amount && Number(trx.member_paid_amount) < Number(trx.amount)) ||
                                                      Boolean(trx.description && /partial/i.test(trx.description))
                                                    );
                                                    const isRemainingDueSlip = isSlipPending && Boolean(trx.description && /remaining due/i.test(trx.description));

                                                    const linkedReceipt = receiptsData?.data?.find(
                                                      (r: Receipt) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id
                                                    );
                                                    const refId = extractReferenceId(trx, linkedReceipt);

                                                    return (
                                                      <TableRow key={trx.id} className="text-xs">
                                                        <TableCell className="p-3 text-center align-middle font-mono">
                                                          {refId !== '-' ? (
                                                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs inline-block">
                                                              {refId}
                                                            </span>
                                                          ) : (
                                                            <span className="text-slate-400 font-normal">-</span>
                                                          )}
                                                        </TableCell>

                                                        <TableCell className="p-3 text-center align-middle text-slate-600">
                                                          {formatDate(trx.transaction_date)}
                                                        </TableCell>

                                                        <TableCell className="p-3 text-center align-middle font-bold text-slate-900">
                                                          BDT {Number(trx.amount).toLocaleString()}
                                                        </TableCell>

                                                        <TableCell className="p-3 text-center align-middle">
                                                          {trx.receipt_photo ? (
                                                            <div className="flex flex-col items-center gap-1">
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
                                                            </div>
                                                          ) : (
                                                            <span className="text-slate-400 font-normal italic">No slip</span>
                                                          )}
                                                        </TableCell>

                                                        <TableCell className="p-3 text-center align-middle">
                                                          {isPartialPaid ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
                                                              <Wallet className="h-3 w-3 text-purple-600" /> Partially Paid
                                                            </span>
                                                          ) : isSlipPending ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs">
                                                              <FileCheck className="h-3 w-3 text-blue-600" />
                                                              Receipt Sent
                                                            </span>
                                                          ) : isPartialPending ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                                              <Clock className="h-3 w-3 text-amber-600" /> Remaining Due
                                                            </span>
                                                          ) : isPaid ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Cleared
                                                            </span>
                                                          ) : isRejected ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300 shadow-2xs">
                                                              <XCircle className="h-3 w-3 text-red-600" /> Slip Rejected
                                                            </span>
                                                          ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                                              <Clock className="h-3.5 w-3.5 text-amber-600" /> Due Pending
                                                            </span>
                                                          )}
                                                        </TableCell>

                                                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">
                                                          <div className="flex items-center justify-center gap-1.5">
                                                            {isPaid && (
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handlePrint(linkedReceipt, trx, {
                                                                  isPartial: sub.isPartial,
                                                                  totalPaidAmount: sub.totalPaidAmount,
                                                                  totalDueAmount: sub.totalDueAmount ?? 0,
                                                                  totalAssignedAmount: sub.totalDemandAmount,
                                                                })}
                                                                className="h-7 px-2 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs flex items-center gap-1"
                                                                title="Print receipt"
                                                              >
                                                                <Printer className="h-3 w-3" /> Print
                                                              </Button>
                                                            )}
                                                            {isSlipPending && (
                                                              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                                Receipt Sent
                                                              </span>
                                                            )}
                                                            {isPurePending && !hasSlipUnderVerification && (
                                                              <Button
                                                                size="sm"
                                                                onClick={() => openMemberUploadModal(trx)}
                                                                className="h-7 px-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs flex items-center gap-1"
                                                                title="Upload payment slip"
                                                              >
                                                                <Camera className="h-3 w-3" />
                                                                Upload Slip
                                                              </Button>
                                                            )}
                                                            {!isPaid && !isSlipPending && (!isPurePending || hasSlipUnderVerification) && (
                                                              <span className="text-slate-400 text-xs">-</span>
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
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* MOBILE CARD VIEW (block md:hidden) - Optimized Touch Cards */}
                      <div className="block md:hidden p-3 space-y-3 bg-slate-50/60 border-t border-slate-200">
                        {m.subscriptions.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">
                            No subscriptions found matching your filters for this member.
                          </div>
                        ) : (
                          m.subscriptions.map((sub) => {
                            const isSubExpanded = !!expandedSubs[sub.key];
                            const hasSlipUnderVerification = sub.transactions.some((t) => t.status === 'pending' && !!t.receipt_photo);
                            const pendingTrxToUpload = !hasSlipUnderVerification && sub.status !== 'paid'
                              ? (sub.transactions.find((t) => t.status === 'rejected') || sub.transactions.find((t) => t.status === 'pending' && !t.receipt_photo))
                              : null;
                            const paidTrx = sub.transactions.find((t) => t.status === 'paid');
                            const linkedReceipt = receiptsData?.data?.find(
                              (r: Receipt) => r.transaction?.id === paidTrx?.id || (r as any).transaction_id === paidTrx?.id
                            );

                            return (
                              <div key={sub.key} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
                                {/* Mobile Card Header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    {batchMode && pendingTrxToUpload && (
                                      <label className="mt-0.5 cursor-pointer shrink-0">
                                        <input
                                          type="checkbox"
                                          checked={selectedBatchTrxIds.has(pendingTrxToUpload.id)}
                                          onChange={() => toggleBatchTrxId(pendingTrxToUpload.id)}
                                          className="w-4 h-4 rounded border-purple-400 text-purple-700 focus:ring-purple-500 accent-purple-700"
                                        />
                                      </label>
                                    )}
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-900 text-xs leading-snug truncate" title={formatDemandTitleI18n(sub.title, sub.month, sub.category, isBn)}>
                                        {formatDemandTitleI18n(sub.title, sub.month, sub.category, isBn)}
                                      </h4>
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <Badge variant="outline" className="capitalize text-[9px] font-semibold">
                                          {formatPaymentCategoryI18n(sub.category, isBn)}
                                        </Badge>
                                        {sub.month && (
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            {isBn ? 'মাস:' : 'Month:'} {formatMonthI18n(sub.month, isBn)}
                                          </span>
                                        )}
                                        {(sub.transaction_no || sub.id) && (
                                          <span className="text-[10px] font-mono text-slate-400">
                                            #{sub.transaction_no || sub.id}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {sub.status === 'paid' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {isBn ? 'পরিশোধিত' : 'Paid'}
                                      </span>
                                    ) : sub.status === 'partial' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                                        <Wallet className="h-3 w-3 text-purple-600" /> {isBn ? 'আংশিক' : 'Partial'}
                                      </span>
                                    ) : sub.status === 'received_slip' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                                        <FileCheck className="h-3 w-3 text-blue-600" /> {isBn ? 'স্লিপ জমা' : 'Slip Sent'}
                                      </span>
                                    ) : sub.status === 'rejected' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300">
                                        <XCircle className="h-3 w-3 text-red-600" /> {isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                        <Clock className="h-3 w-3 text-amber-600" /> {isBn ? 'বকেয়া' : 'Due'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Financials & Due Dates Row */}
                                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 border border-slate-100 p-2.5 rounded-lg text-xs">
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Due Date</span>
                                    <span className="text-slate-700 font-medium">{sub.dueDate || '-'}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Amount</span>
                                    <span className="font-bold text-slate-900">
                                      BDT {Number(sub.totalDemandAmount || sub.totalPaidAmount).toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Actions Row */}
                                <div className="flex items-center gap-2 pt-0.5">
                                  {pendingTrxToUpload && (
                                    <Button
                                      size="sm"
                                      onClick={() => openMemberUploadModal(pendingTrxToUpload)}
                                      className="flex-1 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer gap-1"
                                    >
                                      <Camera className="h-3.5 w-3.5" /> Upload Slip
                                    </Button>
                                  )}
                                  {paidTrx && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePrint(linkedReceipt, paidTrx, {
                                        isPartial: sub.isPartial,
                                        totalPaidAmount: sub.totalPaidAmount,
                                        totalDueAmount: sub.totalDueAmount ?? 0,
                                        totalAssignedAmount: sub.totalDemandAmount,
                                      })}
                                      className="flex-1 h-8 text-xs border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 cursor-pointer gap-1"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-emerald-700" /> Print
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleExpandSub(sub.key)}
                                    className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer"
                                  >
                                    {isSubExpanded ? 'Hide' : 'Details'}
                                    {isSubExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                                  </Button>
                                </div>

                                {/* Level 3 Breakdown when expanded */}
                                {isSubExpanded && (
                                  <div className="border-t border-slate-100 pt-2 space-y-2">
                                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                                      <ReceiptIcon className="h-3.5 w-3.5 text-emerald-700" /> Breakdown &amp; Proofs
                                    </div>
                                    <div className="space-y-1.5">
                                      {sub.transactions.map((trx) => {
                                        const trxLinkedReceipt = receiptsData?.data?.find(
                                          (r: Receipt) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id
                                        );
                                        const refId = extractReferenceId(trx, trxLinkedReceipt);
                                        const isTrxPaid = trx.status === 'paid';
                                        const isTrxPending = trx.status === 'pending' && !trx.receipt_photo;
                                        const isTrxSlip = trx.status === 'pending' && !!trx.receipt_photo;
                                        const isTrxRejected = trx.status === 'rejected';

                                        return (
                                          <div key={trx.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono font-bold text-[10px] text-slate-700">
                                                {refId !== '-' ? refId : `#${trx.transaction_no}`}
                                              </span>
                                              <span className="font-bold text-slate-900">
                                                BDT {Number(trx.amount).toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                              <span>{trx.transaction_date}</span>
                                              {isTrxPaid && <span className="text-emerald-700 font-bold">Cleared</span>}
                                              {isTrxSlip && <span className="text-blue-700 font-bold">Receipt Sent</span>}
                                              {isTrxPending && <span className="text-amber-700 font-bold">Due Pending</span>}
                                              {isTrxRejected && <span className="text-red-700 font-bold">Slip Rejected</span>}
                                            </div>
                                            {trx.receipt_photo && (
                                              <div className="pt-1">
                                                 <ReceiptSlipThumbnail
                                                   photoUrl={trx.receipt_photo}
                                                   title={`${trx.month || trx.description || 'Receipt'}`}
                                                   date={
                                                     isTrxRejected
                                                       ? `Rejected: ${formatDateTime(trx.updated_at || trx.created_at)}`
                                                       : trx.receipt_photo_uploaded_at
                                                       ? `Uploaded: ${formatDateTime(trx.receipt_photo_uploaded_at)}`
                                                       : undefined
                                                   }
                                                   isRejected={isTrxRejected}
                                                   isPartial={Boolean(trx.status === 'paid' && trx.description && /partial/i.test(trx.description))}
                                                   rejectionReason={trx.rejection_reason}
                                                   onClick={() => viewReceiptPhoto(
                                                     trx.receipt_photo!,
                                                     `${trx.month || trx.description || 'Receipt'}`,
                                                     isTrxRejected
                                                       ? (trx.updated_at || trx.created_at || trx.receipt_photo_uploaded_at)
                                                       : trx.receipt_photo_uploaded_at,
                                                     isTrxRejected,
                                                     trx.rejection_reason
                                                   )}
                                                 />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
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
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: ALL TRANSACTIONS HISTORY TABLE */}
        {activeTab === 'all' && (
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-0">
              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block">
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
                    {!loadingTrx && filteredAllTransactions.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No transactions found matching your filter criteria.</TableCell></TableRow>
                    )}
                    {filteredAllTransactions.map((t) => {
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
                          <TableCell className="px-3 py-3.5 font-mono text-xs truncate">
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs inline-block">
                              {t.transaction_no}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-3.5 text-xs text-slate-600 font-medium">
                            {isRejected ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-rose-700 text-xs flex items-center gap-1">
                                  <XCircle className="h-3 w-3 inline text-rose-600 shrink-0" />
                                  {formatDateTime(t.updated_at || t.created_at)}
                                </span>
                                <span className="text-[10px] text-slate-400">Due: {t.transaction_date}</span>
                              </div>
                            ) : t.status === 'paid' ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-emerald-800 text-xs">
                                  {formatDateTime(t.updated_at || t.transaction_date)}
                                </span>
                                <span className="text-[10px] text-slate-400">Due: {t.transaction_date}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">{t.transaction_date}</span>
                                {t.created_at && (
                                  <span className="text-[10px] text-slate-400">Issued: {formatDateTime(t.created_at)}</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-3.5">
                            <Badge variant="outline" className="capitalize text-xs font-semibold">
                              {formatPaymentCategoryI18n(t.payment_category || t.type, isBn)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-3.5 text-xs font-semibold text-slate-800">
                            {t.month ? formatMonthI18n(t.month, isBn) : (t.description || '-')}
                          </TableCell>
                          <TableCell className="px-3 py-3.5 font-bold text-slate-900 text-xs">
                            {isBn ? '৳ ' : 'BDT '}{Number(t.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="px-3 py-3.5">
                            {isPartialPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
                                <Wallet className="h-3.5 w-3.5 text-purple-600" /> {isBn ? 'আংশিক পরিশোধিত' : 'Partially Paid'}
                              </span>
                            ) : isPartialPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                <Clock className="h-3.5 w-3.5 text-amber-600" /> {isBn ? 'অবশিষ্ট বকেয়া' : 'Remaining Due'}
                              </span>
                            ) : t.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {isBn ? 'অনুমোদিত' : 'Cleared'}
                              </span>
                            ) : t.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300 shadow-2xs">
                                <XCircle className="h-3.5 w-3.5 text-red-600" /> {isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                <Clock className="h-3.5 w-3.5 text-amber-600" /> {isBn ? 'বকেয়া' : 'Due Pending'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-3.5">
                            {t.receipt_photo ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <ReceiptSlipThumbnail
                                    photoUrl={t.receipt_photo}
                                    title={`${t.month || t.description || 'Receipt'}`}
                                    date={t.receipt_photo_uploaded_at ? `Uploaded: ${formatDateTime(t.receipt_photo_uploaded_at)}` : undefined}
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
                                    <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-300">
                                      Receipt Sent
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
                            ) : t.status === 'paid' ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const linkedReceipt = receiptsData?.data?.find(
                                      (r: Receipt) => r.transaction?.id === t.id || (r as any).transaction_id === t.id
                                    );
                                    handlePrint(linkedReceipt, t);
                                  }}
                                  className="h-6 px-2 text-[11px] gap-1 border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                                  title="Print official receipt"
                                >
                                  <Printer className="h-3 w-3 text-emerald-700" /> Print Receipt
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No slip uploaded</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE VIEW (block md:hidden) - List Cards */}
              <div className="block md:hidden p-3 space-y-2.5 bg-slate-50/50">
                {loadingTrx && <p className="text-center py-6 text-xs text-slate-500">Loading transactions...</p>}
                {!loadingTrx && filteredAllTransactions.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-500">No transactions found.</p>
                )}
                {filteredAllTransactions.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {t.transaction_no}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        BDT {Number(t.amount).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                      <span className="font-semibold text-slate-800">{t.month || t.description || t.type}</span>
                      <span>{t.transaction_date}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div>
                        {t.status === 'paid' ? (
                          <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Cleared
                          </span>
                        ) : t.status === 'pending' && t.receipt_photo ? (
                          <span className="text-blue-700 font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Receipt Sent
                          </span>
                        ) : t.status === 'rejected' ? (
                          <span className="text-red-700 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Due Pending
                          </span>
                        )}
                      </div>

                      {t.status === 'pending' && !t.receipt_photo && (
                        <Button
                          size="sm"
                          onClick={() => openMemberUploadModal(t)}
                          className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                        >
                          <Camera className="h-3 w-3 mr-1" /> Upload Slip
                        </Button>
                      )}

                      {t.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const linkedReceipt = receiptsData?.data?.find(
                              (r: Receipt) => r.transaction?.id === t.id || (r as any).transaction_id === t.id
                            );
                            handlePrint(linkedReceipt, t);
                          }}
                          className="h-7 text-xs border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100"
                        >
                          <Printer className="h-3 w-3 mr-1 text-emerald-700" /> Print
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                        onClick={() => {
                          setSlipPhotoData(null);
                          setPhotoError(null);
                        }}
                        className="h-7 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 cursor-pointer"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    photoError
                      ? 'border-rose-400 bg-rose-50/50 hover:border-rose-500 ring-2 ring-rose-400/20'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40'
                  }`}>
                    <Camera className={`h-8 w-8 mb-2 ${photoError ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${photoError ? 'text-rose-900' : 'text-slate-800'}`}>Click to upload photo or take screenshot</span>
                    <span className={`text-[11px] mt-0.5 ${photoError ? 'text-rose-600' : 'text-slate-400'}`}>Supports JPG, PNG, WebP up to 15MB</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleSlipFilePicked} className="hidden" />
                  </label>
                )}
                {photoError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5 font-medium animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <strong>Photo Required:</strong> {photoError}
                    </div>
                  </div>
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
                     onClick={() => {
                       setSlipPaidAmount(String(uploadingTrx.amount));
                       setAmountError(null);
                     }}
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
                     setAmountError(null);
                     if (val !== '' && !isNaN(num) && num > maxDue) {
                       setSlipPaidAmount(String(maxDue));
                     } else {
                       setSlipPaidAmount(val);
                     }
                   }}
                   className={`bg-white font-mono font-bold text-base transition-colors ${
                     amountError || Number(slipPaidAmount) > Number(uploadingTrx.amount)
                       ? 'border-rose-500 ring-2 ring-rose-500/30 text-rose-900 bg-rose-50/50'
                       : 'border-emerald-600 focus:ring-emerald-700'
                   }`}
                   required
                 />
                 {amountError && (
                   <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5 font-medium animate-in fade-in duration-200">
                     <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                     <div>
                       <strong>Invalid Amount:</strong> {amountError}
                     </div>
                   </div>
                 )}
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
                    Transaction Reference Code / TrxID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 9J2KA87B, Deposit Slip #4912"
                    value={slipTrxReference}
                    onChange={(e) => {
                      setSlipTrxReference(e.target.value);
                      setTrxRefError(null);
                    }}
                    className={`bg-white mt-1 text-xs font-mono font-medium transition-colors ${
                      activeRefError
                        ? 'border-rose-500 ring-2 ring-rose-500/30 text-rose-900 bg-rose-50/50'
                        : ''
                    }`}
                    required
                  />
                  {activeRefError && (
                    <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5 font-medium animate-in fade-in duration-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        {isTrxRefDuplicate ? (
                          <><strong>Duplicate Reference Code:</strong> {activeRefError}</>
                        ) : (
                          <><strong>Reference Code Required:</strong> {activeRefError}</>
                        )}
                      </div>
                    </div>
                  )}
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
                <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                  <span className="text-slate-500">Rejection Date &amp; Time:</span>
                  <span className="font-bold text-rose-700">{formatDateTime(viewingRejectedTrx.updated_at || viewingRejectedTrx.created_at)}</span>
                </div>
                {viewingRejectedTrx.receipt_photo_uploaded_at && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Slip Uploaded At:</span>
                    <span>{formatDateTime(viewingRejectedTrx.receipt_photo_uploaded_at)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Billing Scheduled Due Date:</span>
                  <span>{viewingRejectedTrx.transaction_date}</span>
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

      {/* === BATCH FLOATING ACTION BAR === */}
      {batchMode && (
        <div className="fixed bottom-18 lg:bottom-4 left-0 right-0 z-50 print:hidden px-3">
          <div className="max-w-4xl mx-auto">
            <div className="bg-purple-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-purple-700/50 p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2.5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-purple-700/60 rounded-lg px-3 py-1.5">
                  <span className="font-bold text-lg">{selectedBatchTrxIds.size}</span>
                  <span className="text-purple-200 text-xs ml-1">selected</span>
                </div>
                <div className="text-sm">
                  <span className="text-purple-200">Total:</span>{' '}
                  <span className="font-bold text-white text-base">BDT {selectedBatchTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allEligiblePendingTrxIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (selectedBatchTrxIds.size === allEligiblePendingTrxIds.length) {
                        setSelectedBatchTrxIds(new Set());
                      } else {
                        setSelectedBatchTrxIds(new Set(allEligiblePendingTrxIds));
                      }
                    }}
                    className="h-8 text-xs text-purple-200 hover:text-white hover:bg-purple-800/60 cursor-pointer font-semibold"
                  >
                    {selectedBatchTrxIds.size === allEligiblePendingTrxIds.length ? 'Deselect All' : `Select All (${allEligiblePendingTrxIds.length})`}
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={selectedBatchTrxIds.size < 2}
                  onClick={openBatchModal}
                  className="h-9 gap-1.5 text-sm font-bold cursor-pointer bg-white text-purple-900 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Combined Slip ({selectedBatchTrxIds.size})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === BATCH UPLOAD MODAL === */}
      <Dialog open={openBatchUploadModal} onOpenChange={(open) => { if (!open) setOpenBatchUploadModal(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-purple-700" />
              Upload Combined Payment Slip
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Upload one payment slip for {selectedBatchTrxIds.size} selected dues. All will share the same receipt photo and TrxID.
            </p>
          </DialogHeader>

          {/* Selected dues summary table - Grouped by Member as Parent (Collapsible) */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 mt-2 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-700" />
                Selected Dues ({selectedBatchTransactions.length} {selectedBatchTransactions.length === 1 ? 'Due' : 'Dues'} &bull; {selectedBatchMemberGroups.length} {selectedBatchMemberGroups.length === 1 ? 'Member' : 'Members'})
              </h4>
              {selectedBatchMemberGroups.length > 1 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const allOpen: Record<string | number, boolean> = {};
                      selectedBatchMemberGroups.forEach((g) => { allOpen[g.memberId] = true; });
                      setExpandedBatchMembers(allOpen);
                    }}
                    className="text-purple-800 hover:text-purple-950 font-bold hover:underline cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-purple-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allClosed: Record<string | number, boolean> = {};
                      selectedBatchMemberGroups.forEach((g) => { allClosed[g.memberId] = false; });
                      setExpandedBatchMembers(allClosed);
                    }}
                    className="text-purple-800 hover:text-purple-950 font-bold hover:underline cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* Parent Member Accordions */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedBatchMemberGroups.map((g) => {
                const isExpanded = expandedBatchMembers[g.memberId] !== false; // expanded by default

                return (
                  <div
                    key={g.memberId}
                    className="bg-white rounded-xl border border-purple-200/90 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Member Parent Header */}
                    <div
                      onClick={() => toggleExpandBatchMember(g.memberId)}
                      className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-purple-50/60 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800 font-bold text-xs shrink-0">
                          {g.memberName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {g.memberName}
                            </span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                              {g.transactions.length} {g.transactions.length === 1 ? 'due' : 'dues'}
                            </span>
                          </div>
                          {g.memberNo && (
                            <span className="text-[10px] font-mono text-slate-500 truncate">ID: {g.memberNo}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-xs text-purple-900">
                          BDT {g.totalAmount.toLocaleString()}
                        </span>
                        <div className="w-5 h-5 rounded flex items-center justify-center text-purple-700">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Children Dues List */}
                    {isExpanded && (
                      <div className="border-t border-purple-100 bg-purple-50/30 divide-y divide-purple-100/60 px-3 py-1.5">
                        {g.transactions.map((t) => (
                          <div
                            key={t.id}
                            className="py-1.5 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <CalendarIcon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-slate-800 text-[11px] truncate">
                                  {t.month ? formatMonthI18n(t.month, isBn) : t.description || (isBn ? 'মাসিক চাঁদা' : 'Monthly Subscription')}
                                </span>
                                {t.transaction_no && (
                                  <span className="text-[9px] font-mono text-slate-400">
                                    #{t.transaction_no}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-purple-800 text-[11px] shrink-0">
                              BDT {Number(t.amount).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Combined Grand Total */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-200">
              <span className="text-xs font-bold text-purple-950">Combined Total</span>
              <span className="text-sm font-bold text-purple-950">BDT {selectedBatchTotal.toLocaleString()}</span>
            </div>
          </div>

          <form onSubmit={onSubmitBatchProof} className="space-y-4 mt-3">
            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label htmlFor="batch-slip-photo" className="text-xs font-bold text-slate-800">
                Payment Receipt Photo / Screenshot *
              </Label>
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-4 text-center hover:border-purple-500 transition-colors bg-purple-50/50">
                {batchSlipPhotoData ? (
                  <div className="relative inline-block">
                    <img
                      src={batchSlipPhotoData}
                      alt="Uploaded slip"
                      className="max-h-40 rounded-lg border border-purple-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setBatchSlipPhotoData(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="batch-slip-photo" className="cursor-pointer flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8 text-purple-400" />
                    <span className="text-xs text-purple-700 font-semibold">Click to upload slip photo</span>
                  </label>
                )}
                <input
                  id="batch-slip-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleBatchSlipFilePicked}
                  className="hidden"
                />
              </div>
              {batchPhotoError && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {batchPhotoError}
                </p>
              )}
            </div>

            {/* TrxID */}
            <div className="space-y-1.5">
              <Label htmlFor="batch-trx-ref" className="text-xs font-bold text-slate-800">
                Transaction Reference / TrxID *
              </Label>
              <Input
                id="batch-trx-ref"
                value={batchTrxReference}
                onChange={(e) => { setBatchTrxReference(e.target.value); setBatchRefError(null); }}
                placeholder="e.g. TXN1234567890"
                className="text-sm"
              />
              {batchRefError && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {batchRefError}
                </p>
              )}
              <p className="text-[10px] text-slate-400">
                This TrxID will be shared across all selected dues with index suffixes (e.g. TXN123 [1/3], TXN123 [2/3], etc.)
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Payment Method</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { value: 'mobile_banking', label: 'Mobile Banking', icon: CreditCard },
                  { value: 'bank', label: 'Bank Transfer', icon: Wallet },
                  { value: 'cash', label: 'Cash', icon: DollarSign },
                ] as const).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setBatchPaymentMethod(m.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      batchPaymentMethod === m.value
                        ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <m.icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <Label htmlFor="batch-comment" className="text-xs font-bold text-slate-800">
                Comment (Optional)
              </Label>
              <textarea
                id="batch-comment"
                value={batchComment}
                onChange={(e) => setBatchComment(e.target.value)}
                placeholder="e.g. Combined payment for family dues"
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenBatchUploadModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer gap-1.5"
              >
                <UploadCloud className="h-4 w-4" />
                Submit Combined Proof
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* === BATCH CONFIRM MODAL === */}
      <Dialog open={openBatchConfirmModal} onOpenChange={(open) => { if (!open) setOpenBatchConfirmModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center">Confirm Batch Submission</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3 py-4">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
              <p className="text-sm text-slate-700">
                You are about to submit <span className="font-bold text-purple-800">{selectedBatchTrxIds.size} payment dues</span> across <span className="font-bold text-purple-800">{selectedBatchMemberGroups.length} member account{selectedBatchMemberGroups.length > 1 ? 's' : ''}</span> with a combined total of{' '}
                <span className="font-bold text-purple-800">BDT {selectedBatchTotal.toLocaleString()}</span>.
              </p>
              <div className="text-xs text-slate-600 divide-y divide-purple-200/60 bg-white rounded-lg p-2.5 border border-purple-100">
                {selectedBatchMemberGroups.map((g) => (
                  <div key={g.memberId} className="flex items-center justify-between py-1 first:pt-0 last:pb-0">
                    <span className="font-medium">{g.memberName} ({g.transactions.length} due{g.transactions.length > 1 ? 's' : ''})</span>
                    <span className="font-bold text-purple-900">BDT {g.totalAmount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 pt-1">
                TrxID: <span className="font-mono font-bold text-slate-800">{batchTrxReference}</span>
              </p>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
              Once submitted, all selected dues will be locked for Admin verification. You cannot edit them until reviewed.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenBatchConfirmModal(false)}
              disabled={isBatchUploading}
              className="cursor-pointer"
            >
              Go Back
            </Button>
            <Button
              onClick={handleBatchConfirmedSubmit}
              disabled={isBatchUploading}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer gap-1.5"
            >
              {isBatchUploading ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
