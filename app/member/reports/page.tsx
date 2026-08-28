'use client';

import React, { useState, useMemo } from 'react';
import { RoleGate } from '@/components/role-gate';
import {
  useGetReceiptsQuery,
  useGetTransactionsQuery,
} from '@/lib/api';
import { useAppSelector } from '@/store/hooks';
import type { Receipt, Transaction } from '@/types';
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
  items: MemberReceiptItem[];
  totalCount: number;
  totalPaid: number;
  totalDue: number;
  netAmount: number;
}

interface PrintSection {
  memberHeader: string;
  memberSubHeader?: string;
  monthSections: {
    monthTitle: string;
    subTotalPaid: number;
    subTotalDue: number;
    rows: {
      serial: string | number;
      date: string;
      description: string;
      refNo: string;
      status: string;
      paidAmount: number;
      dueAmount: number;
    }[];
  }[];
  memberTotalPaid: number;
  memberTotalDue: number;
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

export default function MemberReportsPage() {
  return (
    <RoleGate roles={['member', 'admin', 'super_admin', 'accountant']}>
      <MemberReportContent />
    </RoleGate>
  );
}

function MemberReportContent() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'received_slip' | 'pending' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'mobile_banking'>('all');

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const [printingReport, setPrintingReport] = useState<{
    level: 1 | 2 | 3;
    title: string;
    subtitle?: string;
    date: string;
    meta?: Record<string, string | number>;
    sections: PrintSection[];
    grandTotalPaid: number;
    grandTotalDue: number;
    totalRecords: number;
  } | null>(null);

  const { data: receiptsData } = useGetReceiptsQuery(undefined, { pollingInterval: 5000 });
  const { data: transactionsData } = useGetTransactionsQuery(undefined, { pollingInterval: 5000 });

  const rawReceipts: Receipt[] = useMemo(() => receiptsData?.data || [], [receiptsData]);
  const rawTransactions: Transaction[] = useMemo(() => transactionsData?.data || [], [transactionsData]);

