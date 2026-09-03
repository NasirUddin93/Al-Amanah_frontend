'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { RoleGate } from '@/components/role-gate';
import {
  useGetReceiptsQuery,
  useGetTransactionsQuery,
  useUploadReceiptPhotoMutation,
} from '@/lib/api';
import { useAppSelector } from '@/store/hooks';
import type { Receipt, Transaction, User } from '@/types';
import { useLanguage } from '@/components/language-context';
import { MEMBER_TRANSLATIONS } from '@/lib/member-translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Users,
  Search,
  Printer,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  FileCheck,
  Eye,
  Camera,
  Receipt as ReceiptIcon,
  FileText,
  Upload,
} from 'lucide-react';
import { ReportPrintArea, type PrintSection, type PrintingReportData } from '@/components/report-print';
import { ReceiptPrintArea } from '@/components/receipt-print';
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import { formatMonthI18n, formatPaymentCategoryI18n, formatDemandTitleI18n, toBengaliDigits } from '@/lib/utils';

interface MemberReceiptItem {
  id: string | number;
  recordType: 'receipt' | 'rejected_slip' | 'pending_slip';
  receiptNo?: string;
  transactionNo: string;
  date: string;
  monthOrDesc: string;
  monthKey: string;
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

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  campaignTrxNo?: string;
  items: MemberReceiptItem[];
  totalCount: number;
  totalPaid: number;
  totalDue: number;
  netAmount: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  receivedSlipCount: number;
  pureDuePendingCount: number;
  rejectedCount: number;
}

interface MemberGroup {
  memberId: number | string;
  memberName: string;
  memberNo: string;
  isPrimary: boolean;
  memberRole?: string;
  memberEmail?: string;
  memberPhone?: string;
  items: MemberReceiptItem[];
  monthGroups: MonthGroup[];
  totalCount: number;
  totalPaid: number;
  totalDue: number;
  netAmount: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  receivedSlipCount: number;
  pureDuePendingCount: number;
  rejectedCount: number;
  currentState?: 'cleared' | 'partial' | 'received' | 'due' | 'rejected';
}

const MONTH_MAP: Record<string, { num: string; name: string }> = {
  january: { num: '01', name: 'January' },
  february: { num: '02', name: 'February' },
  march: { num: '03', name: 'March' },
  april: { num: '04', name: 'April' },
  may: { num: '05', name: 'May' },
  june: { num: '06', name: 'June' },
  july: { num: '07', name: 'July' },
  august: { num: '08', name: 'August' },
  september: { num: '09', name: 'September' },
  october: { num: '10', name: 'October' },
  november: { num: '11', name: 'November' },
  december: { num: '12', name: 'December' },
  jan: { num: '01', name: 'January' },
  feb: { num: '02', name: 'February' },
  mar: { num: '03', name: 'March' },
  apr: { num: '04', name: 'April' },
  jun: { num: '06', name: 'June' },
  jul: { num: '07', name: 'July' },
  aug: { num: '08', name: 'August' },
  sep: { num: '09', name: 'September' },
  oct: { num: '10', name: 'October' },
  nov: { num: '11', name: 'November' },
  dec: { num: '12', name: 'December' },
};

function parseMonthGrouping(descOrMonth: string, fallbackDate: string = '') {
  const match = (descOrMonth || '').match(
    /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})?/i
  );

  if (match) {
    const rawMonthName = match[1].toLowerCase();
    const entry = MONTH_MAP[rawMonthName] || { num: '01', name: match[1] };
    let yearNum = match[2];
    if (!yearNum && fallbackDate && fallbackDate.length >= 4) {
      yearNum = fallbackDate.slice(0, 4);
    }
    if (!yearNum) yearNum = '2026';
    return {
      key: `${yearNum}-${entry.num}`,
      label: `[${yearNum}-${entry.num}] ${entry.name} ${yearNum}`,
    };
  }

  if (fallbackDate && fallbackDate.length >= 7) {
    const yyyymm = fallbackDate.slice(0, 7);
    return {
      key: yyyymm,
      label: `[${yyyymm}] Billing Period (${yyyymm})`,
    };
  }

  return {
    key: '9999-OTHER',
    label: '[OTHER] Special Adjustments & Other Charges',
  };
}

