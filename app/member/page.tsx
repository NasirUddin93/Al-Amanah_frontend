'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useGetFdrsQuery,
  useGetNotificationsQuery,
  useUploadReceiptPhotoMutation,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ReceiptPrintArea } from '@/components/receipt-print';
import { ReportPrintArea, type PrintingReportData, type PrintSection, type PrintMonthSection } from '@/components/report-print';
import { ReceiptSlipThumbnail, MagnifiableModalImage } from '@/components/receipt-magnifier';
import type { Receipt, User, Transaction } from '@/types';
import {
  Users,
  ArrowRight,
  FileText,
  Bell,
  CreditCard,
  Settings,
  Receipt as ReceiptIcon,
  Landmark,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Printer,
  CheckCircle2,
  Calendar as CalendarIcon,
  DollarSign,
  Wallet,
  Clock,
  AlertCircle,
  CalendarCheck,
  Camera,
  Image as ImageIcon,
  Eye,
  ZoomIn,
  FileImage,
  ExternalLink,
  MessageSquare,
  Hash,
  UploadCloud,
  FileCheck,
  XCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function MemberDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [activeTab, setActiveTab] = useState<'receipts' | 'transactions' | 'fdrs' | 'notifs' | 'profile'>('transactions');
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
  const [printingReport, setPrintingReport] = useState<PrintingReportData | null>(null);

  const { data: trx, isLoading: loadingTrx } = useGetTransactionsQuery(undefined, { pollingInterval: 3000 });
  const { data: receipts, isLoading: loadingReceipts } = useGetReceiptsQuery(undefined, { pollingInterval: 3000 });
  const { data: fdrs, isLoading: loadingFdrs } = useGetFdrsQuery();
  const { data: notifs, isLoading: loadingNotifs } = useGetNotificationsQuery(undefined, { pollingInterval: 5000 });
  const [uploadReceiptPhoto, { isLoading: isUploadingProof }] = useUploadReceiptPhotoMutation();
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  // Member Lightbox Receipt Photo Viewer State
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string>('');
  const [photoModalTitle, setPhotoModalTitle] = useState<string>('');
  const [photoModalDate, setPhotoModalDate] = useState<string>('');
  const [photoModalIsRejected, setPhotoModalIsRejected] = useState(false);
  const [photoModalRejectionReason, setPhotoModalRejectionReason] = useState<string | null>(null);

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

  // Member Upload Slip & Payment Proof Pop-up Modal State
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [uploadingTrx, setUploadingTrx] = useState<Transaction | null>(null);
  const [slipPhotoData, setSlipPhotoData] = useState<string | null>(null);
  const [slipPaidAmount, setSlipPaidAmount] = useState<string>('');
  const [slipPaymentMethod, setSlipPaymentMethod] = useState<'mobile_banking' | 'bank' | 'cash' | 'other'>('mobile_banking');
  const [slipTrxReference, setSlipTrxReference] = useState<string>('');
  const [slipComment, setSlipComment] = useState<string>('');
  const [viewingRejectedTrx, setViewingRejectedTrx] = useState<Transaction | null>(null);
  const [dismissedRejectedBanner, setDismissedRejectedBanner] = useState(false);

  const hasActiveUnresolvedRejection = useMemo(() => {
    if (!trx?.data) return false;
    const allItems = trx.data;

    const rejectedItems = allItems.filter((t) => t.status === 'rejected');
    if (rejectedItems.length === 0) return false;

    return rejectedItems.some((rej) => {
      const correspondingPending = allItems.find(
        (t) =>
          t.status === 'pending' &&
          ((t.month && t.month === rej.month) ||
            (t.description && t.description === rej.description) ||
            (t.payment_category && t.payment_category === rej.payment_category))
      );
      return Boolean(correspondingPending);
    });
  }, [trx]);

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

  const handlePrint = (r: Receipt) => {
    setPrintReceipt(r);
    setTimeout(() => {
      window.print();
      setPrintReceipt(null);
    }, 150);
  };

  const totalPaid = trx?.data
    .filter((t) => t.status === 'paid')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0) ?? 0;

  const pendingTransactions = trx?.data.filter((t) => t.status === 'pending') ?? [];
  const pendingAmount = pendingTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Month grouping helper
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
  };

  const parseMonthGrouping = (descOrMonth: string, fallbackDate: string = '') => {
    const match = (descOrMonth || '').match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})?/i
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
      label: descOrMonth || 'General Society Assessment',
    };
  };

  // Member Official Statement Printing Handler
  const handlePrintMemberStatement = () => {
    const rawList = trx?.data || [];
    const monthMap: Record<string, {
      monthKey: string;
      monthLabel: string;
      campaignTrxNo?: string;
      items: Transaction[];
      totalPaid: number;
      totalDue: number;
    }> = {};

    rawList.forEach((t) => {
      const parsed = parseMonthGrouping(t.month || t.description || '', t.transaction_date || (t.created_at || ''));
      const k = parsed.key;
      if (!monthMap[k]) {
        monthMap[k] = {
          monthKey: k,
          monthLabel: parsed.label,
          campaignTrxNo: t.transaction_no?.startsWith('TRX-') ? t.transaction_no : undefined,
          items: [],
          totalPaid: 0,
          totalDue: 0,
        };
      }
      monthMap[k].items.push(t);
      if (t.status === 'paid') {
        monthMap[k].totalPaid += Number(t.amount || 0);
      } else if (t.status !== 'rejected') {
        monthMap[k].totalDue += Number(t.amount || 0);
      }
    });

    const monthSections: PrintMonthSection[] = Object.values(monthMap)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((mg) => ({
        monthTitle: mg.monthLabel,
        campaignTrxNo: mg.campaignTrxNo,
        subTotalPaid: mg.totalPaid,
        subTotalDue: mg.totalDue,
        subTotalAssessed: mg.totalPaid + mg.totalDue,
        rows: mg.items.map((t, idx) => {
          const isPaid = t.status === 'paid';
          const isRejected = t.status === 'rejected';
          const isPartial = (t as any).is_partial || (t.description || '').toLowerCase().includes('partial');
          const paidAmt = isPaid ? Number(t.amount || 0) : (isPartial && t.member_paid_amount ? Number(t.member_paid_amount) : 0);
          const dueAmt = !isPaid && !isRejected ? Number(t.amount || 0) : 0;
          const assessedAmt = Number(t.amount || 0);

          return {
            serial: idx + 1,
            date: t.transaction_date || (t.created_at || '').slice(0, 10),
            description: t.description || t.month || 'Subscription Demand',
            transactionNo: t.transaction_no || '-',
            refNo: t.member_trx_reference || (t as any).transaction_reference || (t as any).reference || '-',
            status: isPaid ? 'Settled' : (isPartial ? 'Partial' : (isRejected ? 'Rejected' : (t.receipt_photo ? 'In Review' : 'Due'))),
            assessedAmount: assessedAmt,
            paidAmount: paidAmt,
            dueAmount: dueAmt,
            balanceAmount: dueAmt,
          };
        }),
      }));

    const memberSection: PrintSection = {
      memberId: user?.id,
      memberName: user?.name || 'Member',
      memberNo: user?.member_profile?.member_no || (user as any)?.memberProfile?.member_no || 'MEM',
      memberRole: (user?.member_profile as any)?.role_designation || 'Active Member',
      memberHeader: user?.name || 'Member Statement',
      memberSubHeader: `FOLIO #${user?.member_profile?.member_no || (user as any)?.memberProfile?.member_no || 'MEM'} • Phone: ${user?.member_profile?.phone || '-'} • Email: ${user?.email || '-'}`,
      monthSections,
      memberTotalPaid: totalPaid,
      memberTotalDue: pendingAmount,
      memberTotalAssessed: totalPaid + pendingAmount,
    };

    const reportData: PrintingReportData = {
      level: 2,
      title: `Official Member Statement — ${user?.name || 'Member'}`,
      subtitle: `Folio #${user?.member_profile?.member_no || (user as any)?.memberProfile?.member_no || 'MEM'} • Individual Financial Statement`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      sections: [memberSection],
      grandTotalPaid: totalPaid,
      grandTotalDue: pendingAmount,
      totalRecords: rawList.length,
      summaryStats: {
        totalDemand: totalPaid + pendingAmount,
        totalPaid,
        totalDue: pendingAmount,
        recoveryRate: (totalPaid + pendingAmount) > 0 ? Math.round((totalPaid / (totalPaid + pendingAmount)) * 100) : 100,
        totalMembers: 1,
        totalRecords: rawList.length,
      },
    };

    setPrintingReport(reportData);
    setTimeout(() => {
      window.print();
    }, 150);
  };

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

  const [trxSubView, setTrxSubView] = useState<'created' | 'all'>('created');
  const [expandedDemandGroups, setExpandedDemandGroups] = useState<Record<string, boolean>>({});

  const toggleExpandDemandGroup = (groupKey: string) => {
    setExpandedDemandGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const createdDemandGroups = useMemo(() => {
    const groups: Record<string, {
      key: string;
      title: string;
      category: string;
      month?: string;
      dueDate: string;
      transactions: Transaction[];
      totalDemandAmount: number;
      totalPaidAmount: number;
      isFullyPaid: boolean;
      isPartial: boolean;
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
          transactions: [],
          totalDemandAmount: 0,
          totalPaidAmount: 0,
          isFullyPaid: false,
          isPartial: false,
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

      const pendingTrx = targetList.filter((t) => t.status === 'pending');
      const paidTrx = targetList.filter((t) => t.status === 'paid');
      const rejectedTrx = g.transactions.filter((t) => t.status === 'rejected');

      const isPartial = (paidTrx.length > 0 && pendingTrx.length > 0) ||
        targetList.some((t) => t.description && /partial payment/i.test(t.description));

      const isFullyPaid = pendingTrx.length === 0 && paidTrx.length > 0;

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

      const totalDemand = isFullyPaid
        ? totalPaid
        : targetList.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        ...g,
        totalDemandAmount: totalDemand,
        totalPaidAmount: totalPaid,
        isFullyPaid,
        isPartial,
        status,
      };
    }).sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  }, [trx]);

  const totalFdr = fdrs?.data.reduce((acc, f) => acc + Number(f.amount || 0), 0) ?? 0;
  const unreadNotifs = notifs?.data.filter((n) => !n.is_read).length ?? 0;

  return (
    <>
      <div className={printReceipt || printingReport ? 'space-y-6 print:hidden' : 'space-y-6'}>
        {/* Member Profile Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold text-emerald-100 shadow-inner">
                {user?.name?.slice(0, 2).toUpperCase() || 'MB'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
                  {user?.member_profile?.member_no && (
                    <span className="font-mono text-xs font-bold bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 px-2.5 py-0.5 rounded-full">
                      ID: {user.member_profile.member_no}
                    </span>
                  )}
                  <span className="text-xs font-semibold bg-emerald-500/30 border border-emerald-300/30 text-emerald-100 px-2 py-0.5 rounded-full">
                    {user?.is_active ? 'Active Member' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/80 pt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-emerald-300" /> {user?.email}
                  </span>
                  {user?.member_profile?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-emerald-300" /> {user.member_profile.phone}
                    </span>
                  )}
                  {user?.member_profile?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-300" /> {user.member_profile.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
              <Button
                onClick={handlePrintMemberStatement}
                className="bg-white hover:bg-emerald-50 text-emerald-950 font-bold px-4 py-2.5 text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
              >
                <Printer className="h-4 w-4 text-emerald-700" />
                Print Statement
              </Button>

              <div className="bg-white/10 border border-white/20 rounded-xl p-3.5 backdrop-blur-xs min-w-[170px] text-right">
                <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider">Share Capital</div>
                <div className="text-2xl font-bold text-white mt-0.5">
                  BDT {Number(user?.member_profile?.share_amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding Pending Dues Alert Banner */}
        {pendingTransactions.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <span>Pending Payment Dues</span>
                  <span className="bg-amber-200 text-amber-900 text-[11px] px-2 py-0.2 rounded-full font-bold">
                    {pendingTransactions.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-amber-800">
                  Total outstanding payment due: <b className="text-slate-900">BDT {pendingAmount.toLocaleString()}</b>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pendingTransactions.map((pt) => (
                    <span
                      key={pt.id}
                      className="text-[11px] font-semibold bg-white border border-amber-300 text-amber-950 px-2 py-0.5 rounded shadow-2xs flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3 text-amber-600 inline" />
                      {pt.month ? pt.month : pt.description || 'Payment'}: <b>BDT {Number(pt.amount).toLocaleString()}</b>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab('transactions')}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs cursor-pointer shrink-0"
            >
              View Dues
            </Button>
          </div>
        )}

        {/* Member Financial Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Total Paid</span>
                <Wallet className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">BDT {totalPaid.toLocaleString()}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Completed contributions</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Receipts Issued</span>
                <ReceiptIcon className="h-4 w-4 text-teal-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">{receipts?.data.length ?? 0}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Official payment slips</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>FDR Investments</span>
                <Landmark className="h-4 w-4 text-indigo-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">BDT {totalFdr.toLocaleString()}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{fdrs?.data.length ?? 0} active certificate(s)</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Notices &amp; Alerts</span>
                <Bell className="h-4 w-4 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">
                {unreadNotifs > 0 ? <span className="text-rose-600">{unreadNotifs} New</span> : '0 New'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{notifs?.data.length ?? 0} total updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Member Tabs Container */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" /> Transactions &amp; Dues ({trx?.data.length ?? 0})
              {pendingTransactions.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                  {pendingTransactions.length} Pending
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'receipts'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ReceiptIcon className="h-3.5 w-3.5" /> My Receipts ({receipts?.data.length ?? 0})
            </button>

            <button
              onClick={() => setActiveTab('fdrs')}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'fdrs'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Landmark className="h-3.5 w-3.5" /> My FDRs ({fdrs?.data.length ?? 0})
            </button>

            <button
              onClick={() => setActiveTab('notifs')}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'notifs'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Bell className="h-3.5 w-3.5" /> Notices &amp; Alerts {unreadNotifs > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">{unreadNotifs}</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" /> Profile &amp; Contact Info
            </button>
          </div>

          {/* TAB 1: TRANSACTIONS & PENDING DUES */}
          {activeTab === 'transactions' && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Transaction History &amp; Assigned Dues</CardTitle>
                  <p className="text-xs text-slate-500">View your monthly subscriptions, assigned payment dues, and upload proof of payment slips.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setTrxSubView('created')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        trxSubView === 'created'
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ReceiptIcon className="h-3 w-3 text-emerald-700" />
                      Demand Batches ({createdDemandGroups.length})
                    </button>
                    <button
                      onClick={() => setTrxSubView('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        trxSubView === 'all'
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="h-3 w-3 text-emerald-700" />
                      All Transactions ({trx?.data?.length || 0})
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrintMemberStatement}
                    className="h-8 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Statement
                  </Button>
                </div>
              </CardHeader>

              {!dismissedRejectedBanner && hasActiveUnresolvedRejection && (
                <div className="mx-4 mt-4 p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-red-900 flex-1">
                      <p className="font-bold text-red-950">Payment Proof Slip Update</p>
                      <p className="text-[11px] text-red-800 leading-relaxed">
                        One or more of your submitted payment slips were declined by Admin. You can click on the <b>Slip Rejected</b> badge to see the reason given by Admin. A new pending payment due has been automatically generated for you below to submit a valid slip.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedRejectedBanner(true)}
                    className="text-red-500 hover:text-red-800 p-1 rounded-md hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                    title="Dismiss message"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {trxSubView === 'created' && (
                <CardContent className="p-0">
                  <Table className="table-fixed w-full">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="text-xs font-bold text-slate-700">
                        <TableHead className="w-[30%] px-3">Transaction Demand</TableHead>
                        <TableHead className="w-[15%] px-3">Due Date</TableHead>
                        <TableHead className="w-[20%] px-3">Amount</TableHead>
                        <TableHead className="w-[15%] px-3">Status</TableHead>
                        <TableHead className="w-[20%] px-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTrx && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading demands...</TableCell></TableRow>
                      )}
                      {createdDemandGroups.length === 0 && !loadingTrx && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No transaction demands created yet.</TableCell></TableRow>
                      )}
                      {createdDemandGroups.map((group) => {
                        const isExpanded = !!expandedDemandGroups[group.key];
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
                                    onClick={() => toggleExpandDemandGroup(group.key)}
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
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <ReceiptIcon className="h-4 w-4 text-emerald-700" />
                                      Billing Details for {group.title}
                                    </h4>

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
                                                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                      Settled
                                                    </span>
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
              )}

              {trxSubView === 'all' && (
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
            )}
          </Card>
        )}

          {/* TAB 2: RECEIPTS */}
          {activeTab === 'receipts' && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Payment Receipts</CardTitle>
                  <p className="text-xs text-slate-500">Official proof of payment slips issued by the society.</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingReceipts && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading receipts...</TableCell></TableRow>
                    )}
                    {receipts?.data.length === 0 && !loadingReceipts && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No receipts issued yet.</TableCell></TableRow>
                    )}
                    {receipts?.data.map((r) => {
                      const isPartial = r.transaction?.description && (/partial payment/i.test(r.transaction.description) || /remaining due/i.test(r.transaction.description));

                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-emerald-900">
                            <div className="flex flex-col items-start">
                              <span>{r.receipt_no}</span>
                              {isPartial && (
                                <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 mt-0.5">
                                  Partial Installment
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{r.receipt_date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-[11px] font-medium">
                              {r.payment_method?.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 text-sm">BDT {Number(r.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrint(r)}
                              className="h-8 gap-1.5 text-xs cursor-pointer border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              <Printer className="h-3.5 w-3.5" /> Print Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: FDRS */}
          {activeTab === 'fdrs' && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Fixed Deposit Receipts (FDR)</CardTitle>
                <p className="text-xs text-slate-500">Fixed term investments and certificates.</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FDR No</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Principal Amount</TableHead>
                      <TableHead>Maturity Date</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingFdrs && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading FDRs...</TableCell></TableRow>
                    )}
                    {fdrs?.data.length === 0 && !loadingFdrs && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No FDR records on file.</TableCell></TableRow>
                    )}
                    {fdrs?.data.map((f) => (
                      <TableRow key={f.id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-slate-900">{f.fdr_no}</TableCell>
                        <TableCell className="text-xs text-slate-600">{f.start_date}</TableCell>
                        <TableCell className="font-bold text-slate-900 text-sm">BDT {Number(f.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-slate-600">{f.maturity_date || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={f.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                            {f.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: NOTICES */}
          {activeTab === 'notifs' && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Notifications &amp; Society Notices</CardTitle>
                  <p className="text-xs text-slate-500">Official communications, meeting notices, and payment reminders.</p>
                </div>
                {unreadNotifs > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead()}
                    className="text-xs cursor-pointer gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark All Read
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {loadingNotifs && <div className="text-center py-8 text-xs text-slate-500">Loading notices...</div>}
                {notifs?.data.length === 0 && !loadingNotifs && (
                  <div className="text-center py-8 text-xs text-slate-500">No notifications at this time.</div>
                )}
                {notifs?.data.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      !n.is_read ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{n.title}</span>
                        {!n.is_read && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">{new Date(n.created_at).toLocaleString()}</span>
                    </div>

                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead(n.id)}
                        className="text-xs text-emerald-800 hover:bg-emerald-100 cursor-pointer shrink-0"
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB 5: PROFILE */}
          {activeTab === 'profile' && (
            <Card className="border-slate-200 shadow-xs max-w-2xl">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Member Profile &amp; Contact Details</CardTitle>
                <p className="text-xs text-slate-500">Your official society registration and contact records.</p>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Full Name</span>
                    <span className="font-bold text-slate-900 block mt-0.5">{user?.name}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Member ID</span>
                    <span className="font-mono font-bold text-emerald-800 block mt-0.5">
                      {user?.member_profile?.member_no ?? 'Unassigned'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Email Address</span>
                    <span className="font-semibold text-slate-900 block mt-0.5">{user?.email}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Phone Number</span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {user?.member_profile?.phone ?? 'Not provided'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Share Contribution</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      BDT {Number(user?.member_profile?.share_amount || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Account Status</span>
                    <span className="font-semibold text-emerald-700 block mt-0.5">
                      {user?.is_active ? 'Active & Good Standing' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 block font-medium">Residential / Mailing Address</span>
                  <span className="font-medium text-slate-800 block mt-0.5">
                    {user?.member_profile?.address ?? 'No address registered.'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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

      {/* Hidden print area for 1-click receipt printing */}
      {printReceipt && <ReceiptPrintArea receipt={printReceipt} />}

      {/* Official Member Statement Print Area */}
      <ReportPrintArea report={printingReport} />
    </>
  );
}
