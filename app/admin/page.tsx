'use client';
import React from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useGetNotificationsQuery,
  useGetUsersQuery,
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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role?.name === 'super_admin';

  const { data: trx } = useGetTransactionsQuery(undefined, { pollingInterval: 3000 });
  const { data: receipts } = useGetReceiptsQuery(undefined, { pollingInterval: 3000 });
  const { data: notifs } = useGetNotificationsQuery(undefined, { pollingInterval: 5000 });
  const { data: users } = useGetUsersQuery(undefined, { skip: !isSuperAdmin, pollingInterval: 5000 });

  const unread = notifs?.data.filter((n) => !n.is_read).length ?? 0;
  const totalClearedAmount = receipts?.data?.reduce((sum, r) => sum + Number(r.amount || 0), 0) ?? 0;
  const pendingSlipsCount = trx?.data?.filter((t) => t.status === 'pending' && t.receipt_photo).length ?? 0;

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
          <Link href="/admin/transactions">
            <Button className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-xs text-xs font-semibold">
              <CalendarCheck className="h-4 w-4" /> Create & Assign Dues
            </Button>
          </Link>
          <Link href="/admin/receipts">
            <Button variant="outline" className="flex items-center gap-2 cursor-pointer border-slate-200 text-xs font-semibold hover:bg-slate-50">
              <Receipt className="h-4 w-4 text-emerald-700" /> Review Slips ({pendingSlipsCount})
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

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Transactions</span>
              <CreditCard className="h-4 w-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900">{trx?.meta?.total ?? trx?.data?.length ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">Demands & individual dues recorded</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Collections</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-700">BDT {totalClearedAmount.toLocaleString()}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">{receipts?.data?.length ?? 0} verified receipts issued</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Pending Slips</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-amber-700">{pendingSlipsCount}</div>
            <p className="text-[11px] text-amber-700 mt-1">Awaiting admin review & settlement</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Active Society Members</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900">{users?.meta?.total ?? users?.data?.length ?? 6}</div>
            <p className="text-[11px] text-slate-500 mt-1">Registered member accounts</p>
          </CardContent>
        </Card>
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
                <CardTitle className="text-sm font-bold text-slate-900 pt-2">Meeting Expenses</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Record general meeting expenses, refreshment costs, logistics vouchers, and track audit receipts.
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