function extractInputtedReference(trx?: any, receipt?: any): string {
  // If no slip has been uploaded for this row, show no reference ID ('-')
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

export default function MemberReportsPage() {
  return (
    <RoleGate roles={['member', 'admin', 'super_admin', 'accountant']}>
      <MemberReportHierarchyManagerContent />
    </RoleGate>
  );
}

function MemberReportHierarchyManagerContent() {
  const { lang, isBn } = useLanguage();
  const t = MEMBER_TRANSLATIONS[lang];
  const currentUser = useAppSelector((s) => s.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'mobile_banking'>('all');

  const [expandedMembers, setExpandedMembers] = useState<Record<string | number, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Printable Report State with Nested Member & Month Section structure
  const [printingReport, setPrintingReport] = useState<PrintingReportData | null>(null);

  // Single Receipt Print State
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  // Lightbox Modal State
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

  // Upload Slip Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedTrxForUpload, setSelectedTrxForUpload] = useState<Transaction | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [memberAmount, setMemberAmount] = useState<string>('');
  const [memberRef, setMemberRef] = useState<string>('');
  const [memberMethod, setMemberMethod] = useState<string>('bank');
  const [memberComment, setMemberComment] = useState<string>('');

  const [uploadReceiptPhoto, { isLoading: isUploadingProof }] = useUploadReceiptPhotoMutation();

  const { data: receiptsData } = useGetReceiptsQuery({ per_page: 3000 }, { pollingInterval: 5000 });
  const { data: transactionsData } = useGetTransactionsQuery({ per_page: 3000 }, { pollingInterval: 5000 });

  const rawReceipts: Receipt[] = useMemo(() => receiptsData?.data || [], [receiptsData]);
  const rawTransactions: Transaction[] = useMemo(() => transactionsData?.data || [], [transactionsData]);

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

  const openMemberUploadModal = (trx: Transaction) => {
    setSelectedTrxForUpload(trx);
    setMemberAmount(String(trx.amount || ''));
    setMemberRef('');
    setMemberMethod('bank');
    setMemberComment('');
    setUploadFile(null);
    setUploadPreview(null);
    setUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitMemberUpload = async () => {
    if (!selectedTrxForUpload || !uploadFile) return;

    try {
      const formData = new FormData();
      formData.append('receipt_photo', uploadFile);
      if (memberAmount) formData.append('member_paid_amount', memberAmount);
      if (memberRef) formData.append('member_trx_reference', memberRef);
      if (memberMethod) formData.append('member_payment_method', memberMethod);
      if (memberComment) formData.append('member_comment', memberComment);

      await uploadReceiptPhoto({ id: selectedTrxForUpload.id, body: formData }).unwrap();
      setUploadModalOpen(false);
      setSelectedTrxForUpload(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to upload payment slip.');
    }
  };

  const handlePrintSingleReceipt = (
    r?: Receipt | null,
    fallbackTrx?: Transaction | null,
    partialMeta?: {
      isPartial?: boolean;
      totalPaidAmount?: number;
      previousPaidAmount?: number;
      totalDueAmount?: number;
      totalAssignedAmount?: number;
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
        receipt_no: fallbackTrx.transaction_no,
        amount: fallbackTrx.amount,
        payment_method: fallbackTrx.member_payment_method || 'cash',
        receipt_date: fallbackTrx.transaction_date,
        transaction: fallbackTrx,
        member: fallbackTrx.member as any,
        created_at: fallbackTrx.created_at || fallbackTrx.transaction_date,
      };
    } else {
      return;
    }

    if (partialMeta) {
      (baseReceipt as any).isPartial = partialMeta.isPartial;
      (baseReceipt as any).totalPaidAmount = partialMeta.totalPaidAmount;
      (baseReceipt as any).previousPaidAmount = partialMeta.previousPaidAmount;
      (baseReceipt as any).totalDueAmount = partialMeta.totalDueAmount;
      (baseReceipt as any).totalAssignedAmount = partialMeta.totalAssignedAmount;
    }

    setPrintReceipt(baseReceipt);

    const afterPrintHandler = () => {
      setPrintReceipt(null);
      window.removeEventListener('afterprint', afterPrintHandler);
    };
    window.addEventListener('afterprint', afterPrintHandler);

    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Build the hierarchical report for connected members
  const hierarchyData: MemberGroup[] = useMemo(() => {
    const memberMap: Record<string, {
      memberId: number | string;
      memberName: string;
      memberNo: string;
      isPrimary: boolean;
      memberRole?: string;
      memberEmail?: string;
      memberPhone?: string;
      items: MemberReceiptItem[];
      totalPaid: number;
      totalDue: number;
      fullyPaidCount: number;
      partiallyPaidCount: number;
      receivedSlipCount: number;
      pureDuePendingCount: number;
      rejectedCount: number;
    }> = {};

    const paidMemberMonthSet = new Set<string>();
    const pendingMemberMonthSet = new Set<string>();

    rawTransactions.forEach((trx) => {
      const memId = trx.member?.id || (trx as any).member_id || currentUser?.id;
      if (!memId) return;

      if (trx.status === 'paid') {
        if (trx.month) paidMemberMonthSet.add(`${memId}___${trx.month.trim().toLowerCase()}`);
        if (trx.description) paidMemberMonthSet.add(`${memId}___${trx.description.trim().toLowerCase()}`);
      } else if (trx.status === 'pending') {
        if (trx.month) pendingMemberMonthSet.add(`${memId}___${trx.month.trim().toLowerCase()}`);
        if (trx.description) pendingMemberMonthSet.add(`${memId}___${trx.description.trim().toLowerCase()}`);
      }
    });

    // Ensure primary current user exists in map
    if (currentUser) {
      memberMap[currentUser.id] = {
        memberId: currentUser.id,
        memberName: currentUser.name || 'Primary Member',
        memberNo: currentUser.member_profile?.member_no || (currentUser as any)?.memberProfile?.member_no || `MEM-${currentUser.id}`,
        isPrimary: true,
        memberRole: 'Primary Member',
        memberEmail: currentUser.email || '-',
        memberPhone: currentUser.member_profile?.phone || '-',
        items: [],
        totalPaid: 0,
        totalDue: 0,
        fullyPaidCount: 0,
        partiallyPaidCount: 0,
        receivedSlipCount: 0,
        pureDuePendingCount: 0,
        rejectedCount: 0,
      };
    }

    rawTransactions.forEach((trx) => {
      const mId = trx.member?.id || (trx as any).member_id || currentUser?.id || 'primary';
      const isPrimary = Number(mId) === Number(currentUser?.id);
      const mName = trx.member?.name || (isPrimary ? currentUser?.name : 'Member');
      const mNo = trx.member?.member_no || (trx.member as any)?.member_profile?.member_no || (isPrimary ? currentUser?.member_profile?.member_no : '') || (mId !== 'primary' ? `MEM-${mId}` : 'MEM-0001');

      if (!memberMap[mId]) {
        memberMap[mId] = {
          memberId: mId,
          memberName: mName || 'Member',
          memberNo: mNo,
          isPrimary,
          memberRole: isPrimary ? 'Primary Member' : 'Linked Member',
          memberEmail: (trx.member as any)?.email || '-',
          memberPhone: (trx.member as any)?.member_profile?.phone || '-',
          items: [],
          totalPaid: 0,
          totalDue: 0,
          fullyPaidCount: 0,
          partiallyPaidCount: 0,
          receivedSlipCount: 0,
          pureDuePendingCount: 0,
          rejectedCount: 0,
        };
      }

      const linkedReceipt = rawReceipts.find((r) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id);
      const computedRef = extractInputtedReference(trx, linkedReceipt || trx.receipt);
      const monthGrouping = parseMonthGrouping(trx.month || trx.description || '', trx.transaction_date || '');

      if (trx.status === 'paid') {
        const isPartialPaid = Boolean(
          (trx.description && (/partial payment/i.test(trx.description) || /remaining due/i.test(trx.description))) ||
          (trx.month && pendingMemberMonthSet.has(`${mId}___${trx.month.trim().toLowerCase()}`))
        );

        memberMap[mId].items.push({
          id: `trx_paid_${trx.id}`,
          recordType: 'receipt',
          receiptNo: linkedReceipt?.receipt_no || trx.receipt?.receipt_no,
          transactionNo: trx.transaction_no,
          date: (trx.transaction_date || '').slice(0, 10),
          monthOrDesc: trx.month || trx.description || 'Payment Receipt',
          monthKey: monthGrouping.key,
          amount: Number(trx.amount || 0),
          paymentMethod: linkedReceipt?.payment_method || trx.member_payment_method || 'cash',
          receiptPhoto: trx.receipt_photo,
          receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
          memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
          memberTrxReference: trx.member_trx_reference,
          inputtedReference: computedRef,
          isRejected: false,
          isPartial: isPartialPaid,
          rejectionReason: null,
          status: 'paid',
          rawReceipt: linkedReceipt || trx.receipt,
          rawTransaction: trx,
        });

        memberMap[mId].totalPaid += Number(trx.amount || 0);
        if (isPartialPaid) {
          memberMap[mId].partiallyPaidCount += 1;
        } else {
          memberMap[mId].fullyPaidCount += 1;
        }
      } else if (trx.status === 'rejected') {
        memberMap[mId].items.push({
          id: `trx_rej_${trx.id}`,
          recordType: 'rejected_slip',
          receiptNo: undefined,
          transactionNo: trx.transaction_no,
          date: (trx.transaction_date || '').slice(0, 10),
          monthOrDesc: trx.month || trx.description || 'Declined Proof',
          monthKey: monthGrouping.key,
          amount: Number(trx.amount || 0),
          paymentMethod: trx.member_payment_method || 'mobile_banking',
          receiptPhoto: trx.receipt_photo,
          receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
          memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
          memberTrxReference: trx.member_trx_reference,
          inputtedReference: computedRef,
          isRejected: true,
          isPartial: false,
          rejectionReason: trx.rejection_reason || 'Payment proof slip declined by Admin.',
          status: 'rejected',
          rawTransaction: trx,
        });

        memberMap[mId].rejectedCount += 1;
      } else if (trx.status === 'pending') {
        const isRemainingDue = (trx.description && /remaining due/i.test(trx.description)) || (trx.description && /partial payment/i.test(trx.description));
        const isThisDuePartiallyPaid = Boolean(isRemainingDue || (trx.month && paidMemberMonthSet.has(`${mId}___${trx.month.trim().toLowerCase()}`)));

        if (isThisDuePartiallyPaid && memberMap[mId].partiallyPaidCount === 0) {
          memberMap[mId].partiallyPaidCount += 1;
        }

        if (trx.receipt_photo) {
          memberMap[mId].items.push({
            id: `trx_pend_${trx.id}`,
            recordType: 'pending_slip',
            receiptNo: undefined,
            transactionNo: trx.transaction_no,
            date: (trx.transaction_date || '').slice(0, 10),
            monthOrDesc: trx.month || trx.description || 'Submitted Proof Due',
            monthKey: monthGrouping.key,
            amount: Number(trx.amount || 0),
            paymentMethod: trx.member_payment_method || 'pending',
            receiptPhoto: trx.receipt_photo,
            receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
            memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
            memberTrxReference: trx.member_trx_reference,
            inputtedReference: computedRef,
            isRejected: false,
            isPartial: isThisDuePartiallyPaid,
            rejectionReason: null,
            status: isThisDuePartiallyPaid ? 'partial' : 'pending',
            rawTransaction: trx,
          });

          memberMap[mId].totalDue += Number(trx.amount || 0);
          memberMap[mId].receivedSlipCount += 1;
        } else {
          memberMap[mId].items.push({
            id: `trx_pend_${trx.id}`,
            recordType: 'pending_slip',
            receiptNo: undefined,
            transactionNo: trx.transaction_no,
            date: (trx.transaction_date || '').slice(0, 10),
            monthOrDesc: trx.month || trx.description || 'Assigned Due',
            monthKey: monthGrouping.key,
            amount: Number(trx.amount || 0),
            paymentMethod: trx.member_payment_method || 'pending',
            receiptPhoto: undefined,
            inputtedReference: computedRef,
            isRejected: false,
            isPartial: isThisDuePartiallyPaid,
            rejectionReason: null,
            status: isThisDuePartiallyPaid ? 'partial' : 'pending',
            rawTransaction: trx,
          });

          if (!isThisDuePartiallyPaid) {
            memberMap[mId].pureDuePendingCount += 1;
          }
          memberMap[mId].totalDue += Number(trx.amount || 0);
        }
      }
    });

    const result: MemberGroup[] = Object.values(memberMap).map((m) => {
      // Group items by Month
      const monthMap: Record<string, {
        monthKey: string;
        monthLabel: string;
        campaignTrxNo?: string;
        items: MemberReceiptItem[];
        totalPaid: number;
        totalDue: number;
        fullyPaidCount: number;
        partiallyPaidCount: number;
        receivedSlipCount: number;
        pureDuePendingCount: number;
        rejectedCount: number;
      }> = {};

      m.items.forEach((item) => {
        const grouping = parseMonthGrouping(item.monthOrDesc, item.date);
        const k = grouping.key;

        if (!monthMap[k]) {
          monthMap[k] = {
            monthKey: k,
            monthLabel: grouping.label,
            campaignTrxNo: item.transactionNo,
            items: [],
            totalPaid: 0,
            totalDue: 0,
            fullyPaidCount: 0,
            partiallyPaidCount: 0,
            receivedSlipCount: 0,
            pureDuePendingCount: 0,
            rejectedCount: 0,
          };
        }

        if (item.transactionNo && (!monthMap[k].campaignTrxNo || (!item.monthOrDesc.toLowerCase().includes('remaining due')))) {
          monthMap[k].campaignTrxNo = item.transactionNo;
        }

        monthMap[k].items.push(item);

        if (item.status === 'paid') {
          monthMap[k].totalPaid += item.amount;
          if (item.isPartial) {
            monthMap[k].partiallyPaidCount += 1;
          } else {
            monthMap[k].fullyPaidCount += 1;
          }
        } else if (item.status === 'rejected') {
          monthMap[k].rejectedCount += 1;
        } else if (item.status === 'pending' || item.status === 'partial') {
          monthMap[k].totalDue += item.amount;
          if (item.receiptPhoto) {
            monthMap[k].receivedSlipCount += 1;
          } else if (item.isPartial) {
            monthMap[k].partiallyPaidCount += 1;
          } else {
            monthMap[k].pureDuePendingCount += 1;
          }
        }
      });

      const monthGroups: MonthGroup[] = Object.values(monthMap)
        .map((mg) => ({
          ...mg,
          items: mg.items.sort((a, b) => b.date.localeCompare(a.date)),
          totalCount: mg.items.length,
          netAmount: mg.totalPaid,
        }))
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      let currentState: 'cleared' | 'partial' | 'received' | 'due' | 'rejected' = 'due';
      if (m.totalDue === 0 && m.totalPaid > 0) {
        currentState = 'cleared';
      } else if (m.partiallyPaidCount > 0) {
        currentState = 'partial';
      } else if (m.receivedSlipCount > 0) {
        currentState = 'received';
      } else if (m.pureDuePendingCount > 0) {
        currentState = 'due';
      } else if (m.rejectedCount > 0) {
        currentState = 'rejected';
      }

      return {
        memberId: m.memberId,
        memberName: m.memberName,
        memberNo: m.memberNo,
        isPrimary: m.isPrimary,
        memberRole: m.memberRole,
        memberEmail: m.memberEmail,
        memberPhone: m.memberPhone,
        items: m.items,
        monthGroups,
        totalCount: m.items.length,
        totalPaid: m.totalPaid,
        totalDue: m.totalDue,
        netAmount: m.totalPaid,
        fullyPaidCount: m.fullyPaidCount,
        partiallyPaidCount: m.partiallyPaidCount,
        receivedSlipCount: m.receivedSlipCount,
        pureDuePendingCount: m.pureDuePendingCount,
        rejectedCount: m.rejectedCount,
        currentState,
      };
    });

    return result.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  }, [currentUser, rawTransactions, rawReceipts]);

  // Overall Statistics Cards
  const stats = useMemo(() => {
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

    const demandMap: Record<string, Transaction[]> = {};
    rawTransactions.forEach((trx) => {
      const mId = trx.member?.id || (trx as any).member_id || currentUser?.id || `anon_${trx.id}`;
      const demandKey = `${mId}___${(trx.month || trx.description || 'general').trim().toLowerCase()}`;
      if (!demandMap[demandKey]) demandMap[demandKey] = [];
      demandMap[demandKey].push(trx);
    });

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
      const isPartial = paidList.length > 0 && pendingList.length > 0;
      const isSlipReceived = !isFullyPaid && pendingList.some((t) => !!t.receipt_photo);
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

    const totalDemandsCount = Object.keys(demandMap).length;
    const totalDueRemainingCount = Math.max(0, totalDemandsCount - clearedReceiptsCount);

    return {
      totalReceipts: rawReceipts.length,
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
      totalMembers: hierarchyData.length,
    };
  }, [rawReceipts, rawTransactions, hierarchyData, currentUser]);

  const filteredHierarchy = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return hierarchyData
      .map((member) => {
        const nameMatch = member.memberName.toLowerCase().includes(q);
        const idMatch = member.memberNo.toLowerCase().includes(q);
        const emailMatch = (member.memberEmail || '').toLowerCase().includes(q);
        const phoneMatch = (member.memberPhone || '').toLowerCase().includes(q);
        const memberInfoMatches = Boolean(q && (nameMatch || idMatch || emailMatch || phoneMatch));

        const filteredMonthGroups: MonthGroup[] = member.monthGroups
          .map((mg) => {
            const filteredItems = mg.items.filter((it) => {
              if (statusFilter === 'paid' && it.status !== 'paid') return false;
              if (statusFilter === 'partial' && it.status !== 'partial' && !it.isPartial) return false;
              if (statusFilter === 'received_slip' && (!it.receiptPhoto || it.status === 'paid' || it.status === 'rejected')) return false;
              if (statusFilter === 'pending' && (it.status === 'paid' || it.status === 'rejected')) return false;
              if (statusFilter === 'rejected' && it.status !== 'rejected' && !it.isRejected) return false;

              if (paymentMethodFilter !== 'all') {
                const method = (it.paymentMethod || 'cash').toLowerCase();
                if (paymentMethodFilter === 'cash' && !method.includes('cash')) return false;
                if (paymentMethodFilter === 'bank' && !method.includes('bank') && !method.includes('ibbl') && !method.includes('brac')) return false;
                if (paymentMethodFilter === 'mobile_banking' && !method.includes('bkash') && !method.includes('nagad') && !method.includes('rocket') && !method.includes('mobile')) return false;
              }

              if (q && !memberInfoMatches) {
                const trxMatch = it.transactionNo.toLowerCase().includes(q);
                const rctMatch = (it.receiptNo || '').toLowerCase().includes(q);
                const refMatch = (it.inputtedReference || '').toLowerCase().includes(q);
                const descMatch = it.monthOrDesc.toLowerCase().includes(q);
                if (!trxMatch && !rctMatch && !refMatch && !descMatch) return false;
              }

              return true;
            });

            if (filteredItems.length === 0) return null;

            const subPaid = filteredItems.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
            const subDue = filteredItems.filter((i) => i.status === 'pending' || i.status === 'partial').reduce((s, i) => s + i.amount, 0);

            return {
              ...mg,
              items: filteredItems,
              totalCount: filteredItems.length,
              totalPaid: subPaid,
              totalDue: subDue,
              netAmount: subPaid,
            };
          })
          .filter(Boolean) as MonthGroup[];

        if (filteredMonthGroups.length === 0 && !memberInfoMatches) return null;

        const totalFilteredPaid = filteredMonthGroups.reduce((acc, m) => acc + m.totalPaid, 0);
        const totalFilteredDue = filteredMonthGroups.reduce((acc, m) => acc + m.totalDue, 0);
        const totalFilteredCount = filteredMonthGroups.reduce((acc, m) => acc + m.totalCount, 0);

        return {
          ...member,
          monthGroups: filteredMonthGroups,
          totalPaid: totalFilteredPaid,
          totalDue: totalFilteredDue,
          totalCount: totalFilteredCount,
        };
      })
      .filter(Boolean) as MemberGroup[];
  }, [hierarchyData, searchQuery, statusFilter, paymentMethodFilter]);

  // Keep parent member cards expanded by default, while child month groups remain collapsed
  useEffect(() => {
    if (hierarchyData.length > 0) {
      setExpandedMembers((prev) => {
        const next = { ...prev };
        hierarchyData.forEach((m) => {
          if (next[m.memberId] === undefined) {
            next[m.memberId] = true;
          }
        });
        return next;
      });
    }
  }, [hierarchyData]);

  const toggleExpandMember = (mId: string | number) => {
    setExpandedMembers((prev) => ({ ...prev, [mId]: !prev[mId] }));
  };

  const toggleExpandMonth = (memberId: string | number, monthKey: string) => {
    const key = `${memberId}___${monthKey}`;
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const nextMembers: Record<string | number, boolean> = {};
    const nextMonths: Record<string, boolean> = {};
    hierarchyData.forEach((m) => {
      nextMembers[m.memberId] = true;
      m.monthGroups.forEach((mg) => {
        nextMonths[`${m.memberId}___${mg.monthKey}`] = true;
      });
    });
    setExpandedMembers(nextMembers);
    setExpandedMonths(nextMonths);
  };

  const collapseAll = () => {
    setExpandedMembers({});
    setExpandedMonths({});
  };

  // PRINT GENERATION HANDLERS
  const handlePrintAllConsolidated = () => {
    const sections: PrintSection[] = [];
    let grandTotalPaid = 0;
    let grandTotalDue = 0;
    let totalRecords = 0;
    let paidCount = 0;
    let dueCount = 0;
    let globalSerial = 1;

    filteredHierarchy.forEach((m) => {
      const monthSections: PrintSection['monthSections'] = [];
      let memberTotalAssessed = 0;
      let memberTotalPaid = 0;
      let memberTotalDue = 0;

      m.monthGroups.forEach((mg) => {
        let subTotalAssessed = 0;
        let subTotalPaid = 0;
        let subTotalDue = 0;

        const rows = mg.items.map((it) => {
          const isPaid = it.status === 'paid';
          const paidAmt = isPaid ? it.amount : 0;
          const dueAmt = !isPaid && it.status !== 'rejected' ? it.amount : 0;
          const assessedAmt = paidAmt + dueAmt;

          if (isPaid) paidCount++;
          else if (it.status !== 'rejected') dueCount++;

          subTotalAssessed += assessedAmt;
          subTotalPaid += paidAmt;
          subTotalDue += dueAmt;
          memberTotalAssessed += assessedAmt;
          memberTotalPaid += paidAmt;
          memberTotalDue += dueAmt;
          grandTotalPaid += paidAmt;
          grandTotalDue += dueAmt;
          totalRecords += 1;

          return {
            serial: globalSerial++,
            date: it.date || '-',
            description: it.monthOrDesc,
            transactionNo: it.transactionNo || it.receiptNo || '-',
            refNo: it.inputtedReference && it.inputtedReference !== '-' ? it.inputtedReference : '-',
            status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
            assessedAmount: assessedAmt,
            paidAmount: paidAmt,
            dueAmount: dueAmt,
            balanceAmount: dueAmt,
          };
        });

        if (rows.length > 0) {
          monthSections.push({
            monthTitle: mg.monthLabel,
            campaignTrxNo: mg.campaignTrxNo,
            subTotalAssessed,
            subTotalPaid,
            subTotalDue,
            rows,
          });
        }
      });

      if (monthSections.length > 0) {
        sections.push({
          memberId: m.memberId,
          memberName: m.memberName,
          memberNo: m.memberNo,
          memberRole: m.memberRole || (m.isPrimary ? 'Primary Member' : 'Linked Member'),
          memberHeader: `${m.memberName} (${m.memberNo})`,
          memberSubHeader: m.isPrimary ? 'Primary Account Statement' : 'Linked Account Statement',
          monthSections,
          memberTotalAssessed,
          memberTotalPaid,
          memberTotalDue,
        });
      }
    });

    const totalDemand = grandTotalPaid + grandTotalDue;
    const recoveryRate = totalDemand > 0 ? (grandTotalPaid / totalDemand) * 100 : 100;

    setPrintingReport({
      level: 1,
      title: 'MEMBER CONSOLIDATED FINANCIAL REPORT',
      subtitle: `${hierarchyData.length} Connected Member Accounts Statement & Dues Breakdown`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      meta: {
        'Total Connected Members': filteredHierarchy.length,
        'Total Transactions': totalRecords,
        'Total Settled Paid': `BDT ${grandTotalPaid.toLocaleString()}`,
        'Total Outstanding Due': `BDT ${grandTotalDue.toLocaleString()}`,
      },
      summaryStats: {
        totalDemand,
        totalPaid: grandTotalPaid,
        totalDue: grandTotalDue,
        recoveryRate,
        totalMembers: filteredHierarchy.length,
        totalRecords,
        paidCount,
        dueCount,
      },
      sections,
      grandTotalPaid,
      grandTotalDue,
      totalRecords,
    });

    const afterPrintHandler = () => {
      setPrintingReport(null);
      window.removeEventListener('afterprint', afterPrintHandler);
    };
    window.addEventListener('afterprint', afterPrintHandler);

    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintMember = (member: MemberGroup) => {
    let grandTotalPaid = 0;
    let grandTotalDue = 0;
    let totalRecords = 0;
    let paidCount = 0;
    let dueCount = 0;
    let globalSerial = 1;

    const monthSections: PrintSection['monthSections'] = [];
    let memberTotalAssessed = 0;

    member.monthGroups.forEach((mg) => {
      let subTotalAssessed = 0;
      let subTotalPaid = 0;
      let subTotalDue = 0;

      const rows = mg.items.map((it) => {
        const isPaid = it.status === 'paid';
        const paidAmt = isPaid ? it.amount : 0;
        const dueAmt = !isPaid && it.status !== 'rejected' ? it.amount : 0;
        const assessedAmt = paidAmt + dueAmt;

        if (isPaid) paidCount++;
        else if (it.status !== 'rejected') dueCount++;

        subTotalAssessed += assessedAmt;
        subTotalPaid += paidAmt;
        subTotalDue += dueAmt;
        memberTotalAssessed += assessedAmt;
        grandTotalPaid += paidAmt;
        grandTotalDue += dueAmt;
        totalRecords += 1;

        return {
          serial: globalSerial++,
          date: it.date || '-',
          description: it.monthOrDesc,
          transactionNo: it.transactionNo || it.receiptNo || '-',
          refNo: it.inputtedReference && it.inputtedReference !== '-' ? it.inputtedReference : '-',
          status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
          assessedAmount: assessedAmt,
          paidAmount: paidAmt,
          dueAmount: dueAmt,
          balanceAmount: dueAmt,
        };
      });

      if (rows.length > 0) {
        monthSections.push({
          monthTitle: mg.monthLabel,
          campaignTrxNo: mg.campaignTrxNo,
          subTotalAssessed,
          subTotalPaid,
          subTotalDue,
          rows,
        });
      }
    });

    const sections: PrintSection[] = [
      {
        memberId: member.memberId,
        memberName: member.memberName,
        memberNo: member.memberNo,
        memberRole: member.memberRole || (member.isPrimary ? 'Primary Member' : 'Linked Member'),
        memberHeader: `${member.memberName} (${member.memberNo})`,
        memberSubHeader: member.isPrimary ? 'Primary Account Statement' : 'Linked Account Statement',
        monthSections,
        memberTotalAssessed,
        memberTotalPaid: grandTotalPaid,
        memberTotalDue: grandTotalDue,
      },
    ];

    const totalDemand = grandTotalPaid + grandTotalDue;
    const recoveryRate = totalDemand > 0 ? (grandTotalPaid / totalDemand) * 100 : 100;

    setPrintingReport({
      level: 2,
      title: `STATEMENT OF ACCOUNT - ${member.memberName.toUpperCase()}`,
      subtitle: `Member ID: ${member.memberNo} | Status: ${member.currentState?.toUpperCase() || 'ACTIVE'}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      meta: {
        'Member Name': member.memberName,
        'Member ID': member.memberNo,
        'Cleared Paid': `BDT ${grandTotalPaid.toLocaleString()}`,
        'Remaining Due': `BDT ${grandTotalDue.toLocaleString()}`,
      },
      summaryStats: {
        totalDemand,
        totalPaid: grandTotalPaid,
        totalDue: grandTotalDue,
        recoveryRate,
        totalMembers: 1,
        totalRecords,
        paidCount,
        dueCount,
      },
      sections,
      grandTotalPaid,
      grandTotalDue,
      totalRecords,
    });

    const afterPrintHandler = () => {
      setPrintingReport(null);
      window.removeEventListener('afterprint', afterPrintHandler);
    };
    window.addEventListener('afterprint', afterPrintHandler);

    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintMonth = (member: MemberGroup, monthGroup: MonthGroup) => {
    let globalSerial = 1;
    let paidCount = 0;
    let dueCount = 0;

    const rows = monthGroup.items.map((it) => {
      const isPaid = it.status === 'paid';
      const paidAmt = isPaid ? it.amount : 0;
      const dueAmt = !isPaid && it.status !== 'rejected' ? it.amount : 0;
      const assessedAmt = paidAmt + dueAmt;

      if (isPaid) paidCount++;
      else if (it.status !== 'rejected') dueCount++;

      return {
        serial: globalSerial++,
        date: it.date || '-',
        description: it.monthOrDesc,
        transactionNo: it.transactionNo || it.receiptNo || '-',
        refNo: it.inputtedReference && it.inputtedReference !== '-' ? it.inputtedReference : '-',
        status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
        assessedAmount: assessedAmt,
        paidAmount: paidAmt,
        dueAmount: dueAmt,
        balanceAmount: dueAmt,
      };
    });

    const monthSections = [
      {
        monthTitle: monthGroup.monthLabel,
        campaignTrxNo: monthGroup.campaignTrxNo || monthGroup.items[0]?.transactionNo || '',
        subTotalPaid: monthGroup.totalPaid,
        subTotalDue: monthGroup.totalDue,
        subTotalAssessed: monthGroup.totalPaid + monthGroup.totalDue,
        rows,
      },
    ];

    const sections: PrintSection[] = [
      {
        memberId: member.memberId,
        memberName: member.memberName,
        memberNo: member.memberNo,
        memberRole: member.memberRole || (member.isPrimary ? 'Primary Member' : 'Linked Member'),
        memberHeader: `${member.memberName} (${member.memberNo})`,
        memberSubHeader: monthGroup.monthLabel,
        monthSections,
        memberTotalPaid: monthGroup.totalPaid,
        memberTotalDue: monthGroup.totalDue,
        memberTotalAssessed: monthGroup.totalPaid + monthGroup.totalDue,
      },
    ];

    const totalDemand = monthGroup.totalPaid + monthGroup.totalDue;
    const recoveryRate = totalDemand > 0 ? (monthGroup.totalPaid / totalDemand) * 100 : 100;

    setPrintingReport({
      level: 3,
      title: `PERIOD BREAKDOWN REPORT - ${monthGroup.monthLabel.toUpperCase()}`,
      subtitle: `Member: ${member.memberName} (${member.memberNo})`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      summaryStats: {
        totalDemand,
        totalPaid: monthGroup.totalPaid,
        totalDue: monthGroup.totalDue,
        recoveryRate,
        totalMembers: 1,
        totalRecords: monthGroup.totalCount,
        paidCount,
        dueCount,
      },
      sections,
      grandTotalPaid: monthGroup.totalPaid,
      grandTotalDue: monthGroup.totalDue,
      totalRecords: monthGroup.totalCount,
    });

    const afterPrintHandler = () => {
      setPrintingReport(null);
      window.removeEventListener('afterprint', afterPrintHandler);
    };
    window.addEventListener('afterprint', afterPrintHandler);

    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16 print:hidden">
      {/* HEADER WITH PRINT ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-emerald-700" />
            {t.reports.pageTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t.reports.pageSub}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handlePrintAllConsolidated}
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 h-10 px-4 text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            {isBn ? 'সম্পূর্ণ প্রতিবেদন প্রিন্ট' : 'Print Complete Report'}
          </Button>
        </div>
      </div>

      {/* MERGED ACCOUNT BANNER */}
      {hierarchyData.length > 1 && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-purple-900 font-medium">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-700 shrink-0" />
            <span>
              <strong>{isBn ? 'যৌথ অ্যাকাউন্ট ভিউ:' : 'Merged Account View:'}</strong>{' '}
              {isBn
                ? `${hierarchyData.length} টি সংযুক্ত সদস্য অ্যাকাউন্ট উপলব্ধ। স্বতন্ত্র চাঁদা ও লেনদেন বিবরণী দেখতে যেকোনো সদস্যকে প্রসারিত করুন।`
                : `${hierarchyData.length} Connected Member Accounts Available. Expand any member to inspect individual dues and payment statements.`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-semibold">
            <button
              onClick={expandAll}
              className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
            >
              {isBn ? 'সবগুলো প্রসারিত করুন' : 'Expand All'}
            </button>
            <span className="text-purple-300">|</span>
            <button
              onClick={collapseAll}
              className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
            >
              {isBn ? 'সংকুচিত করুন' : 'Collapse All'}
            </button>
          </div>
        </div>
      )}

      {/* STATISTICS CARDS (SYNCHRONIZED WITH TRANSACTIONS & BILLING) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Cleared / Total Paid */}
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">{isBn ? 'মোট পরিশোধিত' : 'Total Paid'}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-2 font-mono">
              {isBn ? '৳ ' : 'BDT '}{stats.totalClearedAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              {stats.currentClearedCount} {isBn ? 'টি অনুমোদিত চাঁদা' : 'fully cleared demands'}
            </div>
          </CardContent>
        </Card>

        {/* Partially Paid */}
        <Card className="border-purple-200/80 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">{isBn ? 'আংশিক পরিশোধিত' : 'Partially Paid'}</span>
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-950 mt-2 font-mono">
              {isBn ? '৳ ' : 'BDT '}{stats.partialCollectedAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-purple-700 font-medium mt-1">
              {stats.currentPartialCount} {isBn ? 'টি আংশিক কিস্তি' : 'partial installments'}
            </div>
          </CardContent>
        </Card>

        {/* Received Slips (Under Review) */}
        <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">{isBn ? 'যাচাইাধীন জমার স্লিপ' : 'Slips Under Review'}</span>
              <FileCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 mt-2 font-mono">
              {isBn ? '৳ ' : 'BDT '}{stats.receivedSlipsAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-blue-700 font-medium mt-1">
              {stats.currentReceivedCount} {isBn ? 'টি পর্যালোচনার অপেক্ষায়' : 'slips awaiting review'}
            </div>
          </CardContent>
        </Card>

        {/* Total Outstanding Dues */}
        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">{isBn ? 'মোট বকেয়া চাঁদা' : 'Total Outstanding'}</span>
              <Clock className="h-4 w-4 text-amber-700" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 mt-2 font-mono">
              {isBn ? '৳ ' : 'BDT '}{stats.duePendingAmount.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-800 font-medium mt-1">
              {stats.currentDueCount} {isBn ? 'টি প্রদেয় বকেয়া' : 'pending payment dues'}
            </div>
          </CardContent>
        </Card>

        {/* Rejected Slips */}
        <Card className="border-red-200/80 bg-gradient-to-br from-red-50/80 via-white to-red-50/30 shadow-2xs col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wide">{isBn ? 'প্রত্যাখ্যাত স্লিপ' : 'Slips Declined'}</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-red-950 mt-2 font-mono">
              {stats.currentRejectedCount}
            </div>
            <div className="text-[11px] text-red-700 font-medium mt-1">
              {isBn ? 'পুনরায় আপলোড প্রয়োজন' : 'Requires slip re-upload'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              {(
                [
                  { id: 'all', label: isBn ? 'সকল রেকর্ড' : 'All Records' },
                  { id: 'paid', label: isBn ? 'অনুমোদিত' : 'Cleared' },
                  { id: 'partial', label: isBn ? 'আংশিক' : 'Partial' },
                  { id: 'received_slip', label: isBn ? 'স্লিপ জমা' : 'Receipt Sent' },
                  { id: 'pending', label: isBn ? 'বকেয়া' : 'Due Pending' },
                  { id: 'rejected', label: 'Rejected' },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={statusFilter === tab.id ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-8 text-xs cursor-pointer transition-all ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="search"
                placeholder="Search transaction, month, ref, member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 pl-8.5 pr-3 text-xs bg-slate-50/80 border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HIERARCHICAL ACCORDION TREE: MEMBER -> MONTHS -> RECORDS */}
      <div className="space-y-4">
        {filteredHierarchy.length === 0 ? (
          <Card className="border-slate-200 bg-white p-12 text-center text-slate-500">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No report records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
          </Card>
        ) : (
          filteredHierarchy.map((member) => {
            const isMemberOpen = !!expandedMembers[member.memberId];

            return (
              <div
                key={member.memberId}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* LEVEL 1: MEMBER ACCORDION HEADER */}
                <div
                  onClick={() => toggleExpandMember(member.memberId)}
                  className="p-4 sm:p-5 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                      {member.memberName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">{member.memberName}</span>
                        {member.memberNo && (
                          <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                            ID: {member.memberNo}
                          </span>
                        )}
                        {member.isPrimary ? (
                          <span className="text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Primary Account
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Linked Account
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                        {member.memberEmail && member.memberEmail !== '-' && <span>Email: {member.memberEmail}</span>}
                        {member.memberPhone && member.memberPhone !== '-' && <span>Phone: {member.memberPhone}</span>}
                        <span>• {member.monthGroups.length} Billing Periods</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
                    {/* Status Pill */}
                    {member.currentState === 'cleared' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs py-1 px-3">
                        <CheckCircle2 className="h-3.5 w-3.5" /> All Cleared
                      </Badge>
                    ) : member.currentState === 'partial' ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 gap-1 text-xs py-1 px-3">
                        <Wallet className="h-3.5 w-3.5" /> Partially Paid
                      </Badge>
                    ) : member.currentState === 'received' ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 gap-1 text-xs py-1 px-3">
                        <FileCheck className="h-3.5 w-3.5" /> Receipt Sent
                      </Badge>
                    ) : member.currentState === 'rejected' ? (
                      <Badge className="bg-red-100 text-red-800 border-red-300 gap-1 text-xs py-1 px-3">
                        <XCircle className="h-3.5 w-3.5" /> Slip Rejected
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 text-xs py-1 px-3">
                        <Clock className="h-3.5 w-3.5" /> Dues Pending
                      </Badge>
                    )}

                    {/* Financial Summary */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
                        Paid: BDT {member.totalPaid.toLocaleString()}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-950 font-bold border border-amber-200">
                        Due: BDT {member.totalDue.toLocaleString()}
                      </span>
                    </div>

                    {/* Print Member Report */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintMember(member);
                      }}
                      className="h-8 gap-1 text-xs font-bold border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer shadow-2xs"
                      title="Print individual member statement"
                    >
                      <Printer className="h-3.5 w-3.5" /> Statement
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-slate-500 hover:text-slate-800"
                    >
                      {isMemberOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* LEVEL 2: EXPANDED MONTH BILLING GROUPS FOR THIS MEMBER */}
                {isMemberOpen && (
                  <div className="p-3 sm:p-5 bg-slate-50/50 space-y-3.5">
                    {member.monthGroups.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200">
                        No billing month records found matching the active filters for this member.
                      </div>
                    ) : (
                      member.monthGroups.map((monthGroup) => {
                        const monthKeyString = `${member.memberId}___${monthGroup.monthKey}`;
                        const isMonthOpen = !!expandedMonths[monthKeyString];

                        return (
                          <div
                            key={monthGroup.monthKey}
                            className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                          >
                            {/* MONTH ACCORDION HEADER */}
                            <div
                              onClick={() => toggleExpandMonth(member.memberId, monthGroup.monthKey)}
                              className="p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-800 font-bold">
                                  <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {isBn ? formatMonthI18n(monthGroup.monthLabel, true) : monthGroup.monthLabel}
                                    </span>
                                    {monthGroup.campaignTrxNo && (
                                      <span className="font-mono text-[11px] text-slate-500">
                                        #{monthGroup.campaignTrxNo}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                                <div className="flex items-center gap-2 text-xs font-mono">
                                  <span className="text-emerald-800 font-bold">
                                    {isBn ? 'জমা:' : 'Paid:'} {isBn ? '৳ ' : 'BDT '}{monthGroup.totalPaid.toLocaleString()}
                                  </span>
                                  {monthGroup.totalDue > 0 && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-amber-800 font-bold">
                                        {isBn ? 'বকেয়া:' : 'Due:'} {isBn ? '৳ ' : 'BDT '}{monthGroup.totalDue.toLocaleString()}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                    handlePrintMonth(member, monthGroup);
                                  }}
                                  className="h-7 px-2.5 text-xs font-semibold border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer shadow-2xs gap-1"
                                  title="Print period breakdown report"
                                >
                                  <Printer className="h-3 w-3" /> Print Month
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-500"
                                >
                                  {isMonthOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>

                            {/* LEVEL 3: RECORDS TABLE FOR THIS MONTH */}
                            {isMonthOpen && (
                              <div className="overflow-x-auto">
                                <Table className="w-full">
                                  <TableHeader className="bg-slate-50/50">
                                    <TableRow className="text-xs">
                                      <TableHead className="text-center w-[16%]">{isBn ? 'রেফারেন্স আইডি' : 'Reference ID'}</TableHead>
                                      <TableHead className="text-center w-[14%]">{isBn ? 'তারিখ' : 'Date'}</TableHead>
                                      <TableHead className="text-center w-[22%]">{isBn ? 'লেনদেন / চাঁদা' : 'Transaction / Demand'}</TableHead>
                                      <TableHead className="text-center w-[16%]">{isBn ? 'পেমেন্ট স্লিপ' : 'Payment Slip / Proof'}</TableHead>
                                      <TableHead className="text-center w-[14%]">{isBn ? 'পরিমাণ' : 'Amount'}</TableHead>
                                      <TableHead className="text-center w-[18%]">{isBn ? 'অবস্থা ও ব্যবস্থা' : 'Status & Actions'}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {monthGroup.items.map((item) => {
                                      const isPaid = item.status === 'paid';
                                      const isRejected = item.status === 'rejected' || item.isRejected;
                                      const isPartial = item.status === 'partial' || item.isPartial;
                                      const isSlipPending = !isPaid && !isRejected && Boolean(item.receiptPhoto);
                                      const isPurePending = !isPaid && !isRejected && !item.receiptPhoto;
                                      const isPartialSlip = isSlipPending && isPartial;
                                      const isRemainingDueSlip = isSlipPending && Boolean(item.monthOrDesc && /remaining due/i.test(item.monthOrDesc));

                                      return (
                                        <TableRow key={item.id} className="text-xs hover:bg-slate-50/80 transition-colors">
                                          <TableCell className="p-3 text-center align-middle font-mono">
                                            {item.inputtedReference && item.inputtedReference !== '-' ? (
                                              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs inline-block">
                                                {item.inputtedReference}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 font-normal">-</span>
                                            )}
                                          </TableCell>

                                          <TableCell className="p-3 text-center align-middle text-slate-600 whitespace-nowrap">
                                            {item.date}
                                          </TableCell>

                                          <TableCell className="p-3 text-center align-middle">
                                            <div className="flex flex-col items-center">
                                              <span className="font-bold text-slate-900 truncate max-w-[200px]" title={item.monthOrDesc}>
                                                {formatMonthI18n(item.monthOrDesc, isBn)}
                                              </span>
                                              <span className="font-mono text-[10px] text-slate-500">
                                                #{item.transactionNo}
                                              </span>
                                            </div>
                                          </TableCell>

                                          <TableCell className="p-3 text-center align-middle">
                                            {item.receiptPhoto ? (
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                <ReceiptSlipThumbnail
                                                  photoUrl={item.receiptPhoto}
                                                  title={item.monthOrDesc}
                                                  date={item.receiptPhotoUploadedAt ? `Uploaded: ${item.receiptPhotoUploadedAt}` : undefined}
                                                  isRejected={isRejected}
                                                  isPartial={isPartial}
                                                  rejectionReason={item.rejectionReason}
                                                  onClick={() => viewReceiptPhoto(
                                                    item.receiptPhoto!,
                                                    item.monthOrDesc,
                                                    item.receiptPhotoUploadedAt,
                                                    isRejected,
                                                    item.rejectionReason
                                                  )}
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-slate-400 text-xs italic">{isBn ? 'স্লিপ জমা নেই' : 'No slip uploaded'}</span>
                                            )}
                                          </TableCell>

                                          <TableCell className="p-3 text-center align-middle font-bold text-slate-900 font-mono">
                                            {isBn ? '৳ ' : 'BDT '}{item.amount.toLocaleString()}
                                          </TableCell>

                                          <TableCell className="p-3 text-center align-middle whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                              {isPaid ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {isBn ? 'অনুমোদিত' : 'Cleared'}
                                                </span>
                                              ) : isSlipPending ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs">
                                                  <FileCheck className="h-3 w-3 text-blue-600" />
                                                  {isBn ? 'স্লিপ জমা' : 'Receipt Sent'}
                                                </span>
                                              ) : isPartial ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-300 shadow-2xs">
                                                  <Wallet className="h-3 w-3 text-purple-600" /> {isBn ? 'অবশিষ্ট বকেয়া' : 'Remaining Due'}
                                                </span>
                                              ) : isRejected ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-300 shadow-2xs">
                                                  <XCircle className="h-3 w-3 text-red-600" /> {isBn ? 'প্রত্যাখ্যাত' : 'Slip Rejected'}
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                                  <Clock className="h-3 w-3 text-amber-600" /> {isBn ? 'বকেয়া' : 'Due Pending'}
                                                </span>
                                              )}

                                              {/* Actions */}
                                              {isPaid && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handlePrintSingleReceipt(item.rawReceipt, item.rawTransaction, {
                                                    isPartial: item.isPartial,
                                                    totalPaidAmount: item.amount,
                                                    totalDueAmount: 0,
                                                    totalAssignedAmount: item.amount,
                                                  })}
                                                  className="h-6.5 px-2 text-[11px] border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs gap-1"
                                                  title="Print official receipt"
                                                >
                                                  <Printer className="h-3 w-3" /> {isBn ? 'প্রিন্ট' : 'Print'}
                                                </Button>
                                              )}

                                              {(isPurePending || isRejected || isPartial) && item.rawTransaction && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => openMemberUploadModal(item.rawTransaction!)}
                                                  className="h-6.5 px-2 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-2xs gap-1"
                                                  title="Upload payment slip"
                                                >
                                                  <Camera className="h-3 w-3" /> Upload Slip
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
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>

    {/* PRINT AREA FOR REPORT STATEMENTS (OUTSIDE print:hidden ROOT) */}
    <ReportPrintArea report={printingReport} />

    {/* INDIVIDUAL RECEIPT PRINT MODAL */}
    {printReceipt && (
      <ReceiptPrintArea receipt={printReceipt} />
    )}

    {/* LIGHTBOX MODAL IMAGE VIEWER */}
    <Dialog open={openPhotoModal} onOpenChange={setOpenPhotoModal}>
      <DialogContent className={`sm:max-w-2xl max-h-[90vh] overflow-y-auto p-5 bg-white border-2 ${
        photoModalIsRejected ? 'border-red-400' : 'border-slate-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-bold flex items-center justify-between gap-2 ${
            photoModalIsRejected ? 'text-red-950' : 'text-slate-900'
          }`}>
            <span className="flex items-center gap-2">
              {photoModalIsRejected ? <XCircle className="h-5 w-5 text-red-600" /> : <Eye className="h-5 w-5 text-emerald-700" />}
              {photoModalTitle}
            </span>
            {photoModalIsRejected && (
              <Badge variant="destructive" className="text-xs px-2.5 py-0.5 font-bold shadow-xs">
                Slip Rejected by Admin
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {photoModalIsRejected && (
            <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed text-red-950">
                  {photoModalRejectionReason || 'Your proof slip could not be verified by Admin. Please re-upload a clear slip.'}
                </p>
              </div>
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
              Open Full Image in New Tab
            </a>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" onClick={() => setOpenPhotoModal(false)} className="cursor-pointer text-white bg-slate-900 hover:bg-slate-800">
              Close Viewer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    {/* MEMBER UPLOAD PROOF SLIP MODAL */}
    <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Camera className="h-5 w-5 text-emerald-700" />
            Upload Payment Slip / Proof
          </DialogTitle>
        </DialogHeader>

        {selectedTrxForUpload && (
          <div className="space-y-4 py-2 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">
                {selectedTrxForUpload.month
                  ? `${isBn ? 'মাসিক চাঁদা' : 'Monthly Subscription'} (${formatMonthI18n(selectedTrxForUpload.month, isBn)})`
                  : selectedTrxForUpload.description || (isBn ? 'সোসাইটি চাঁদা' : 'Society Demand')}
              </div>
              <div className="flex items-center justify-between text-slate-600 mt-1">
                <span>{isBn ? 'নির্ধারিত বকেয়া:' : 'Assigned Due:'}</span>
                <span className="font-bold text-slate-900 font-mono">
                  {isBn ? '৳ ' : 'BDT '}{Number(selectedTrxForUpload.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Deposit / Paid Amount (BDT) *
              </label>
              <Input
                type="number"
                placeholder="Enter amount deposited"
                value={memberAmount}
                onChange={(e) => setMemberAmount(e.target.value)}
                className="h-8.5 text-xs bg-slate-50/50 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Bank / Trx Reference ID
              </label>
              <Input
                placeholder="e.g. Bank slip no, bKash TrxID"
                value={memberRef}
                onChange={(e) => setMemberRef(e.target.value)}
                className="h-8.5 text-xs bg-slate-50/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Payment Method
              </label>
              <select
                value={memberMethod}
                onChange={(e) => setMemberMethod(e.target.value)}
                className="w-full h-8.5 text-xs rounded-md border border-slate-200 bg-slate-50/50 px-2.5 font-medium"
              >
                <option value="bank">Bank Deposit / IBBL / Transfer</option>
                <option value="mobile_banking">bKash / Nagad / Rocket</option>
                <option value="cash">Cash Handover</option>
                <option value="other">Other Method</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Attach Deposit Slip / Screenshot *
              </label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="h-8.5 text-xs bg-slate-50/50 cursor-pointer"
              />
              {uploadPreview && (
                <div className="mt-2 text-center p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <img
                    src={uploadPreview}
                    alt="Slip Preview"
                    className="max-h-32 mx-auto rounded object-contain"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Notes / Remarks
              </label>
              <Input
                placeholder="Any additional notes"
                value={memberComment}
                onChange={(e) => setMemberComment(e.target.value)}
                className="h-8.5 text-xs bg-slate-50/50"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setUploadModalOpen(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={submitMemberUpload}
            disabled={!uploadFile || isUploadingProof}
            className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer gap-1.5"
          >
            {isUploadingProof ? 'Uploading...' : 'Submit Slip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
