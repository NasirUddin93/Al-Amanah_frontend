'use client';
import React from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useGetFdrsQuery,
  useGetMeetingExpensesQuery,
  useGetNotificationsQuery,
  useGetUsersQuery,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
  PiggyBank,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Wallet,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export default function AccountsOverviewPage() {
  const user = useAppSelector((s) => s.auth.user);
  const unwrappedUser = (user as any)?.data || user;

  const { data: trx, isLoading: loadingTrx } = useGetTransactionsQuery(undefined, { pollingInterval: 3000 });
  const { data: receipts, isLoading: loadingReceipts } = useGetReceiptsQuery(undefined, { pollingInterval: 3000 });
  const { data: fdrs, isLoading: loadingFdrs } = useGetFdrsQuery();
  const { data: expenses, isLoading: loadingExpenses } = useGetMeetingExpensesQuery();
  const { data: notifs } = useGetNotificationsQuery(undefined, { pollingInterval: 5000 });
  const { data: users } = useGetUsersQuery(undefined, { pollingInterval: 5000 });

  // Metrics
  const totalCollections = trx?.data
    ?.filter((t) => t.status === 'paid')
    ?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0;

  const pendingDues = trx?.data
    ?.filter((t) => t.status === 'pending')
    ?.reduce((sum, t) => sum + Number(t.amount || 0), 0) ?? 0;

  const pendingSlipsCount = trx?.data?.filter((t) => t.status === 'pending' && t.receipt_photo).length ?? 0;

  const totalFdr = fdrs?.data?.reduce((sum, f) => sum + Number(f.amount || 0), 0) ?? 0;
  const totalExpenses = expenses?.data?.reduce((sum, e) => sum + Number(e.amount || 0), 0) ?? 0;
  const activeMembersCount = users?.data?.filter((u) => u.is_active && u.role?.name === 'member')?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-teal-500/30 border border-teal-300/30 text-teal-200 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Accounts &amp; Finance Management
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {unwrappedUser?.name || 'Accounts Officer'}
            </h1>
            <p className="text-xs text-teal-100/80 max-w-xl">
              Audit society transactions, verify member payment slips, issue official receipts, and print periodic financial ledgers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/accounts/receipts">
              <Button className="bg-teal-600 hover:bg-teal-500 text-white cursor-pointer font-bold text-xs shadow-md">
                <FileCheck className="h-4 w-4 mr-1.5" /> Verify Slips ({pendingSlipsCount})
              </Button>
            </Link>
            <Link href="/accounts/reports">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 cursor-pointer text-xs font-semibold">
                <FileText className="h-4 w-4 mr-1.5" /> Reports &amp; PDF
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Proof Slips Alert Banner */}
      {pendingSlipsCount > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-950">
                {pendingSlipsCount} Payment Proof Slip{pendingSlipsCount > 1 ? 's' : ''} Awaiting Verification
              </h3>
              <p className="text-xs text-blue-800">
                Members have submitted payment receipts. Review screenshot proofs and approve or decline.
              </p>
            </div>
          </div>
          <Link href="/accounts/receipts">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer">
              Open Verification Queue
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs hover:border-teal-200 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Collections</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              BDT {totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Cleared member contributions</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs hover:border-teal-200 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Outstanding Dues</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              BDT {pendingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Pending across all members</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs hover:border-teal-200 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>FDR Investments</span>
              <Landmark className="h-4 w-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              BDT {totalFdr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{fdrs?.data?.length ?? 0} active certificate(s)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs hover:border-teal-200 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Society Expenses</span>
              <Calendar className="h-4 w-4 text-rose-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              BDT {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{expenses?.data?.length ?? 0} expense records</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/accounts/receipts" className="block group">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-teal-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-800 flex items-center justify-between">
              <span>Receipts &amp; Slips Verification</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-teal-700 transition-colors" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify payment screenshots, settle amounts, and decline invalid proofs.
            </p>
          </div>
        </Link>

        <Link href="/accounts/transactions" className="block group">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-teal-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 flex items-center justify-between">
              <span>Billing Demands &amp; Demands</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Issue universal monthly billing campaigns, record payments, and track member dues.
            </p>
          </div>
        </Link>

        <Link href="/accounts/reports" className="block group">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-teal-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-800 flex items-center justify-between">
              <span>Financial Reports &amp; PDF</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-700 transition-colors" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Filter transaction statements by date range, export ledgers, and print official reports.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
