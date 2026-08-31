'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useGetUsersQuery,
  useGetSettingsQuery,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import { ReportPrintArea, type PrintingReportData, type PrintSection, type PrintMonthSection, type PrintRowItem } from '@/components/report-print';
import { ReceiptPrintArea } from '@/components/receipt-print';
import type { Transaction, User, Receipt } from '@/types';
import {
  Receipt as ReceiptIcon,
  Users,
  Search,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  FileCheck,
  FileText,
  FileImage,
  ExternalLink,
  Layers,
  Sparkles,
  Eye,
  Filter,
} from 'lucide-react';

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
    key: '9999-99',
    label: descOrMonth || 'General Society Assessment',
  };
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

function getModifierInfo(group: any) {
  if (group.last_modified_by) {
    const u = group.last_modified_by;
    const name = u.name || u.email || 'Admin';
    const role = u.role?.name === 'super_admin' ? 'Super Admin' : u.role?.name || 'Admin';
    return { name, role, action: 'Updated' };
  }
  return { name: 'Super Admin', role: 'Super Admin', action: 'Created' };
}

export default function AdminTransactionsPage() {
  const user = useAppSelector((s) => s.auth.user);

  // View Mode: 'created' (Campaign Demands) | 'members' (Member Folders) | 'all' (Flat Records)
  const [activeTab, setActiveTab] = useState<'created' | 'members' | 'all'>('created');

  // Status Filter: All, Cleared Receipts, Partially Paid, Received Slips, Due Pending, Rejected Slips
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'mobile_banking' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedMembers, setExpandedMembers] = useState<Record<string | number, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Printing & Lightbox State
  const [printingReport, setPrintingReport] = useState<PrintingReportData | null>(null);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

  // Queries with polling interval
  const { data: receiptsData, isLoading: loadingReceipts } = useGetReceiptsQuery(
    { per_page: 3000 },
    { pollingInterval: 3000 }
  );
  const { data: transactionsData, isLoading: loadingTransactions } = useGetTransactionsQuery(
    { per_page: 3000 },
    { pollingInterval: 3000 }
  );
  const { data: usersData } = useGetUsersQuery({ per_page: 1000 });
  const { data: settings } = useGetSettingsQuery();

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

  // Build Comprehensive Member-wise Groups & Monthly Sub-sections
  const memberReceiptGroups = useMemo(() => {
    const map: Record<string | number, MemberGroup> = {};

    membersList.forEach((m) => {
      map[m.id] = {
        memberId: m.id,
        memberName: m.name,
        memberNo: m.member_profile?.member_no || (m as any).memberProfile?.member_no || '-',
        memberRole: (m.member_profile as any)?.role_designation || 'Member',
        memberEmail: m.email,
        memberPhone: (m as any).phone || (m.member_profile as any)?.phone || '-',
        items: [],
        monthGroups: [],
        totalCount: 0,
        totalPaid: 0,
        totalDue: 0,
        netAmount: 0,
        fullyPaidCount: 0,
        partiallyPaidCount: 0,
        receivedSlipCount: 0,
        pureDuePendingCount: 0,
        rejectedCount: 0,
      };
    });

    rawTransactions.forEach((trx) => {
      const mId = trx.member?.id || (trx as any).member_id || `anon_${trx.member?.name || 'unknown'}`;
      const mName = trx.member?.name || 'Unassigned Member';
      const mNo = trx.member?.member_no || (trx.member as any)?.member_profile?.member_no || '-';

      if (!map[mId]) {
        map[mId] = {
          memberId: mId,
          memberName: mName,
          memberNo: mNo,
          memberRole: (trx.member as any)?.member_profile?.role_designation || 'Member',
          memberEmail: (trx.member as any)?.email,
          memberPhone: (trx.member as any)?.phone || '-',
          items: [],
          monthGroups: [],
          totalCount: 0,
          totalPaid: 0,
          totalDue: 0,
          netAmount: 0,
          fullyPaidCount: 0,
          partiallyPaidCount: 0,
          receivedSlipCount: 0,
          pureDuePendingCount: 0,
          rejectedCount: 0,
        };
      }

      const isPaid = trx.status === 'paid';
      const isRejected = trx.status === 'rejected';
      const isPartial = (trx as any).is_partial || (trx.description || '').toLowerCase().includes('partial');
      const hasPhoto = Boolean(trx.receipt_photo);

      const parsedMonth = parseMonthGrouping(trx.month || trx.description || '', trx.transaction_date);
      const parsedRef = extractInputtedReference(trx);

      const item: MemberReceiptItem = {
        id: `trx_${trx.id}`,
        recordType: isRejected ? 'rejected_slip' : (hasPhoto && !isPaid ? 'pending_slip' : 'receipt'),
        receiptNo: trx.transaction_no,
        transactionNo: trx.transaction_no,
        date: trx.transaction_date || (trx.created_at || '').slice(0, 10),
        monthOrDesc: trx.description || trx.month || 'Subscription Deposit',
        monthKey: parsedMonth.key,
        amount: Number(trx.amount || 0),
        paymentMethod: (trx as any).payment_method || (trx.receipt as any)?.payment_method || (trx.type === 'deposit' ? 'cash' : 'cash'),
        receiptPhoto: trx.receipt_photo,
        receiptPhotoUploadedAt: trx.receipt_photo_uploaded_at,
        memberPaidAmount: trx.member_paid_amount ? Number(trx.member_paid_amount) : undefined,
        memberTrxReference: trx.member_trx_reference,
        inputtedReference: parsedRef,
        isRejected,
        isPartial,
        rejectionReason: trx.rejection_reason,
        status: isPaid ? 'paid' : (isPartial ? 'partial' : (isRejected ? 'rejected' : 'pending')),
        rawTransaction: trx,
      };

      map[mId].items.push(item);
    });

    // Populate monthGroups and aggregates per member
    Object.values(map).forEach((m) => {
      const monthMap: Record<string, MonthGroup> = {};

      m.items.forEach((item) => {
        const pMonth = parseMonthGrouping(item.monthOrDesc, item.date);
        const mKey = pMonth.key;

        if (!monthMap[mKey]) {
          monthMap[mKey] = {
            monthKey: mKey,
            monthLabel: pMonth.label,
            campaignTrxNo: item.transactionNo?.startsWith('TRX-') ? item.transactionNo : undefined,
            items: [],
            totalCount: 0,
            totalPaid: 0,
            totalDue: 0,
            netAmount: 0,
            fullyPaidCount: 0,
            partiallyPaidCount: 0,
            receivedSlipCount: 0,
            pureDuePendingCount: 0,
            rejectedCount: 0,
          };
        }

        monthMap[mKey].items.push(item);
        monthMap[mKey].totalCount += 1;

        if (item.status === 'paid') {
          monthMap[mKey].totalPaid += item.amount;
          monthMap[mKey].fullyPaidCount += 1;
        } else if (item.status === 'partial') {
          monthMap[mKey].totalPaid += (item.memberPaidAmount || item.amount);
          monthMap[mKey].partiallyPaidCount += 1;
        } else if (item.status === 'rejected') {
          monthMap[mKey].rejectedCount += 1;
        } else {
          monthMap[mKey].totalDue += item.amount;
          if (item.receiptPhoto) {
            monthMap[mKey].receivedSlipCount += 1;
          } else {
            monthMap[mKey].pureDuePendingCount += 1;
          }
        }
        monthMap[mKey].netAmount = monthMap[mKey].totalPaid + monthMap[mKey].totalDue;
      });

      m.monthGroups = Object.values(monthMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      m.totalCount = m.items.length;
      m.totalPaid = m.monthGroups.reduce((s, g) => s + g.totalPaid, 0);
      m.totalDue = m.monthGroups.reduce((s, g) => s + g.totalDue, 0);
      m.netAmount = m.totalPaid + m.totalDue;
      m.fullyPaidCount = m.monthGroups.reduce((s, g) => s + g.fullyPaidCount, 0);
      m.partiallyPaidCount = m.monthGroups.reduce((s, g) => s + g.partiallyPaidCount, 0);
      m.receivedSlipCount = m.monthGroups.reduce((s, g) => s + g.receivedSlipCount, 0);
      m.pureDuePendingCount = m.monthGroups.reduce((s, g) => s + g.pureDuePendingCount, 0);
      m.rejectedCount = m.monthGroups.reduce((s, g) => s + g.rejectedCount, 0);

      if (m.totalDue === 0 && m.totalPaid > 0) {
        m.currentState = 'cleared';
      } else if (m.partiallyPaidCount > 0) {
        m.currentState = 'partial';
      } else if (m.receivedSlipCount > 0) {
        m.currentState = 'received';
      } else if (m.rejectedCount > 0 && m.totalPaid === 0) {
        m.currentState = 'rejected';
      } else {
        m.currentState = 'due';
      }
    });

    return map;
  }, [rawTransactions, membersList]);

  // All Chronological Items
  const allChronologicalItems = useMemo(() => {
    const list: (MemberReceiptItem & { memberName: string; memberNo: string })[] = [];

    Object.values(memberReceiptGroups).forEach((m) => {
      m.items.forEach((item) => {
        list.push({
          ...item,
          memberName: m.memberName,
          memberNo: m.memberNo,
        });
      });
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [memberReceiptGroups]);

  // Created Demand Groups (Campaign Batches)
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
          last_modified_by: t.last_modified_by || (t as any).updated_by || (t as any).created_by,
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

      let duePendingCount = 0;
      let receivedSlipCount = 0;
      let rejectedCount = 0;

      Object.entries(memberStatusMap).forEach(([mId, st]) => {
        if (st.hasPaid && !st.hasPending) return;
        const mTrxList = g.transactions.filter((t) => String(t.member?.id) === String(mId) || String((t as any).member_id) === String(mId));
        const hasSlip = mTrxList.some((t) => t.status === 'pending' && Boolean(t.receipt_photo));
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
  }, [rawTransactions]);

  // Overall Aggregate Stats
  const stats = useMemo(() => {
    let currentClearedCount = 0;
    let currentPartialCount = 0;
    let currentReceivedCount = 0;
    let currentDueCount = 0;
    let currentRejectedCount = 0;

    let totalClearedAmount = 0;
    let partialCollectedAmount = 0;
    let receivedSlipsAmount = 0;
    let duePendingAmount = 0;
    let rejectedSlipsAmount = 0;

    allChronologicalItems.forEach((it) => {
      if (it.status === 'paid') {
        currentClearedCount += 1;
        totalClearedAmount += it.amount;
      } else if (it.status === 'partial') {
        currentPartialCount += 1;
        partialCollectedAmount += (it.memberPaidAmount || it.amount);
      } else if (it.status === 'rejected') {
        currentRejectedCount += 1;
        rejectedSlipsAmount += it.amount;
      } else {
        currentDueCount += 1;
        duePendingAmount += it.amount;
        if (it.receiptPhoto) {
          currentReceivedCount += 1;
          receivedSlipsAmount += it.amount;
        }
      }
    });

    const pureUnpaidDueCount = currentDueCount - currentReceivedCount;

    return {
      totalMembers: Object.keys(memberReceiptGroups).length,
      currentClearedCount,
      currentPartialCount,
      currentReceivedCount,
      currentDueCount,
      pureUnpaidDueCount,
      currentRejectedCount,
      totalClearedAmount,
      partialCollectedAmount,
      receivedSlipsAmount,
      duePendingAmount,
      rejectedSlipsAmount,
    };
  }, [allChronologicalItems, memberReceiptGroups]);

  // Filtering Lists
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

  const filteredMemberGroups = useMemo(() => {
    return Object.values(memberReceiptGroups).filter((m) => {
      if (statusFilter === 'paid' && m.currentState !== 'cleared') return false;
      if (statusFilter === 'partial' && m.partiallyPaidCount === 0) return false;
      if (statusFilter === 'received_slip' && m.receivedSlipCount === 0) return false;
      if (statusFilter === 'pending' && m.totalDue === 0) return false;
      if (statusFilter === 'rejected' && m.rejectedCount === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = m.memberName.toLowerCase().includes(q);
        const noMatch = m.memberNo.toLowerCase().includes(q);
        const emailMatch = (m.memberEmail || '').toLowerCase().includes(q);
        const phoneMatch = (m.memberPhone || '').toLowerCase().includes(q);
        const itemMatch = m.items.some((it) =>
          it.monthOrDesc.toLowerCase().includes(q) ||
          it.transactionNo.toLowerCase().includes(q) ||
          (it.inputtedReference || '').toLowerCase().includes(q)
        );
        return nameMatch || noMatch || emailMatch || phoneMatch || itemMatch;
      }

      return true;
    });
  }, [memberReceiptGroups, statusFilter, searchQuery]);

  const filteredAllItems = useMemo(() => {
    return allChronologicalItems.filter((it) => {
      if (statusFilter === 'paid' && it.status !== 'paid') return false;
      if (statusFilter === 'partial' && it.status !== 'partial') return false;
      if (statusFilter === 'received_slip' && (!it.receiptPhoto || it.status === 'paid' || it.status === 'rejected')) return false;
      if (statusFilter === 'pending' && (it.status === 'paid' || it.status === 'rejected')) return false;
      if (statusFilter === 'rejected' && it.status !== 'rejected') return false;

      if (paymentMethodFilter !== 'all') {
        const m = (it.paymentMethod || 'cash').toLowerCase();
        if (paymentMethodFilter === 'cash' && !m.includes('cash')) return false;
        if (paymentMethodFilter === 'bank' && !m.includes('bank') && !m.includes('ibbl') && !m.includes('brac')) return false;
        if (paymentMethodFilter === 'mobile_banking' && !m.includes('bkash') && !m.includes('nagad') && !m.includes('rocket') && !m.includes('mobile')) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = it.memberName.toLowerCase().includes(q);
        const noMatch = it.memberNo.toLowerCase().includes(q);
        const descMatch = it.monthOrDesc.toLowerCase().includes(q);
        const trxMatch = it.transactionNo.toLowerCase().includes(q);
        const refMatch = (it.inputtedReference || '').toLowerCase().includes(q);
        return nameMatch || noMatch || descMatch || trxMatch || refMatch;
      }

      return true;
    });
  }, [allChronologicalItems, statusFilter, paymentMethodFilter, searchQuery]);

  const toggleExpandGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleExpandMember = (memberId: string | number) => {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const toggleExpandMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // Open Lightbox Photo Modal
  const openPhotoPreviewModal = (url: string, title: string, date: string, isRejected: boolean = false, rejectionReason: string | null = null) => {
    setPhotoModalUrl(url);
    setPhotoModalTitle(title);
    setPhotoModalDate(date);
    setPhotoModalIsRejected(isRejected);
    setPhotoModalRejectionReason(rejectionReason);
    setOpenPhotoModal(true);
  };

  // =========================================================================
  // PRINT FINANCIAL STATEMENT HANDLERS (REPORT GENERATION)
  // =========================================================================

  const handlePrintEntireReport = () => {
    const sections: PrintSection[] = Object.values(memberReceiptGroups)
      .filter((m) => m.items.length > 0)
      .map((m) => {
        const monthSections: PrintMonthSection[] = m.monthGroups.map((mg) => ({
          monthTitle: mg.monthLabel,
          campaignTrxNo: mg.campaignTrxNo,
          subTotalPaid: mg.totalPaid,
          subTotalDue: mg.totalDue,
          subTotalAssessed: mg.netAmount,
          rows: mg.items.map((it, rIdx) => ({
            serial: rIdx + 1,
            date: it.date || '-',
            description: it.monthOrDesc,
            transactionNo: it.transactionNo || it.receiptNo || '-',
            refNo: it.inputtedReference || '-',
            status: it.status === 'paid' ? 'paid' : (it.status === 'partial' ? 'partial' : (it.status === 'rejected' ? 'rejected' : 'due')),
            paidAmount: it.status === 'paid' ? it.amount : (it.memberPaidAmount || 0),
            dueAmount: it.status !== 'paid' && it.status !== 'rejected' ? it.amount : 0,
            assessedAmount: it.amount,
          })),
        }));

        return {
          memberId: m.memberId,
          memberName: m.memberName,
          memberNo: m.memberNo,
          memberRole: m.memberRole,
          memberHeader: m.memberName,
          memberSubHeader: `ID: ${m.memberNo} • ${m.memberRole || 'Member'} • Phone: ${m.memberPhone || '-'}`,
          monthSections,
          memberTotalPaid: m.totalPaid,
          memberTotalDue: m.totalDue,
          memberTotalAssessed: m.netAmount,
        };
      });

    const reportData: PrintingReportData = {
      level: 1,
      title: 'All Members Official Financial Audit & Transaction Ledger Statement',
      subtitle: `Society Complete Ledger (${sections.length} Accounts)`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      summaryStats: {
        totalDemand: stats.totalClearedAmount + stats.duePendingAmount + stats.partialCollectedAmount,
        totalPaid: stats.totalClearedAmount + stats.partialCollectedAmount,
        totalDue: stats.duePendingAmount,
        recoveryRate: (stats.totalClearedAmount + stats.partialCollectedAmount) / Math.max(1, stats.totalClearedAmount + stats.duePendingAmount + stats.partialCollectedAmount) * 100,
        totalMembers: stats.totalMembers,
        totalRecords: allChronologicalItems.length,
        paidCount: stats.currentClearedCount + stats.currentPartialCount,
        dueCount: stats.currentDueCount,
      },
      sections,
      grandTotalPaid: stats.totalClearedAmount + stats.partialCollectedAmount,
      grandTotalDue: stats.duePendingAmount,
      totalRecords: allChronologicalItems.length,
    };

    setPrintingReport(reportData);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintMemberReport = (memberGroup: MemberGroup) => {
    const monthSections: PrintMonthSection[] = memberGroup.monthGroups.map((mg) => ({
      monthTitle: mg.monthLabel,
      campaignTrxNo: mg.campaignTrxNo,
      subTotalPaid: mg.totalPaid,
      subTotalDue: mg.totalDue,
      subTotalAssessed: mg.netAmount,
      rows: mg.items.map((it, rIdx) => ({
        serial: rIdx + 1,
        date: it.date || '-',
        description: it.monthOrDesc,
        transactionNo: it.transactionNo || it.receiptNo || '-',
        refNo: it.inputtedReference || '-',
        status: it.status === 'paid' ? 'paid' : (it.status === 'partial' ? 'partial' : (it.status === 'rejected' ? 'rejected' : 'due')),
        paidAmount: it.status === 'paid' ? it.amount : (it.memberPaidAmount || 0),
        dueAmount: it.status !== 'paid' && it.status !== 'rejected' ? it.amount : 0,
        assessedAmount: it.amount,
      })),
    }));

    const section: PrintSection = {
      memberId: memberGroup.memberId,
      memberName: memberGroup.memberName,
      memberNo: memberGroup.memberNo,
      memberRole: memberGroup.memberRole,
      memberHeader: memberGroup.memberName,
      memberSubHeader: `ID: ${memberGroup.memberNo} • ${memberGroup.memberRole || 'Member'} • Phone: ${memberGroup.memberPhone || '-'}`,
      monthSections,
      memberTotalPaid: memberGroup.totalPaid,
      memberTotalDue: memberGroup.totalDue,
      memberTotalAssessed: memberGroup.netAmount,
    };

    const reportData: PrintingReportData = {
      level: 2,
      title: `Official Member Statement — ${memberGroup.memberName}`,
      subtitle: `ID: ${memberGroup.memberNo} • Individual Account Statement`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      sections: [section],
      grandTotalPaid: memberGroup.totalPaid,
      grandTotalDue: memberGroup.totalDue,
      totalRecords: memberGroup.items.length,
    };

    setPrintingReport(reportData);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <>
      <div className={printReceipt || printingReport ? 'space-y-5 print:hidden' : 'space-y-5'}>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transactions &amp; Financial Ledger</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Audited transaction ledger of all society demand batches, member assessment matrices, collection progress, and printable financial statements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/admin/reports/preview">
              <Button variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer font-semibold">
                <Eye className="h-4 w-4" /> Statement Preview
              </Button>
            </Link>

            <Button
              onClick={handlePrintEntireReport}
              className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
            >
              <Printer className="h-4 w-4" /> Print Official Report
            </Button>
          </div>
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
              <span className="text-xs font-bold text-blue-700 uppercase">Received Slips</span>
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
                  <FileText className="h-3.5 w-3.5 text-emerald-700" />
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
                  <FileCheck className="h-3 w-3" /> Slips ({stats.currentReceivedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="h-3 w-3" /> Dues ({stats.pureUnpaidDueCount})
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

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search member, folio, TRX ID, or ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 text-xs h-9 bg-slate-50 border-slate-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* =========================================================================
              TAB 1: CREATED DEMAND BATCHES (CAMPAIGNS)
              ========================================================================= */}
          {activeTab === 'created' && (
            <div className="space-y-3.5">
              {loadingTransactions ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                  Loading demand batches...
                </div>
              ) : filteredCreatedGroups.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <ReceiptIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No demand batches found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing or adjusting your search filters.</p>
                </div>
              ) : (
                filteredCreatedGroups.map((group) => {
                  const isExpanded = !!expandedGroups[group.key];
                  const modifier = getModifierInfo(group);

                  return (
                    <div
                      key={group.key}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                    >
                      <div
                        onClick={() => toggleExpandGroup(group.key)}
                        className="p-4 hover:bg-slate-50/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                group.category === 'monthly_payment'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                              }`}
                            >
                              {group.category === 'monthly_payment' ? 'Monthly Subscription' : 'Special Assessment'}
                            </Badge>
                            <h3 className="font-bold text-slate-900 text-base">{group.title}</h3>
                            {group.transaction_no && (
                              <span className="font-mono text-xs font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                {group.transaction_no}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span>Per Member Demand: <strong className="text-slate-800 font-mono">BDT {group.perMemberAmount.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Target: <strong className="text-slate-800">{group.totalMembersAssigned} Members</strong></span>
                            <span>•</span>
                            <span>Due Date: <strong className="text-slate-800 font-mono">{group.dueDate || 'Open'}</strong></span>
                            <span>•</span>
                            <span className="text-slate-400 text-[11px]">
                              {modifier.action} by <strong className="text-slate-600 font-semibold">{modifier.name}</strong> ({modifier.role})
                            </span>
                          </div>
                        </div>

                        {/* Progress & Quick Stats */}
                        <div className="flex items-center gap-4">
                          <div className="text-right min-w-36">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs font-bold text-emerald-800 font-mono">
                                BDT {group.totalCollectedAmount.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                / BDT {group.totalDemandAmount.toLocaleString()}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full transition-all ${
                                  group.isFullyPaid ? 'bg-emerald-600' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${group.progressPercent}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                              <span>{group.paidCount} of {group.totalMembersAssigned} Settled</span>
                              <span className="font-bold text-emerald-800">{group.progressPercent}%</span>
                            </div>
                          </div>

                          <div className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Member List under this Demand */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-4 bg-slate-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Member Assessment Breakdown ({group.transactions.length} Records)
                            </h4>
                          </div>

                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <Table className="table-fixed w-full">
                              <TableHeader className="bg-slate-50">
                                <TableRow className="text-[11px] font-bold text-slate-700">
                                  <TableHead className="w-[26%] text-left py-3 px-3">MEMBER &amp; ID</TableHead>
                                  <TableHead className="w-[18%] text-center py-3 px-2">TRANSACTION NO / REF</TableHead>
                                  <TableHead className="w-[14%] text-center py-3 px-2">STATUS</TableHead>
                                  <TableHead className="w-[14%] text-center py-3 px-2">SLIP PROOF</TableHead>
                                  <TableHead className="w-[14%] text-right py-3 px-2">ASSESSED</TableHead>
                                  <TableHead className="w-[14%] text-right py-3 px-3">PAID (BDT)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.transactions.map((trx) => {
                                  const m = trx.member;
                                  const isPaid = trx.status === 'paid';
                                  const isRejected = trx.status === 'rejected';
                                  const isPartial = (trx as any).is_partial || (trx.description || '').toLowerCase().includes('partial');
                                  const parsedRef = extractInputtedReference(trx);

                                  return (
                                    <TableRow key={trx.id} className="text-xs hover:bg-slate-50/80">
                                      <TableCell className="py-2.5 px-3">
                                        <div className="font-bold text-slate-900">{m?.name || 'Member'}</div>
                                        <div className="text-[11px] font-mono text-slate-500">
                                          ID: {m?.member_no || (m as any)?.member_profile?.member_no || '-'}
                                        </div>
                                      </TableCell>

                                      <TableCell className="py-2.5 px-2 text-center font-mono font-semibold text-slate-800">
                                        <div>{trx.transaction_no || '-'}</div>
                                        {parsedRef && parsedRef !== '-' && parsedRef !== trx.transaction_no && (
                                          <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                            Ref: {parsedRef}
                                          </span>
                                        )}
                                      </TableCell>

                                      <TableCell className="py-2.5 px-2 text-center">
                                        {isPaid ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled
                                          </span>
                                        ) : isPartial ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                            <Wallet className="h-3 w-3 text-purple-600" /> Partial
                                          </span>
                                        ) : isRejected ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                                            <XCircle className="h-3 w-3 text-red-600" /> Rejected
                                          </span>
                                        ) : trx.receipt_photo ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                            <FileCheck className="h-3 w-3 text-blue-600" /> Slip Uploaded
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                            <Clock className="h-3 w-3 text-amber-600" /> Due Pending
                                          </span>
                                        )}
                                      </TableCell>

                                      <TableCell className="py-2.5 px-2 text-center">
                                        {trx.receipt_photo ? (
                                          <ReceiptSlipThumbnail
                                            photoUrl={trx.receipt_photo}
                                            title={`Slip for ${m?.name || 'Member'}`}
                                            date={trx.receipt_photo_uploaded_at || trx.transaction_date}
                                            isRejected={isRejected}
                                            rejectionReason={trx.rejection_reason}
                                            onClick={() =>
                                              openPhotoPreviewModal(
                                                trx.receipt_photo!,
                                                `Payment Slip: ${m?.name || 'Member'} (${group.title})`,
                                                trx.receipt_photo_uploaded_at || trx.transaction_date || '',
                                                isRejected,
                                                trx.rejection_reason
                                              )
                                            }
                                          />
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic">None</span>
                                        )}
                                      </TableCell>

                                      <TableCell className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">
                                        BDT {Number(trx.amount || group.perMemberAmount).toLocaleString()}
                                      </TableCell>

                                      <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                                        {isPaid ? `BDT ${Number(trx.amount).toLocaleString()}` : (isPartial && trx.member_paid_amount ? `BDT ${Number(trx.member_paid_amount).toLocaleString()}` : '-')}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 2: MEMBER FOLDERS (MEMBER-WISE LEDGER BREAKDOWN)
              ========================================================================= */}
          {activeTab === 'members' && (
            <div className="space-y-3.5">
              {loadingTransactions ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                  Loading member ledgers...
                </div>
              ) : filteredMemberGroups.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No member records found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing or adjusting your search filters.</p>
                </div>
              ) : (
                filteredMemberGroups.map((memberGroup) => {
                  const isExpanded = !!expandedMembers[memberGroup.memberId];
                  const recoveryRate = memberGroup.netAmount > 0
                    ? Math.round((memberGroup.totalPaid / memberGroup.netAmount) * 100)
                    : 100;

                  return (
                    <div
                      key={memberGroup.memberId}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                    >
                      <div
                        onClick={() => toggleExpandMember(memberGroup.memberId)}
                        className="p-4 hover:bg-slate-50/70 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-sm shadow-2xs border border-emerald-200">
                            {memberGroup.memberName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-base">{memberGroup.memberName}</h3>
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                ID: {memberGroup.memberNo}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">({memberGroup.memberRole})</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              {memberGroup.memberPhone && memberGroup.memberPhone !== '-' && (
                                <span>Phone: <strong className="text-slate-700 font-mono">{memberGroup.memberPhone}</strong></span>
                              )}
                              {memberGroup.memberEmail && (
                                <span>Email: <strong className="text-slate-700">{memberGroup.memberEmail}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financial Ledger Balance Badges & Print Action */}
                        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              Assessed: BDT {memberGroup.netAmount.toLocaleString()}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Settled: BDT {memberGroup.totalPaid.toLocaleString()}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                              memberGroup.totalDue > 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              Due: BDT {memberGroup.totalDue.toLocaleString()}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintMemberReport(memberGroup);
                            }}
                            className="h-8 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print Statement
                          </Button>

                          <div className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Member Months */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-4 bg-slate-50/50 space-y-4">
                          {memberGroup.monthGroups.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No transaction entries found for this member.</p>
                          ) : (
                            memberGroup.monthGroups.map((mg) => {
                              const isMonthExpanded = expandedMonths[`${memberGroup.memberId}_${mg.monthKey}`] !== false;

                              return (
                                <div
                                  key={mg.monthKey}
                                  className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs"
                                >
                                  {/* Period Subheader */}
                                  <div
                                    onClick={() => toggleExpandMonth(`${memberGroup.memberId}_${mg.monthKey}`)}
                                    className="px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-100 cursor-pointer flex items-center justify-between text-xs border-b border-slate-200"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                      <span className="font-bold text-slate-800">{mg.monthLabel}</span>
                                      {mg.campaignTrxNo && (
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                                          Campaign #{mg.campaignTrxNo}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 font-mono">
                                      <span className="text-emerald-800 font-bold">Settled: BDT {mg.totalPaid.toLocaleString()}</span>
                                      {mg.totalDue > 0 && (
                                        <span className="text-amber-900 font-bold">Due: BDT {mg.totalDue.toLocaleString()}</span>
                                      )}
                                      <span className="text-slate-400 text-xs">
                                        {isMonthExpanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Transactions Table for this Period */}
                                  {isMonthExpanded && (
                                    <Table className="table-fixed w-full">
                                      <TableHeader className="bg-slate-50/60">
                                        <TableRow className="text-[11px] font-bold text-slate-600">
                                          <TableHead className="w-[14%] text-left py-2.5 px-3">DATE</TableHead>
                                          <TableHead className="w-[26%] text-left py-2.5 px-2">PARTICULARS</TableHead>
                                          <TableHead className="w-[20%] text-center py-2.5 px-2">TRX ID / REF</TableHead>
                                          <TableHead className="w-[14%] text-center py-2.5 px-2">STATUS</TableHead>
                                          <TableHead className="w-[13%] text-right py-2.5 px-2">ASSESSED</TableHead>
                                          <TableHead className="w-[13%] text-right py-2.5 px-3">SETTLED</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {mg.items.map((it) => (
                                          <TableRow key={it.id} className="text-xs hover:bg-slate-50/80">
                                            <TableCell className="py-2.5 px-3 font-mono text-slate-600">
                                              {it.date || '-'}
                                            </TableCell>

                                            <TableCell className="py-2.5 px-2">
                                              <span className="font-medium text-slate-900">{it.monthOrDesc}</span>
                                            </TableCell>

                                            <TableCell className="py-2.5 px-2 text-center font-mono font-semibold text-slate-800">
                                              <div>{it.transactionNo || '-'}</div>
                                              {it.inputtedReference && it.inputtedReference !== '-' && it.inputtedReference !== it.transactionNo && (
                                                <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                                  Ref: {it.inputtedReference}
                                                </span>
                                              )}
                                            </TableCell>

                                            <TableCell className="py-2.5 px-2 text-center">
                                              {it.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled
                                                </span>
                                              ) : it.status === 'partial' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                                  <Wallet className="h-3 w-3 text-purple-600" /> Partial
                                                </span>
                                              ) : it.status === 'rejected' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                                                  <XCircle className="h-3 w-3 text-red-600" /> Rejected
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                  <Clock className="h-3 w-3 text-amber-600" /> Due
                                                </span>
                                              )}
                                            </TableCell>

                                            <TableCell className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">
                                              BDT {it.amount.toLocaleString()}
                                            </TableCell>

                                            <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                                              {it.status === 'paid' ? `BDT ${it.amount.toLocaleString()}` : (it.status === 'partial' && it.memberPaidAmount ? `BDT ${it.memberPaidAmount.toLocaleString()}` : '-')}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
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
          )}

          {/* =========================================================================
              TAB 3: ALL RECORDS TABLE (FLAT CHRONOLOGICAL AUDIT LIST)
              ========================================================================= */}
          {activeTab === 'all' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <Table className="table-fixed w-full">
                <TableHeader className="bg-slate-50">
                  <TableRow className="text-[11px] font-bold text-slate-700">
                    <TableHead className="w-[12%] text-left py-3 px-3">DATE</TableHead>
                    <TableHead className="w-[20%] text-left py-3 px-2">MEMBER &amp; ID</TableHead>
                    <TableHead className="w-[22%] text-left py-3 px-2">PARTICULARS / DESCRIPTION</TableHead>
                    <TableHead className="w-[16%] text-center py-3 px-2">TRANSACTION ID / REF</TableHead>
                    <TableHead className="w-[10%] text-center py-3 px-2">STATUS</TableHead>
                    <TableHead className="w-[8%] text-center py-3 px-2">SLIP</TableHead>
                    <TableHead className="w-[12%] text-right py-3 px-3">AMOUNT (BDT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTransactions ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        Loading transaction ledger records...
                      </TableCell>
                    </TableRow>
                  ) : filteredAllItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                        No transactions found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAllItems.map((item) => (
                      <TableRow key={item.id} className="text-xs hover:bg-slate-50/80">
                        <TableCell className="py-3 px-3 font-mono text-slate-600">
                          {item.date || '-'}
                        </TableCell>

                        <TableCell className="py-3 px-2">
                          <div className="font-bold text-slate-900">{item.memberName}</div>
                          <div className="text-[11px] font-mono text-slate-500">ID: {item.memberNo}</div>
                        </TableCell>

                        <TableCell className="py-3 px-2">
                          <span className="font-medium text-slate-800">{item.monthOrDesc}</span>
                        </TableCell>

                        <TableCell className="py-3 px-2 text-center font-mono font-semibold text-slate-800">
                          <div>{item.transactionNo || '-'}</div>
                          {item.inputtedReference && item.inputtedReference !== '-' && item.inputtedReference !== item.transactionNo && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              Ref: {item.inputtedReference}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-2 text-center">
                          {item.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled
                            </span>
                          ) : item.status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Wallet className="h-3 w-3 text-purple-600" /> Partial
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                              <XCircle className="h-3 w-3 text-red-600" /> Rejected
                            </span>
                          ) : item.receiptPhoto ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <FileCheck className="h-3 w-3 text-blue-600" /> In Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" /> Due
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-2 text-center">
                          {item.receiptPhoto ? (
                            <ReceiptSlipThumbnail
                              photoUrl={item.receiptPhoto}
                              title={`Slip for ${item.memberName}`}
                              date={item.receiptPhotoUploadedAt || item.date}
                              isRejected={item.isRejected}
                              rejectionReason={item.rejectionReason}
                              onClick={() =>
                                openPhotoPreviewModal(
                                  item.receiptPhoto!,
                                  `Payment Slip: ${item.memberName} (${item.monthOrDesc})`,
                                  item.receiptPhotoUploadedAt || item.date || '',
                                  item.isRejected,
                                  item.rejectionReason
                                )
                              }
                            />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">-</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-3 text-right font-mono font-bold">
                          <span className={item.status === 'paid' ? 'text-emerald-800' : (item.status === 'partial' ? 'text-purple-800' : 'text-slate-800')}>
                            BDT {item.amount.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Receipt Photo Modal */}
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

      {/* Single Receipt Print Area */}
      {printReceipt && (
        <ReceiptPrintArea receipt={printReceipt} />
      )}

      {/* Official Audited Financial Report Print Area */}
      <ReportPrintArea report={printingReport} />
    </>
  );
}
