'use client';
import React from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import {
  useGetDashboardStatsQuery,
  useGetNotificationsQuery,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ArrowRight,
  FileText,
  CalendarCheck,
  Receipt,
  CreditCard,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldCheck,
  PiggyBank,
  Wallet,
} from 'lucide-react';

import { canManageTransactions } from '@/lib/roles';

export default function AdminDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role?.name === 'super_admin';
  const canManageTrx = canManageTransactions(user);

  const { data: statsRes, isLoading: loadingStats } = useGetDashboardStatsQuery(undefined, {
    pollingInterval: 4000,
  });
  const { data: notifs } = useGetNotificationsQuery(undefined, { pollingInterval: 5000 });

  const stats = statsRes?.data;
  const unread = notifs?.data.filter((n) => !n.is_read).length ?? 0;

  const totalDemands = stats?.total_demands ?? 0;
  const clearedCount = stats?.cleared_receipts_count ?? 0;
  const clearedAmount = stats?.cleared_receipts_amount ?? (stats?.total_collections ?? 0);
  const partialCount = stats?.partial_count ?? 0;
  const partialAmount = stats?.partial_collected_amount ?? 0;
  const receivedSlipsCount = stats?.received_slips_count ?? (stats?.pending_slips ?? 0);
  const receivedSlipsAmount = stats?.received_slips_amount ?? (stats?.pending_slips_amount ?? 0);
  const duePendingCount = stats?.due_pending_count ?? 0;
  const duePendingAmount = stats?.due_pending_amount ?? 0;
  const rejectedSlipsCount = stats?.rejected_slips_count ?? 0;
  const rejectedSlipsAmount = stats?.rejected_slips_amount ?? 0;

  const activeMembersCount = stats?.active_members ?? 0;
  const totalExpenses = stats?.total_expenses ?? 0;
  const totalFdrs = stats?.total_fdrs ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border border-emerald-200">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Welcome, {user?.name}</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Portal: <span className="font-semibold text-emerald-800 uppercase tracking-wider">{user?.role?.name?.replace(/_/g, ' ') || 'Admin'}</span> • Al-Amanah Society Executive Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManageTrx && (
            <Link href="/admin/transactions">
              <Button className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-xs text-xs font-semibold">
                <CalendarCheck className="h-4 w-4" /> Create & Assign Dues
              </Button>
            </Link>
          )}
          <Link href="/admin/receipts">
            <Button variant="outline" className="flex items-center gap-2 cursor-pointer border-slate-200 text-xs font-semibold hover:bg-slate-50">
              <Receipt className="h-4 w-4 text-emerald-700" /> Review Slips ({receivedSlipsCount})
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button variant="outline" className="flex items-center gap-2 cursor-pointer border-slate-200 text-xs font-semibold hover:bg-slate-50">
              <FileText className="h-4 w-4 text-slate-700" /> Financial Reports
            </Button>
          </Link>
          {isSuperAdmin && (
            <Link href="/admin/users">
              <Button variant="outline" className="flex items-center gap-2 cursor-pointer border-slate-200 text-xs font-semibold hover:bg-slate-50">
                <Users className="h-4 w-4 text-slate-700" /> Manage Users
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary Settlement & Demand Lifecycle Stat Cards (Aligned with Receipts Page) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Demands &amp; Collections Overview</h2>
          <Link href="/admin/receipts" className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
            Open Receipts &amp; Slips Verification <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Cleared Receipts</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-800 mt-1.5">
              {loadingStats ? <span className="text-slate-400 animate-pulse text-lg">...</span> : clearedCount}
            </p>
            <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
              BDT {clearedAmount.toLocaleString()} cleared
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 uppercase">Partially Paid</span>
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-extrabold text-purple-800 mt-1.5">
              {loadingStats ? <span className="text-slate-400 animate-pulse text-lg">...</span> : partialCount}
            </p>
            <p className="text-[11px] font-mono text-purple-700 mt-0.5">
              BDT {partialAmount.toLocaleString()} collected
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase">Receipts Received</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-blue-800 mt-1.5">
              {loadingStats ? <span className="text-slate-400 animate-pulse text-lg">...</span> : receivedSlipsCount}
            </p>
            <p className="text-[11px] font-mono text-blue-700 mt-0.5">
              BDT {receivedSlipsAmount.toLocaleString()} in review
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase">Due Pending</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-800 mt-1.5">
              {loadingStats ? <span className="text-slate-400 animate-pulse text-lg">...</span> : duePendingCount}
            </p>
            <p className="text-[11px] font-mono text-amber-700 mt-0.5">
              BDT {duePendingAmount.toLocaleString()} pending
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 uppercase">Rejected Slips</span>
              <ShieldCheck className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-extrabold text-red-800 mt-1.5">
              {loadingStats ? <span className="text-slate-400 animate-pulse text-lg">...</span> : rejectedSlipsCount}
            </p>
            <p className="text-[11px] font-mono text-red-700 mt-0.5">
              BDT {rejectedSlipsAmount.toLocaleString()} declined
            </p>
          </div>
        </div>
      </div>

      {/* Society Financial Snapshot Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Society Members</span>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">
              {loadingStats ? <span className="text-slate-400 animate-pulse text-sm">...</span> : activeMembersCount} Members
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Registered accounts</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Society Expenses</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">BDT {totalExpenses.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Meetings & disbursements</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Active FDR Reserves</span>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">BDT {totalFdrs.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Fixed deposits portfolio</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
            <PiggyBank className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Net Society Balance</span>
            <p className="text-lg font-bold text-emerald-800 mt-0.5">
              BDT {Math.max(0, clearedAmount - totalExpenses).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Collections minus expenses</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Quick Actions & Navigation Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">Management & Operations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/transactions" className="block group">
            <Card className="h-full border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Billing & Demand Generation</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Generate monthly subscription dues across all members or assign one-time demands with real-time collection progress.
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/receipts" className="block group">
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Receipts & Slips Verification</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Review uploaded proof slips with zoom lightbox, settle payments, issue official receipts, or reject invalid proofs.
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users" className="block group">
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800">
                    <Users className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Members & Staff Directory</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Register new members, manage roles and permissions, configure share contributions, and edit profiles.
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reports" className="block group">
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
                    <FileText className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Financial Reports & Statements</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Generate date-range financial summaries, export official PDF balance sheets, and review member ledger histories.
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/meeting-expenses" className="block group">
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Society Expenses</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Create dynamic itemized expense sheets with labels and values, monitor disbursements, and print official vouchers.
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings" className="block group">
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Society Configurations</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Configure default subscription dues, bank accounts, society details, and system preferences.
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