  // Member Grouping & Month Hierarchies for current logged in member
  const memberData = useMemo(() => {
    const memId = currentUser?.id;
    const memName = currentUser?.name || 'Member';
    const memNo = currentUser?.member_profile?.member_no || (currentUser as any)?.memberProfile?.member_no || `MEM-${memId || '001'}`;
    const memEmail = currentUser?.email || '-';
    const memPhone = currentUser?.member_profile?.phone || (currentUser as any)?.phone || '-';

    const items: MemberReceiptItem[] = [];
    let totalPaid = 0;
    let totalDue = 0;

    const paidMonthSet = new Set<string>();
    const pendingMonthSet = new Set<string>();

    rawTransactions.forEach((trx) => {
      if (trx.status === 'paid') {
        if (trx.month) paidMonthSet.add(trx.month.trim().toLowerCase());
        if (trx.description) paidMonthSet.add(trx.description.trim().toLowerCase());
      } else if (trx.status === 'pending') {
        if (trx.month) pendingMonthSet.add(trx.month.trim().toLowerCase());
        if (trx.description) pendingMonthSet.add(trx.description.trim().toLowerCase());
      }
    });

    rawTransactions.forEach((trx) => {
      const linkedReceipt = rawReceipts.find((r) => r.transaction?.id === trx.id || (r as any).transaction_id === trx.id);
      const computedRef = extractInputtedReference(trx, linkedReceipt || trx.receipt);
      const monthGrouping = parseMonthGrouping(trx.month || trx.description || '', trx.transaction_date || '');

      if (trx.status === 'paid') {
        const isPartialPaid = Boolean(
          (trx.description && (/partial payment/i.test(trx.description) || /remaining due/i.test(trx.description))) ||
          (trx.month && pendingMonthSet.has(trx.month.trim().toLowerCase()))
        );

        items.push({
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

        totalPaid += Number(trx.amount || 0);
      } else if (trx.status === 'rejected') {
        items.push({
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
      } else if (trx.status === 'pending') {
        const isRemainingDue = (trx.description && /remaining due/i.test(trx.description)) || (trx.description && /partial payment/i.test(trx.description));
        const isThisDuePartiallyPaid = Boolean(isRemainingDue || (trx.month && paidMonthSet.has(trx.month.trim().toLowerCase())));

        if (trx.receipt_photo) {
          items.push({
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

          totalDue += Number(trx.amount || 0);
        } else {
          items.push({
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

          totalDue += Number(trx.amount || 0);
        }
      }
    });

    rawReceipts.forEach((r) => {
      const alreadyExists = items.some(
        (it) => it.receiptNo === r.receipt_no || (r.transaction?.transaction_no && it.transactionNo === r.transaction.transaction_no)
      );

      if (!alreadyExists) {
        const computedRef = extractInputtedReference(r.transaction, r);
        const monthGrouping = parseMonthGrouping(r.transaction?.month || r.transaction?.description || '', r.receipt_date || r.created_at || '');

        items.push({
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

        totalPaid += Number(r.amount || 0);
      }
    });

    // Group items into months
    const monthMap: Record<string, {
      monthKey: string;
      monthLabel: string;
      items: MemberReceiptItem[];
      totalPaid: number;
      totalDue: number;
    }> = {};

    items.forEach((item) => {
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

        return {
          monthKey: mg.monthKey,
          monthLabel: mg.monthLabel,
          items: sortedItems,
          totalCount: sortedItems.length,
          totalPaid: mg.totalPaid,
          totalDue: mg.totalDue,
          netAmount: mg.totalPaid,
        };
      });

    return {
      memberId: memId || 'current',
      memberName: memName,
      memberNo: memNo,
      memberEmail: memEmail,
      memberPhone: memPhone,
      items,
      monthGroups,
      totalCount: items.length,
      totalPaid,
      totalDue,
      netAmount: totalPaid,
    };
  }, [currentUser, rawTransactions, rawReceipts]);

  // Overall KPI Stats strictly synchronized with Member Receipts
  const stats = useMemo(() => {
    const totalReceipts = rawReceipts.length;

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
      const demandKey = (trx.month || trx.description || 'general').trim().toLowerCase();
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
    };
  }, [rawReceipts, rawTransactions]);

  // Filtered month groups
  const filteredMonthGroups = useMemo(() => {
    return memberData.monthGroups.filter((mg) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const labelMatch = mg.monthLabel.toLowerCase().includes(q);
        const itemMatch = mg.items.some(
          (it) =>
            it.receiptNo?.toLowerCase().includes(q) ||
            it.transactionNo?.toLowerCase().includes(q) ||
            it.inputtedReference?.toLowerCase().includes(q) ||
            it.monthOrDesc?.toLowerCase().includes(q)
        );
        if (!labelMatch && !itemMatch) return false;
      }

      if (statusFilter === 'paid' && !mg.items.some((it) => it.status === 'paid')) return false;
      if (statusFilter === 'partial' && !mg.items.some((it) => it.isPartial)) return false;
      if (statusFilter === 'received_slip' && !mg.items.some((it) => it.status === 'pending' && !!it.receiptPhoto)) return false;
      if (statusFilter === 'pending' && !mg.items.some((it) => it.status === 'pending' && !it.receiptPhoto)) return false;
      if (statusFilter === 'rejected' && !mg.items.some((it) => it.status === 'rejected')) return false;

      if (paymentMethodFilter !== 'all') {
        const hasMethod = mg.items.some((it) => it.paymentMethod.includes(paymentMethodFilter));
        if (!hasMethod) return false;
      }

      return true;
    });
  }, [memberData, searchQuery, statusFilter, paymentMethodFilter]);

  const toggleMonthExpand = (monthKey: string) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const expandAll = () => {
    const months: Record<string, boolean> = {};
    filteredMonthGroups.forEach((mg) => {
      months[mg.monthKey] = true;
    });
    setExpandedMonths(months);
  };

  const collapseAll = () => {
    setExpandedMonths({});
  };

  // =========================================================================
  // PRINT HANDLERS: MEMBER COMPLETE STATEMENT & MONTH-SPECIFIC STATEMENT
  // =========================================================================

  const handlePrintCompleteStatement = () => {
    let grandTotalPaid = 0;
    let grandTotalDue = 0;
    let totalRecords = 0;
    let globalSerial = 1;

    const monthSections: PrintSection['monthSections'] = [];

    memberData.monthGroups.forEach((mg) => {
      let subTotalPaid = 0;
      let subTotalDue = 0;

      const rows = mg.items.map((it) => {
        const isPaid = it.status === 'paid';
        const paidAmt = isPaid ? it.amount : 0;
        const dueAmt = !isPaid && it.status !== 'rejected' ? it.amount : 0;

        subTotalPaid += paidAmt;
        subTotalDue += dueAmt;
        grandTotalPaid += paidAmt;
        grandTotalDue += dueAmt;
        totalRecords += 1;

        return {
          serial: globalSerial++,
          date: it.date || '-',
          description: it.monthOrDesc,
          refNo: it.inputtedReference || '-',
          status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
          paidAmount: paidAmt,
          dueAmount: dueAmt,
        };
      });

      monthSections.push({
        monthTitle: mg.monthLabel,
        subTotalPaid,
        subTotalDue,
        rows,
      });
    });

    const sections: PrintSection[] = [
      {
        memberHeader: `MEMBER #${memberData.memberNo}: ${memberData.memberName}`,
        memberSubHeader: `Email: ${memberData.memberEmail || '-'} | Phone: ${memberData.memberPhone || '-'}`,
        monthSections,
        memberTotalPaid: grandTotalPaid,
        memberTotalDue: grandTotalDue,
      },
    ];

    setPrintingReport({
      level: 2,
      title: `Member Financial Statement - ${memberData.memberName}`,
      subtitle: `Member ID: ${memberData.memberNo} | Total Records: ${totalRecords}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      meta: {
        'Member Name': memberData.memberName,
        'Member ID': memberData.memberNo,
        'Total Cleared': `BDT ${grandTotalPaid.toLocaleString()}`,
        'Outstanding Due': `BDT ${grandTotalDue.toLocaleString()}`,
      },
      sections,
      grandTotalPaid,
      grandTotalDue,
      totalRecords,
    });

    setTimeout(() => {
      window.print();
      setPrintingReport(null);
    }, 150);
  };

  const handlePrintMonthStatement = (monthGroup: MonthGroup) => {
    let subTotalPaid = 0;
    let subTotalDue = 0;

    const rows = monthGroup.items.map((it, idx) => {
      const isPaid = it.status === 'paid';
      const paidAmt = isPaid ? it.amount : 0;
      const dueAmt = !isPaid && it.status !== 'rejected' ? it.amount : 0;

      subTotalPaid += paidAmt;
      subTotalDue += dueAmt;

      return {
        serial: idx + 1,
        date: it.date || '-',
        description: it.monthOrDesc,
        refNo: it.inputtedReference || '-',
        status: it.isPartial ? 'Partially Paid' : it.status === 'paid' ? 'Paid' : it.status === 'rejected' ? 'Rejected' : it.receiptPhoto ? 'In Review' : 'Due',
        paidAmount: paidAmt,
        dueAmount: dueAmt,
      };
    });

    const sections: PrintSection[] = [
      {
        memberHeader: `MEMBER #${memberData.memberNo}: ${memberData.memberName}`,
        memberSubHeader: `Email: ${memberData.memberEmail || '-'} | Phone: ${memberData.memberPhone || '-'}`,
        monthSections: [
          {
            monthTitle: monthGroup.monthLabel,
            subTotalPaid,
            subTotalDue,
            rows,
          },
        ],
        memberTotalPaid: subTotalPaid,
        memberTotalDue: subTotalDue,
      },
    ];

    setPrintingReport({
      level: 3,
      title: `${memberData.memberName} - Statement for ${monthGroup.monthLabel}`,
      subtitle: `Member ID: ${memberData.memberNo} | Billing Period: ${monthGroup.monthLabel}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      meta: {
        'Member': `${memberData.memberName} (${memberData.memberNo})`,
        'Period': monthGroup.monthLabel,
        'Total Collected': `BDT ${subTotalPaid.toLocaleString()}`,
        'Total Due': `BDT ${subTotalDue.toLocaleString()}`,
      },
      sections,
      grandTotalPaid: subTotalPaid,
      grandTotalDue: subTotalDue,
      totalRecords: rows.length,
    });

    setTimeout(() => {
      window.print();
      setPrintingReport(null);
    }, 150);
  };

  return (
    <>
      <div className={printingReport ? 'space-y-5 print:hidden' : 'space-y-5'}>
        {/* Top Header & Complete Statement Print Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-emerald-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                My Financial Reports &amp; Ledger Statement
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Complete chronological ledger of all your monthly subscriptions, cleared receipts, pending dues, and rejected slips.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={handlePrintCompleteStatement}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Printer className="h-4 w-4" />
              Print Complete Statement ({memberData.memberName})
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
              placeholder="Search month, ID, txn ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 text-xs h-9"
            />
          </div>
        </div>

        {/* =========================================================================
            MEMBER PROFILE CARD & MONTHLY TREE HIERARCHY
            ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          {/* MEMBER HEADER BAR */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500">
                {memberData.memberName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-base text-white">
                    MEMBER #{memberData.memberNo}: {memberData.memberName}
                  </h2>
                  <Badge variant="outline" className="text-[11px] font-mono text-emerald-300 border-emerald-500 bg-emerald-950/40">
                    Net Paid: BDT {memberData.totalPaid.toLocaleString()}
                  </Badge>
                  {memberData.totalDue > 0 && (
                    <Badge variant="outline" className="text-[11px] font-mono text-amber-300 border-amber-500 bg-amber-950/40">
                      Due: BDT {memberData.totalDue.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-sans">
                  Email: {memberData.memberEmail} | Phone: {memberData.memberPhone}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handlePrintCompleteStatement}
              className="h-8 text-xs font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Complete Statement
            </Button>
          </div>

          {/* MONTH SECTIONS */}
          <div className="p-4 space-y-3 bg-slate-50/50">
            {filteredMonthGroups.length === 0 ? (
              <Card className="p-10 text-center text-slate-500 bg-white">
                <Calendar className="h-9 w-9 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">No monthly records found matching your filters.</p>
              </Card>
            ) : (
              filteredMonthGroups.map((monthGroup) => {
                const isMonthExpanded = !!expandedMonths[monthGroup.monthKey];

                return (
                  <div
                    key={monthGroup.monthKey}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs"
                  >
                    {/* Month Header Banner */}
                    <div
                      onClick={() => toggleMonthExpand(monthGroup.monthKey)}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMonthExpand(monthGroup.monthKey);
                          }}
                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0 cursor-pointer"
                        >
                          {isMonthExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-emerald-700" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>

                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                          <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                          <span>{monthGroup.monthLabel}</span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-500">
                          ({monthGroup.totalCount} Records | Paid: BDT {monthGroup.totalPaid.toLocaleString()})
                        </span>

                        {monthGroup.totalDue > 0 && (
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Due: BDT {monthGroup.totalDue.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintMonthStatement(monthGroup);
                          }}
                          className="h-6 px-2.5 text-[11px] cursor-pointer hover:bg-emerald-50 hover:text-emerald-800 border-slate-300 font-semibold"
                        >
                          <Printer className="h-3 w-3 mr-1 text-emerald-700" />
                          Print {monthGroup.monthLabel.split(' ')[1] || monthGroup.monthLabel}
                        </Button>
                      </div>
                    </div>

                    {/* Transactions Table for this Month */}
                    {isMonthExpanded && (
                      <div className="p-3 bg-white overflow-x-auto">
                        <Table className="table-fixed w-full min-w-[700px]">
                          <TableHeader className="bg-slate-50/80">
                            <TableRow className="text-[11px] font-bold text-slate-700">
                              <TableHead className="w-[14%] text-center py-3.5">DATE</TableHead>
                              <TableHead className="w-[20%] text-center py-3.5">TXN / REF ID</TableHead>
                              <TableHead className="w-[26%] text-center py-3.5">DESCRIPTION</TableHead>
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
                                <TableCell className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                                  {item.inputtedReference || item.receiptNo || item.transactionNo || '-'}
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
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL PRINT ONLY TEMPLATE (MEMBER STATEMENTS)
          Structured with Big Member Header -> 2nd Big Month Header -> Data Table
          ========================================================================= */}
      {printingReport && (
        <div className="hidden print:block print:w-full bg-white text-slate-900 p-6 max-w-4xl mx-auto font-sans">
          {/* Official Society Main Header */}
          <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
            <h1 className="text-xl font-extrabold uppercase tracking-wider text-slate-900">Al-Amanah Society</h1>
            <p className="text-sm font-semibold text-slate-700">{printingReport.title}</p>
            {printingReport.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{printingReport.subtitle}</p>
            )}
          </div>

          {/* Report Metadata Info */}
          <div className="flex justify-between items-start text-xs mb-5 pb-2 border-b border-slate-200">
            <div className="space-y-1">
              {printingReport.meta &&
                Object.entries(printingReport.meta).map(([k, v]) => (
                  <p key={k}>
                    <span className="text-slate-500 font-medium">{k}:</span>{' '}
                    <strong className="text-slate-900">{v}</strong>
                  </p>
                ))}
            </div>
            <div className="text-right space-y-1">
              <p>
                <span className="text-slate-500">Report Date:</span>{' '}
                <strong>{printingReport.date}</strong>
              </p>
              <p>
                <span className="text-slate-500">Total Records:</span>{' '}
                <strong>{printingReport.totalRecords}</strong>
              </p>
            </div>
          </div>

          {/* SECTIONS: MEMBER (Big Title with Alternating Roof) -> MONTH (2nd Big Title with Alternating Roof) -> DATA TABLE */}
          <div className="space-y-6">
            {printingReport.sections.map((sec, secIdx) => {
              const memberRoofColor = secIdx % 2 === 0 ? '#0f172a' : '#1e3a8a';

              return (
                <div
                  key={secIdx}
                  className="space-y-4 break-inside-avoid rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs"
                  style={{
                    borderTopWidth: '5px',
                    borderTopColor: memberRoofColor,
                    borderTopStyle: 'solid',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {/* 1ST BIG TITLE: MEMBER HEADER */}
                  <div
                    className="text-white px-3.5 py-2.5 rounded-md flex justify-between items-center shadow-xs"
                    style={{
                      backgroundColor: memberRoofColor,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    <div>
                      <h2 className="text-sm font-extrabold uppercase tracking-wide text-white">
                        {sec.memberHeader}
                      </h2>
                      {sec.memberSubHeader && (
                        <p className="text-[10px] text-slate-200 font-normal mt-0.5">{sec.memberSubHeader}</p>
                      )}
                    </div>
                    <div className="text-right text-[11px] font-mono">
                      <span className="text-emerald-300 font-bold">Cleared: BDT {sec.memberTotalPaid.toLocaleString()}</span>
                      {sec.memberTotalDue > 0 && (
                        <span className="text-amber-300 font-bold ml-3">Due: BDT {sec.memberTotalDue.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* MONTH SECTIONS UNDER THIS MEMBER */}
                  {sec.monthSections.map((mSec, mIdx) => {
                    const monthRoofColor = mIdx % 2 === 0 ? '#047857' : '#0d9488';

                    return (
                      <div
                        key={mIdx}
                        className="space-y-2 rounded-md border border-slate-200/90 bg-white p-2.5 shadow-2xs"
                        style={{
                          borderTopWidth: '4px',
                          borderTopColor: monthRoofColor,
                          borderTopStyle: 'solid',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        {/* 2ND BIG TITLE: MONTH / PERIOD HEADER */}
                        <div
                          className="px-3 py-2 flex justify-between items-center rounded"
                          style={{
                            backgroundColor: '#f8fafc',
                            borderLeft: `4px solid ${monthRoofColor}`,
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        >
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {mSec.monthTitle}
                          </h3>
                          <div className="text-[11px] font-mono text-slate-700">
                            <span className="font-semibold text-emerald-800">Paid: BDT {mSec.subTotalPaid.toLocaleString()}</span>
                            {mSec.subTotalDue > 0 && (
                              <span className="text-amber-800 font-bold ml-2.5">Due: BDT {mSec.subTotalDue.toLocaleString()}</span>
                            )}
                          </div>
                        </div>

                        {/* DATA TABLE FOR THIS MONTH */}
                        <table className="w-full text-xs border-collapse mb-2">
                          <thead>
                            <tr className="border-b-2 border-slate-700 text-slate-700 bg-slate-50/80">
                              <th className="py-2.5 px-2.5 text-center w-10">#</th>
                              <th className="py-2.5 px-2.5 text-left w-24">Date</th>
                              <th className="py-2.5 px-2.5 text-left">Description / Campaign</th>
                              <th className="py-2.5 px-2.5 text-left w-32">Ref / Receipt</th>
                              <th className="py-2.5 px-2.5 text-center w-24">Status</th>
                              <th className="py-2.5 px-2.5 text-right w-24">Paid (BDT)</th>
                              <th className="py-2.5 px-2.5 text-right w-24">Due (BDT)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mSec.rows.map((row, rIdx) => {
                              const st = row.status.toLowerCase();
                              const isPaid = st.includes('paid') && !st.includes('partial');
                              const isPartial = st.includes('partial');
                              const isRejected = st.includes('rejected');

                              return (
                                <tr
                                  key={rIdx}
                                  className={`border-b border-slate-200 ${
                                    rIdx % 2 === 1 ? 'bg-slate-100/90 print:bg-slate-100' : 'bg-white'
                                  }`}
                                  style={rIdx % 2 === 1 ? { backgroundColor: '#f1f5f9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : { backgroundColor: '#ffffff' }}
                                >
                                  <td className="py-2.5 px-2.5 text-center text-slate-500 font-mono font-semibold">{row.serial}</td>
                                  <td className="py-2.5 px-2.5 text-slate-600 font-medium">{row.date}</td>
                                  <td className="py-2.5 px-2.5 text-slate-800 font-medium">{row.description}</td>
                                  <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">{row.refNo}</td>
                                  <td className="py-2.5 px-2.5 text-center">
                                    {isPaid ? (
                                      <span
                                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-800 border border-emerald-300"
                                        style={{ backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                      >
                                        Paid
                                      </span>
                                    ) : isPartial ? (
                                      <span
                                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-purple-800 border border-purple-300"
                                        style={{ backgroundColor: '#faf5ff', color: '#6b21a8', borderColor: '#e9d5ff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                      >
                                        Partial
                                      </span>
                                    ) : isRejected ? (
                                      <span
                                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-red-800 border border-red-300"
                                        style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                      >
                                        Rejected
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-800 border border-amber-300"
                                        style={{ backgroundColor: '#fffbeb', color: '#92400e', borderColor: '#fde68a', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                      >
                                        Due
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-800">
                                    {row.paidAmount > 0 ? row.paidAmount.toLocaleString() : '-'}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-800">
                                    {row.dueAmount > 0 ? row.dueAmount.toLocaleString() : '-'}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Month Sub-total in Table */}
                            <tr className="border-t-2 border-slate-400 font-bold bg-slate-50">
                              <td colSpan={5} className="py-2.5 px-2.5 text-right uppercase text-[10px] text-slate-600">
                                Sub-Total ({mSec.monthTitle}):
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono text-emerald-800">
                                BDT {mSec.subTotalPaid.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-mono text-amber-800">
                                {mSec.subTotalDue > 0 ? `BDT ${mSec.subTotalDue.toLocaleString()}` : '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* GRAND TOTAL BALANCE */}
            <div className="border-t-2 border-b-2 border-slate-900 py-2.5 px-3 bg-slate-50 flex justify-between items-center font-bold text-xs mt-6">
              <span className="uppercase tracking-wider text-slate-800 text-sm">Grand Total Balance:</span>
              <div className="flex items-center gap-6 font-mono text-sm">
                <span className="text-emerald-900">Cleared: BDT {printingReport.grandTotalPaid.toLocaleString()}</span>
                <span className="text-amber-900">Outstanding Due: BDT {printingReport.grandTotalDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Official Signatures */}
          <div className="mt-14 pt-4 flex justify-between text-xs text-slate-600">
            <div className="text-center w-36 border-t border-slate-400 pt-1">Prepared By</div>
            <div className="text-center w-36 border-t border-slate-400 pt-1">Accountant</div>
            <div className="text-center w-36 border-t border-slate-400 pt-1">Authorized Signatory</div>
          </div>
        </div>
      )}
    </>
  );
}
