'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { RoleGate } from '@/components/role-gate';
import {
  useGetReceiptsQuery,
  useGetUsersQuery,
  useGetTransactionsQuery,
} from '@/lib/api';
import type { Receipt, Transaction, User } from '@/types';
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
  Users,
  Search,
  Printer,
  ChevronDown,
  ChevronRight,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  FileCheck,
  Eye,
} from 'lucide-react';
import { ReportPrintArea, type PrintSection, type PrintingReportData } from '@/components/report-print';

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
    key: '9999-OTHER',
    label: '[OTHER] Special Adjustments & Other Charges',
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

  return '-';
}

export default function AdminReportsPage() {
  return (
    <RoleGate roles={['super_admin', 'admin', 'accountant']}>
      <ReportHierarchyManagerContent />
    </RoleGate>
  );
}

function ReportHierarchyManagerContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'mobile_banking'>('all');

  const [expandedMembers, setExpandedMembers] = useState<Record<string | number, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Printable Report State with Nested Member & Month Section structure
  const [printingReport, setPrintingReport] = useState<PrintingReportData | null>(null);

  const { data: receiptsData } = useGetReceiptsQuery({ per_page: 3000 }, { pollingInterval: 5000 });
  const { data: transactionsData } = useGetTransactionsQuery({ per_page: 3000 }, { pollingInterval: 5000 });
  const { data: usersData } = useGetUsersQuery({ per_page: 1000 });

  const rawReceipts: Receipt[] = useMemo(() => receiptsData?.data || [], [receiptsData]);
  const rawTransactions: Transaction[] = useMemo(() => transactionsData?.data || [], [transactionsData]);
  const rawUsers: User[] = useMemo(() => usersData?.data || [], [usersData]);

  const membersList: User[] = useMemo(() => {
    return rawUsers.filter((u) => {
      const roleName = (u.role?.name || '').toLowerCase().trim();
      const isAdminOrStaff = ['admin', 'super_admin', 'superadmin', 'accountant', 'staff'].includes(roleName);
      if (isAdminOrStaff) return false;
      return roleName === 'member' || Boolean(u.member_profile || (u as any).memberProfile);
    });
  }, [rawUsers]);

  const hierarchyData: MemberGroup[] = useMemo(() => {
    const memberMap: Record<string, {
      memberId: number | string;
      memberName: string;
      memberNo: string;
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
      const memId = trx.member?.id || (trx as any).member_id;
      if (!memId) return;

      if (trx.status === 'paid') {
        if (trx.month) paidMemberMonthSet.add(`${memId}___${trx.month.trim().toLowerCase()}`);
        if (trx.description) paidMemberMonthSet.add(`${memId}___${trx.description.trim().toLowerCase()}`);
      } else if (trx.status === 'pending') {
        if (trx.month) pendingMemberMonthSet.add(`${memId}___${trx.month.trim().toLowerCase()}`);
        if (trx.description) pendingMemberMonthSet.add(`${memId}___${trx.description.trim().toLowerCase()}`);
      }
    });

    membersList.forEach((m) => {
      const rawRole = (m.role?.name || (m as any).role_name || (m as any).role || 'Member').toLowerCase();
      const roleLabel = rawRole.includes('admin') ? 'Admin' : rawRole.includes('accountant') ? 'Accountant' : 'Member';

      memberMap[m.id] = {
        memberId: m.id,
        memberName: m.name,
        memberNo: m.member_profile?.member_no || (m as any).memberProfile?.member_no || `MEM-${m.id}`,
        memberRole: roleLabel,
        memberEmail: m.email,
        memberPhone: m.member_profile?.phone || '-',
        items: [],
        totalPaid: 0,
        totalDue: 0,
        fullyPaidCount: 0,
        partiallyPaidCount: 0,
        receivedSlipCount: 0,
        pureDuePendingCount: 0,
        rejectedCount: 0,
      };
    });

    rawTransactions.forEach((trx) => {
      const mId = trx.member?.id || `anon_${trx.member?.name || 'unknown'}`;
      const mName = trx.member?.name || 'Unassigned Member';
      const mNo = trx.member?.member_no || (trx.member as any)?.member_profile?.member_no || '-';
      const rawRole = ((trx.member as any)?.role?.name || (trx.member as any)?.role || 'Member').toLowerCase();
      const roleLabel = rawRole.includes('admin') ? 'Admin' : rawRole.includes('accountant') ? 'Accountant' : 'Member';

      if (!memberMap[mId]) {
        memberMap[mId] = {
          memberId: mId,
          memberName: mName,
          memberNo: mNo,
          memberRole: roleLabel,
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
        const memId = trx.member?.id || (trx as any).member_id;
        const isPartialPaid = Boolean(
          (trx.description && (/partial payment/i.test(trx.description) || /remaining due/i.test(trx.description))) ||
          (trx.month && pendingMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`))
        );

        memberMap[mId].items.push({
          id: `trx_paid_${trx.id}`,
          recordType: 'receipt',
          receiptNo: linkedReceipt?.receipt_no || trx.receipt?.receipt_no,
          transactionNo: trx.transaction_no,
          date: trx.transaction_date || '',
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
          date: trx.transaction_date || '',
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
        const memId = trx.member?.id || (trx as any).member_id;
        const isRemainingDue = (trx.description && /remaining due/i.test(trx.description)) || (trx.description && /partial payment/i.test(trx.description));
        const isThisDuePartiallyPaid = Boolean(isRemainingDue || (trx.month && paidMemberMonthSet.has(`${memId}___${trx.month.trim().toLowerCase()}`)));

        if (isThisDuePartiallyPaid && memberMap[mId].partiallyPaidCount === 0) {
          memberMap[mId].partiallyPaidCount += 1;
        }

        if (trx.receipt_photo) {
          memberMap[mId].items.push({
            id: `trx_pend_${trx.id}`,
            recordType: 'pending_slip',
            receiptNo: undefined,
            transactionNo: trx.transaction_no,
            date: trx.transaction_date || '',
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
            date: trx.transaction_date || '',
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

    rawReceipts.forEach((r) => {
      const mId = r.member?.id || `anon_${r.member?.name || 'unknown'}`;
      const mName = r.member?.name || 'Unassigned Member';
      const mNo = r.member?.member_no || (r.member as any)?.member_profile?.member_no || '-';

      if (!memberMap[mId]) {
        memberMap[mId] = {
          memberId: mId,
          memberName: mName,
          memberNo: mNo,
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

      const alreadyExists = memberMap[mId].items.some(
        (it) => it.receiptNo === r.receipt_no || (r.transaction?.transaction_no && it.transactionNo === r.transaction.transaction_no)
      );

      if (!alreadyExists) {
        const computedRef = extractInputtedReference(r.transaction, r);
        const monthGrouping = parseMonthGrouping(r.transaction?.month || r.transaction?.description || '', r.receipt_date || r.created_at || '');

        memberMap[mId].items.push({
          id: `rct_standalone_${r.id}`,
          recordType: 'receipt',
          receiptNo: r.receipt_no,
          transactionNo: r.transaction?.transaction_no || `TRX-STANDALONE-${r.id}`,
          date: r.receipt_date || r.created_at || '',
          monthOrDesc: r.transaction?.month || r.transaction?.description || 'Direct Receipt',
          monthKey: monthGrouping.key,
          amount: Number(r.amount || 0),
          paymentMethod: r.payment_method || 'cash',
          receiptPhoto: undefined,
          inputtedReference: computedRef,
          isRejected: false,
          isPartial: false,
          rejectionReason: null,
          status: 'paid',
          rawReceipt: r,
        });

        memberMap[mId].totalPaid += Number(r.amount || 0);
        memberMap[mId].fullyPaidCount += 1;
      }
    });

    const result: MemberGroup[] = Object.values(memberMap).map((m) => {
      const monthMap: Record<string, {
        monthKey: string;
        monthLabel: string;
        items: MemberReceiptItem[];
        totalPaid: number;
        totalDue: number;
      }> = {};

      m.items.forEach((item) => {
        const parsed = parseMonthGrouping(item.monthOrDesc, item.date);
        const k = parsed.key;
        if (!monthMap[k]) {
          monthMap[k] = {
            monthKey: k,
            monthLabel: parsed.label,
            items: [],
            totalPaid: 0,
            totalDue: 0,
          };
        }

        monthMap[k].items.push(item);
        if (item.status === 'paid') {
          monthMap[k].totalPaid += item.amount;
        } else if (item.status !== 'rejected') {
          monthMap[k].totalDue += item.amount;
        }
      });

      const monthGroups: MonthGroup[] = Object.values(monthMap)
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .map((mg) => {
          const sortedItems = [...mg.items].sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            return dateA.localeCompare(dateB) || String(a.id).localeCompare(String(b.id));
          });

          const campaignTrxNo = sortedItems.find((it) => it.transactionNo && !it.transactionNo.startsWith('TRX-STANDALONE'))?.transactionNo || (sortedItems[0]?.transactionNo || '');

          const paidItems = sortedItems.filter((it) => it.status === 'paid');
          const pendingItems = sortedItems.filter((it) => it.status === 'pending' || it.status === 'partial');
          const rejectedItems = sortedItems.filter((it) => it.status === 'rejected');

          let mgFullyPaidCount = 0;
          let mgPartiallyPaidCount = 0;
          let mgReceivedSlipCount = 0;
          let mgPureDuePendingCount = 0;
          let mgRejectedCount = rejectedItems.length;

          if (paidItems.length > 0 && pendingItems.length === 0) {
            mgFullyPaidCount = paidItems.length;
          } else if (paidItems.length > 0 && pendingItems.length > 0) {
            mgPartiallyPaidCount = 1;
          } else if (pendingItems.some((it) => !!it.receiptPhoto)) {
            mgReceivedSlipCount = pendingItems.filter((it) => !!it.receiptPhoto).length;
          } else if (pendingItems.length > 0) {
            mgPureDuePendingCount = pendingItems.length;
          }

          return {
            monthKey: mg.monthKey,
            monthLabel: mg.monthLabel,
            campaignTrxNo,
            items: sortedItems,
            totalCount: sortedItems.length,
            totalPaid: mg.totalPaid,
            totalDue: mg.totalDue,
            netAmount: mg.totalPaid,
            fullyPaidCount: mgFullyPaidCount,
            partiallyPaidCount: mgPartiallyPaidCount,
            receivedSlipCount: mgReceivedSlipCount,
            pureDuePendingCount: mgPureDuePendingCount,
            rejectedCount: mgRejectedCount,
          };
        });

      // Compute member's current overall state strictly matching receipts page logic
      const memberTrx = rawTransactions.filter(
        (t) => (t.member?.id === m.memberId || (t as any).member_id === m.memberId)
      ).sort((a, b) => {
        const dateA = a.updated_at || a.created_at || a.transaction_date || '';
        const dateB = b.updated_at || b.created_at || b.transaction_date || '';
        return dateB.localeCompare(dateA) || (b.id || 0) - (a.id || 0);
      });

      let currentState: 'cleared' | 'partial' | 'received' | 'due' | 'rejected' = 'cleared';
      if (memberTrx.length > 0) {
        const pendingList = memberTrx.filter((t) => t.status === 'pending');
        const paidList = memberTrx.filter((t) => t.status === 'paid');
        const rejectedList = memberTrx.filter((t) => t.status === 'rejected');
        const latestTrx = memberTrx[0];
        const activePendingWithSlip = pendingList.filter((t) => !!t.receipt_photo);
        const activePendingNoSlip = pendingList.filter((t) => !t.receipt_photo);

        if (activePendingWithSlip.length > 0) {
          currentState = 'received';
        } else if (paidList.length > 0 && activePendingNoSlip.length > 0) {
          currentState = 'partial';
        } else if (activePendingNoSlip.length > 0) {
          currentState = 'due';
        } else if (latestTrx.status === 'rejected' && pendingList.length === 0) {
          currentState = 'rejected';
        } else {
          currentState = 'cleared';
        }
      }

      return {
        memberId: m.memberId,
        memberName: m.memberName,
        memberNo: m.memberNo,
        memberRole: m.memberRole || 'Member',
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

    return result.sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [membersList, rawTransactions, rawReceipts]);

  // Overall Statistics Cards - Synchronized strictly with Receipts Page
  const stats = useMemo(() => {
    const totalReceipts = rawReceipts.length;
    const totalMembers = hierarchyData.length;

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
  }, [rawReceipts, rawTransactions, hierarchyData]);

  const filteredHierarchy = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return hierarchyData
      .map((member) => {
        const nameMatch = member.memberName.toLowerCase().includes(q);
        const idMatch = member.memberNo.toLowerCase().includes(q);
        const emailMatch = (member.memberEmail || '').toLowerCase().includes(q);
        const phoneMatch = (member.memberPhone || '').toLowerCase().includes(q);
        const memberInfoMatches = Boolean(q && (nameMatch || idMatch || emailMatch || phoneMatch));

        // Filter monthGroups and their items
        const filteredMonthGroups: MonthGroup[] = member.monthGroups
          .map((mg) => {
            const filteredItems = mg.items.filter((it) => {
              // 1. Status filter
              if (statusFilter === 'paid' && it.status !== 'paid') return false;
              if (statusFilter === 'partial' && it.status !== 'partial' && !it.isPartial) return false;
              if (statusFilter === 'received_slip' && (!it.receiptPhoto || it.status === 'paid' || it.status === 'rejected')) return false;
              if (statusFilter === 'pending' && (it.status === 'paid' || it.status === 'rejected')) return false;
              if (statusFilter === 'rejected' && it.status !== 'rejected' && !it.isRejected) return false;

              // 2. Payment method filter
              if (paymentMethodFilter !== 'all') {
                const method = (it.paymentMethod || 'cash').toLowerCase();
                if (paymentMethodFilter === 'cash' && !method.includes('cash')) return false;
                if (paymentMethodFilter === 'bank' && !method.includes('bank') && !method.includes('ibbl') && !method.includes('brac')) return false;
                if (paymentMethodFilter === 'mobile_banking' && !method.includes('bkash') && !method.includes('nagad') && !method.includes('rocket') && !method.includes('mobile')) return false;
              }

              // 3. Search query filter
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

            const subTotalPaid = filteredItems
              .filter((it) => it.status === 'paid' || it.status === 'partial')
              .reduce((sum, it) => sum + (it.status === 'paid' ? it.amount : (it.memberPaidAmount || it.amount)), 0);

            const subTotalDue = filteredItems
              .filter((it) => it.status !== 'paid' && it.status !== 'rejected')
              .reduce((sum, it) => sum + it.amount, 0);

            return {
              ...mg,
              items: filteredItems,
              totalCount: filteredItems.length,
              totalPaid: subTotalPaid,
              totalDue: subTotalDue,
              netAmount: subTotalPaid + subTotalDue,
            };
          })
          .filter((mg): mg is MonthGroup => mg !== null);

        // If member has filtered monthGroups with matching items
        if (filteredMonthGroups.length > 0) {
          const totalPaid = filteredMonthGroups.reduce((s, mg) => s + mg.totalPaid, 0);
          const totalDue = filteredMonthGroups.reduce((s, mg) => s + mg.totalDue, 0);
          const allFilteredItems = filteredMonthGroups.flatMap((mg) => mg.items);

          return {
            ...member,
            items: allFilteredItems,
            monthGroups: filteredMonthGroups,
            totalCount: allFilteredItems.length,
            totalPaid,
            totalDue,
            netAmount: totalPaid + totalDue,
          };
        }

        // If statusFilter is 'all' and search query directly matched the member's name/folio, keep member
        if (statusFilter === 'all' && memberInfoMatches) {
          return {
            ...member,
            items: [],
            monthGroups: [],
            totalCount: 0,
            totalPaid: 0,
            totalDue: 0,
            netAmount: 0,
          };
        }

        return null;
      })
      .filter((m): m is MemberGroup => m !== null);
  }, [hierarchyData, searchQuery, statusFilter, paymentMethodFilter]);

  const toggleMemberExpand = (memberId: string | number) => {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const toggleMonthExpand = (compositeKey: string) => {
    setExpandedMonths((prev) => ({ ...prev, [compositeKey]: !prev[compositeKey] }));
  };

  const expandAll = () => {
    const mems: Record<string | number, boolean> = {};
    const months: Record<string, boolean> = {};
    filteredHierarchy.forEach((m) => {
      mems[m.memberId] = true;
      m.monthGroups.forEach((mg) => {
        months[`${m.memberId}_${mg.monthKey}`] = true;
      });
    });
    setExpandedMembers(mems);
    setExpandedMonths(months);
  };

  const collapseAll = () => {
    setExpandedMembers({});
    setExpandedMonths({});
  };

  // =========================================================================
  // PRINT HANDLERS: 3 LEVELS (Separated by Big Member Header & 2nd Big Month Header)
  // =========================================================================

  // LEVEL 1: Print Entire Report (Grouped by Member Title -> Month 2nd Title -> Data Table)
  const handlePrintEntireReport = () => {
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
            refNo: it.inputtedReference || '-',
            status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : 'Due',
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
          memberRole: m.memberRole || 'CLASS-A GENERAL',
          memberHeader: `MEMBER #${m.memberNo}: ${m.memberName}`,
          memberSubHeader: `Email: ${m.memberEmail || '-'} | Phone: ${m.memberPhone || '-'}`,
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
      title: 'General Financial Audit & Member Assessment Ledger',
      subtitle: `Full Society Ledger | Total Members: ${filteredHierarchy.length} | Total Records: ${totalRecords}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      meta: {
        'Total Members': filteredHierarchy.length,
        'Total Transactions': totalRecords,
        'Total Collected': `BDT ${grandTotalPaid.toLocaleString()}`,
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

  // LEVEL 2: Print Specific Member (Big Member Title -> 2nd Big Month Titles -> Tables)
  const handlePrintMemberReport = (member: MemberGroup) => {
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
          refNo: it.inputtedReference || '-',
          status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
          assessedAmount: assessedAmt,
          paidAmount: paidAmt,
          dueAmount: dueAmt,
          balanceAmount: dueAmt,
        };
      });

      monthSections.push({
        monthTitle: mg.monthLabel,
        campaignTrxNo: mg.campaignTrxNo,
        subTotalAssessed,
        subTotalPaid,
        subTotalDue,
        rows,
      });
    });

    const sections: PrintSection[] = [
      {
        memberId: member.memberId,
        memberName: member.memberName,
        memberNo: member.memberNo,
        memberRole: member.memberRole || 'CLASS-A GENERAL',
        memberHeader: `MEMBER #${member.memberNo}: ${member.memberName}`,
        memberSubHeader: `Email: ${member.memberEmail || '-'} | Phone: ${member.memberPhone || '-'}`,
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
      title: `Member Financial Statement - ${member.memberName}`,
      subtitle: `Member ID: ${member.memberNo} | Phone: ${member.memberPhone || '-'} | Email: ${member.memberEmail || '-'}`,
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

  // LEVEL 3: Print Specific Month for a Member
  const handlePrintMonthReport = (member: MemberGroup, monthGroup: MonthGroup) => {
    let subTotalAssessed = 0;
    let subTotalPaid = 0;
    let subTotalDue = 0;
    let paidCount = 0;
    let dueCount = 0;

    const rows = monthGroup.items.map((it, idx) => {
      const isPaid = it.status === 'paid';
      const paidAmt = isPaid ? it.amount : 0;
      const dueAmt = !isPaid && it.status !== 'rejected' ? it.amount : 0;
      const assessedAmt = paidAmt + dueAmt;

      if (isPaid) paidCount++;
      else if (it.status !== 'rejected') dueCount++;

      subTotalAssessed += assessedAmt;
      subTotalPaid += paidAmt;
      subTotalDue += dueAmt;

      return {
        serial: idx + 1,
        date: it.date || '-',
        description: it.monthOrDesc,
        transactionNo: it.transactionNo || it.receiptNo || '-',
        refNo: it.inputtedReference || '-',
        status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
        assessedAmount: assessedAmt,
        paidAmount: paidAmt,
        dueAmount: dueAmt,
        balanceAmount: dueAmt,
      };
    });

    const firstItem = monthGroup.items[0];
    const rawReceipt = firstItem?.rawReceipt;
    const rawTrx = firstItem?.rawTransaction;

    const confirmedByObj = rawReceipt?.confirmed_by || rawReceipt?.created_by;
    const confirmedByName = typeof confirmedByObj === 'object' && confirmedByObj?.name ? confirmedByObj.name : typeof confirmedByObj === 'string' ? confirmedByObj : 'Super Admin';
    const confirmedRole = typeof confirmedByObj === 'object' && confirmedByObj?.role ? confirmedByObj.role.replace(/_/g, ' ') : 'Admin';

    const rawSettled = rawReceipt?.updated_at || rawReceipt?.created_at || (rawTrx as any)?.updated_at || (rawTrx as any)?.created_at || firstItem?.date || new Date().toLocaleDateString();
    const rawSlipUploaded = (rawTrx as any)?.receipt_photo_uploaded_at || (rawReceipt as any)?.receipt_photo_uploaded_at;

    const sections: PrintSection[] = [
      {
        memberId: member.memberId,
        memberName: member.memberName,
        memberNo: member.memberNo,
        memberRole: member.memberRole || 'CLASS-A GENERAL',
        memberHeader: `MEMBER #${member.memberNo}: ${member.memberName}`,
        memberSubHeader: `Email: ${member.memberEmail || '-'} | Phone: ${member.memberPhone || '-'}`,
        monthSections: [
          {
            monthTitle: monthGroup.monthLabel,
            campaignTrxNo: monthGroup.campaignTrxNo || (firstItem?.rawReceipt?.receipt_no) || (firstItem?.transactionNo),
            subTotalAssessed,
            subTotalPaid,
            subTotalDue,
            paymentMethod: firstItem?.paymentMethod || (firstItem?.rawReceipt?.payment_method) || 'Cash',
            billingDueDate: firstItem?.date || monthGroup.items[0]?.date || '-',
            settledTime: rawSettled,
            slipReceivedTime: rawSlipUploaded,
            confirmedBy: confirmedByName,
            confirmedRole: confirmedRole,
            adminComment: (firstItem?.rawReceipt as any)?.admin_comment || (firstItem?.rawTransaction as any)?.admin_comment || (firstItem?.rawReceipt as any)?.admin_note || '',
            memberComment: (firstItem?.rawReceipt as any)?.comment || (firstItem?.rawTransaction as any)?.member_comment || '',
            rows,
          },
        ],
        memberTotalAssessed: subTotalAssessed,
        memberTotalPaid: subTotalPaid,
        memberTotalDue: subTotalDue,
      },
    ];

    const totalDemand = subTotalPaid + subTotalDue;
    const recoveryRate = totalDemand > 0 ? (subTotalPaid / totalDemand) * 100 : 100;

    setPrintingReport({
      level: 3,
      title: `${member.memberName} - Statement for ${monthGroup.monthLabel}`,
      subtitle: `Member ID: ${member.memberNo} | Billing Period: ${monthGroup.monthLabel}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      meta: {
        'Member': `${member.memberName} (${member.memberNo})`,
        'Period': monthGroup.monthLabel,
        'Total Collected': `BDT ${subTotalPaid.toLocaleString()}`,
        'Total Due': `BDT ${subTotalDue.toLocaleString()}`,
      },
      summaryStats: {
        totalDemand,
        totalPaid: subTotalPaid,
        totalDue: subTotalDue,
        recoveryRate,
        totalMembers: 1,
        totalRecords: rows.length,
        paidCount,
        dueCount,
      },
      sections,
      grandTotalPaid: subTotalPaid,
      grandTotalDue: subTotalDue,
      totalRecords: rows.length,
    });

    const afterPrintMonthHandler = () => {
      setPrintingReport(null);
      window.removeEventListener('afterprint', afterPrintMonthHandler);
    };
    window.addEventListener('afterprint', afterPrintMonthHandler);

    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <>
      <div className="space-y-5 print:hidden">
        {/* Top Header & Level 1 Print Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-emerald-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Transaction Hierarchy &amp; Report Manager
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Interactive 3-tier reporting: Print Entire Society Report (Level 1), Member Statements (Level 2), or Specific Month Ledgers (Level 3).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={handlePrintEntireReport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Printer className="h-4 w-4" />
              Print Entire Report (All Members &amp; Txns)
            </Button>
          </div>
        </div>

        {/* Quick KPI Summary Cards */}
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

        {/* Filter Controls & Search Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter Badges */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-2xs'
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
                Cleared ({stats.currentClearedCount})
              </button>
              <button
                onClick={() => setStatusFilter('partial')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'partial'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <Wallet className="h-3 w-3" />
                Partial ({stats.currentPartialCount})
              </button>
              <button
                onClick={() => setStatusFilter('received_slip')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'received_slip'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <FileCheck className="h-3 w-3" />
                Received ({stats.currentReceivedCount})
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
                Due ({stats.currentDueCount})
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
                Rejected ({stats.currentRejectedCount})
              </button>
            </div>

            {/* Expand / Collapse All */}
            <div className="border-l border-slate-200 pl-2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={expandAll}
                className="h-7 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Expand All
              </Button>
              <span className="text-slate-300">|</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={collapseAll}
                className="h-7 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search member, ID, txn ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 text-xs h-9"
            />
          </div>
        </div>

        {/* =========================================================================
            THE 3-TIER TREE HIERARCHY ACCORDION
            ========================================================================= */}
        <div className="space-y-3">
          {filteredHierarchy.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 bg-white">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold">No member records found matching your filters.</p>
            </Card>
          ) : (
            filteredHierarchy.map((member) => {
              const isMemberExpanded = !!expandedMembers[member.memberId];

              return (
                <div
                  key={member.memberId}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                >
                  {/* LEVEL 1: MEMBER ROW */}
                  <div
                    onClick={() => toggleMemberExpand(member.memberId)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-slate-50/70 hover:bg-slate-100/80 transition-colors border-b border-slate-200/80"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMemberExpand(member.memberId);
                        }}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0 cursor-pointer shadow-2xs"
                      >
                        {isMemberExpanded ? (
                          <ChevronDown className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                      </button>

                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200 shadow-2xs">
                          {member.memberName.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="space-y-1.5 py-0.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                              {member.memberName}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wider">
                              {member.memberRole || 'Member'}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                  member.fullyPaidCount > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Cleared / Fully Paid"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                {member.fullyPaidCount} Cleared
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                  member.partiallyPaidCount > 0
                                    ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Partially Paid"
                              >
                                <Wallet className="h-3 w-3 text-purple-600" />
                                {member.partiallyPaidCount} Partial
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                  member.receivedSlipCount > 0
                                    ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Payment Slip Received (In Review)"
                              >
                                <FileCheck className="h-3 w-3 text-blue-600" />
                                {member.receivedSlipCount} Received
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                  member.pureDuePendingCount > 0
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Pending Unpaid Dues"
                              >
                                <Clock className="h-3 w-3 text-amber-600" />
                                {member.pureDuePendingCount} Due
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                  member.rejectedCount > 0
                                    ? 'bg-red-50 text-red-800 border-red-300 shadow-2xs font-bold'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                                title="Rejected Proof Slips"
                              >
                                <XCircle className="h-3 w-3 text-red-600" />
                                {member.rejectedCount} Rejected
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border-emerald-200 px-2.5 py-0.5">
                              Net: BDT {member.totalPaid.toLocaleString()}
                            </Badge>
                            {member.totalDue > 0 && (
                              <Badge variant="outline" className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 border-amber-200 px-2.5 py-0.5">
                                Due: BDT {member.totalDue.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono font-semibold text-slate-500 tracking-wide">
                            ID: #{member.memberNo}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintMemberReport(member);
                        }}
                        className="h-8 text-xs font-semibold cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs flex items-center gap-1.5"
                        title={`Print complete financial statement for ${member.memberName}`}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print Member #{member.memberNo}
                      </Button>
                    </div>
                  </div>

                  {/* LEVEL 2: MONTH GROUPS UNDER THIS MEMBER */}
                  {isMemberExpanded && (
                    <div className="p-3 bg-slate-100/50 space-y-2.5 pl-6 sm:pl-10">
                      {member.monthGroups.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No monthly records available for this member.</p>
                      ) : (
                        member.monthGroups.map((monthGroup) => {
                          const monthCompositeKey = `${member.memberId}_${monthGroup.monthKey}`;
                          const isMonthExpanded = !!expandedMonths[monthCompositeKey];

                          return (
                            <div
                              key={monthGroup.monthKey}
                              className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs"
                            >
                              {/* Month Header Banner */}
                              <div
                                onClick={() => toggleMonthExpand(monthCompositeKey)}
                                className="p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer bg-slate-50/90 hover:bg-slate-100 transition-colors border-b border-slate-100"
                              >
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMonthExpand(monthCompositeKey);
                                    }}
                                    className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0 cursor-pointer"
                                  >
                                    {isMonthExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-emerald-700" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                  </button>

                                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 flex-wrap">
                                    <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                                    <span>{monthGroup.monthLabel}</span>
                                    {monthGroup.campaignTrxNo && (
                                      <span className="font-mono text-[10px] text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 font-bold">
                                        {monthGroup.campaignTrxNo}
                                      </span>
                                    )}
                                  </div>

                                  {/* Month 5-Status Breakdown Counters (Only show active > 0) */}
                                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                                    {monthGroup.fullyPaidCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-bold"
                                        title="Cleared / Fully Paid"
                                      >
                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                        {monthGroup.fullyPaidCount} Cleared
                                      </span>
                                    )}

                                    {monthGroup.partiallyPaidCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-purple-50 text-purple-800 border-purple-300 shadow-2xs font-bold"
                                        title="Partially Paid"
                                      >
                                        <Wallet className="h-3 w-3 text-purple-600" />
                                        {monthGroup.partiallyPaidCount} Partial
                                      </span>
                                    )}

                                    {monthGroup.receivedSlipCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-300 shadow-2xs font-bold"
                                        title="Payment Slip Received (In Review)"
                                      >
                                        <FileCheck className="h-3 w-3 text-blue-600" />
                                        {monthGroup.receivedSlipCount} Received
                                      </span>
                                    )}

                                    {monthGroup.pureDuePendingCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-50 text-amber-900 border-amber-300 shadow-2xs font-bold"
                                        title="Pending Unpaid Dues"
                                      >
                                        <Clock className="h-3 w-3 text-amber-600" />
                                        {monthGroup.pureDuePendingCount} Due
                                      </span>
                                    )}

                                    {monthGroup.rejectedCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-red-50 text-red-800 border-red-300 shadow-2xs font-bold"
                                        title="Rejected Proof Slips"
                                      >
                                        <XCircle className="h-3 w-3 text-red-600" />
                                        {monthGroup.rejectedCount} Rejected
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      Paid: BDT {monthGroup.totalPaid.toLocaleString()}
                                    </span>

                                    {monthGroup.totalDue > 0 && (
                                      <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        Due: BDT {monthGroup.totalDue.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintMonthReport(member, monthGroup);
                                    }}
                                    className="h-6 px-2.5 text-[11px] cursor-pointer hover:bg-emerald-50 hover:text-emerald-800 border-slate-300 font-semibold"
                                    title={`Print ${monthGroup.monthLabel} statement only`}
                                  >
                                    <Printer className="h-3 w-3 mr-1 text-emerald-700" />
                                    Print {monthGroup.monthLabel.split(' ')[1] || monthGroup.monthLabel}
                                  </Button>
                                </div>
                              </div>

                              {/* LEVEL 3: INDIVIDUAL TRANSACTIONS TABLE FOR THIS MONTH */}
                              {isMonthExpanded && (
                                <div className="p-3 bg-white overflow-x-auto">
                                  <Table className="table-fixed w-full min-w-[700px]">
                                    <TableHeader className="bg-slate-50/80">
                                      <TableRow className="text-[11px] font-bold text-slate-700">
                                        <TableHead className="w-[14%] text-center py-3.5">DATE</TableHead>
                                        <TableHead className="w-[22%] text-center py-3.5">TRANSACTION ID / REF</TableHead>
                                        <TableHead className="w-[24%] text-center py-3.5">DESCRIPTION</TableHead>
                                        <TableHead className="w-[14%] text-center py-3.5">STATUS</TableHead>
                                        <TableHead className="w-[13%] text-center py-3.5">PAID AMOUNT</TableHead>
                                        <TableHead className="w-[13%] text-center py-3.5">DUE AMOUNT</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {monthGroup.items.map((item) => (
                                        <TableRow key={item.id} className="text-xs hover:bg-slate-50/80">
                                          <TableCell className="py-3 px-2 text-center text-slate-600 font-medium">
                                            {item.date || '-'}
                                          </TableCell>
                                          <TableCell className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                                            <div className="flex flex-col items-center gap-1.5">
                                              <span className="text-emerald-950 font-bold tracking-tight">{item.transactionNo || item.receiptNo || '-'}</span>
                                              {item.inputtedReference && item.inputtedReference !== '-' && item.inputtedReference !== item.transactionNo && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                                  <span className="text-amber-700 font-semibold text-[9px] uppercase">Ref:</span>
                                                  <span className="text-amber-950">{item.inputtedReference}</span>
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-3 px-2 text-center text-slate-700">
                                            {item.monthOrDesc}
                                          </TableCell>
                                          <TableCell className="py-3 px-2 text-center">
                                            {item.status === 'paid' ? (
                                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                Paid
                                              </span>
                                            ) : item.isPartial ? (
                                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                                Partial
                                              </span>
                                            ) : item.status === 'rejected' ? (
                                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                                                Rejected
                                              </span>
                                            ) : (
                                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                Due
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="py-3 px-2 text-center font-mono font-bold text-emerald-800">
                                            {item.status === 'paid' ? `+BDT ${item.amount.toLocaleString()}` : '-'}
                                          </TableCell>
                                          <TableCell className="py-3 px-2 text-center font-mono font-bold text-amber-800">
                                            {item.status !== 'paid' && item.status !== 'rejected' ? `BDT ${item.amount.toLocaleString()}` : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}

                                      {/* Sub-Total Row */}
                                      <TableRow className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-xs">
                                        <TableCell colSpan={4} className="py-3 px-2 text-right uppercase text-slate-700">
                                          SUB-TOTAL ({monthGroup.monthLabel}):
                                        </TableCell>
                                        <TableCell className="py-3 px-2 text-center font-mono text-emerald-900">
                                          +BDT {monthGroup.totalPaid.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="py-3 px-2 text-center font-mono text-amber-900">
                                          {monthGroup.totalDue > 0 ? `BDT ${monthGroup.totalDue.toLocaleString()}` : '-'}
                                        </TableCell>
                                      </TableRow>
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

      {/* =========================================================================
          OFFICIAL PRINT ONLY TEMPLATE (LEVELS 1, 2, AND 3)
          Rendered via dedicated standalone component
          ========================================================================= */}
      <ReportPrintArea report={printingReport} />
    </>
  );
}
