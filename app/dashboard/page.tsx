'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import {
  useGetTransactionsQuery,
  useGetReceiptsQuery,
  useGetFdrsQuery,
  useGetNotificationsQuery,
  useGetUsersQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReceiptPrintArea } from '@/components/receipt-print';
import type { Receipt, User } from '@/types';
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
} from 'lucide-react';

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isMember = user?.role?.name === 'member';

  if (isMember) {
    return <MemberDashboard user={user} />;
  }

  return <AdminDashboard user={user} />;
}

/* =========================================================================
   MEMBER ALL-IN-ONE DASHBOARD
   ========================================================================= */
function MemberDashboard({ user }: { user: User | null }) {
  const [activeTab, setActiveTab] = useState<'receipts' | 'transactions' | 'fdrs' | 'notifs' | 'profile'>('transactions');
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);

  const { data: trx, isLoading: loadingTrx } = useGetTransactionsQuery();
  const { data: receipts, isLoading: loadingReceipts } = useGetReceiptsQuery();
  const { data: fdrs, isLoading: loadingFdrs } = useGetFdrsQuery();
  const { data: notifs, isLoading: loadingNotifs } = useGetNotificationsQuery();
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const handlePrint = (r: Receipt) => {
    setPrintReceipt(r);
    setTimeout(() => {
      window.print();
      setPrintReceipt(null);
    }, 150);
  };

  const totalPaid = trx?.data
    .filter((t) => t.status !== 'pending')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0) ?? 0;

  const pendingTransactions = trx?.data.filter((t) => t.status === 'pending') ?? [];
  const pendingAmount = pendingTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalFdr = fdrs?.data.reduce((acc, f) => acc + Number(f.amount || 0), 0) ?? 0;
  const unreadNotifs = notifs?.data.filter((n) => !n.is_read).length ?? 0;

  return (
    <>
      <div className={printReceipt ? 'space-y-6 print:hidden' : 'space-y-6'}>
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

            <div className="bg-white/10 border border-white/20 rounded-xl p-3.5 backdrop-blur-xs min-w-[200px] text-right md:text-right">
              <div className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider">Share Capital</div>
              <div className="text-2xl font-bold text-white mt-0.5">
                BDT {Number(user?.member_profile?.share_amount || 0).toLocaleString()}
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
                <span>Notices & Alerts</span>
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

        {/* Member All-in-One Navigation Tabs */}
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
              <CreditCard className="h-3.5 w-3.5" /> Transactions & Dues ({trx?.data.length ?? 0})
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
              <Bell className="h-3.5 w-3.5" /> Notices & Alerts {unreadNotifs > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">{unreadNotifs}</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" /> Profile & Contact Info
            </button>
          </div>

          {/* TAB 1: TRANSACTIONS & PENDING DUES */}
          {activeTab === 'transactions' && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Transaction History & Assigned Dues</CardTitle>
                <p className="text-xs text-slate-500">View your monthly subscriptions, assigned payment dues, and payments.</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction No</TableHead>
                      <TableHead>Type / Category</TableHead>
                      <TableHead>Month / Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTrx && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading transactions...</TableCell></TableRow>
                    )}
                    {trx?.data.length === 0 && !loadingTrx && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No transactions recorded yet.</TableCell></TableRow>
                    )}
                    {trx?.data.map((t) => {
                      const isPending = t.status === 'pending';

                      return (
                        <TableRow key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-slate-900">{t.transaction_no}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[11px] font-semibold">
                              {t.payment_category === 'monthly_payment'
                                ? 'Monthly Subscription'
                                : t.payment_category === 'one_time'
                                ? 'One-Time Payment'
                                : t.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              {t.month && (
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3 text-emerald-700 inline" /> {t.month}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 max-w-xs truncate">{t.description || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 text-sm">BDT {Number(t.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                <Clock className="h-3 w-3 text-amber-600" /> Pending Payment
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 text-right">{t.transaction_date}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
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
                    {receipts?.data.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-emerald-900">{r.receipt_no}</TableCell>
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
                    ))}
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
                  <CardTitle className="text-base font-bold text-slate-900">Notifications & Society Notices</CardTitle>
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
                <CardTitle className="text-base font-bold text-slate-900">Member Profile & Contact Details</CardTitle>
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

      {/* Hidden print area for 1-click receipt printing */}
      {printReceipt && <ReceiptPrintArea receipt={printReceipt} />}
    </>
  );
}

/* =========================================================================
   ADMIN / SUPER ADMIN DASHBOARD
   ========================================================================= */
function AdminDashboard({ user }: { user: User | null }) {
  const isSuperAdmin = user?.role?.name === 'super_admin';

  const { data: trx } = useGetTransactionsQuery();
  const { data: notifs } = useGetNotificationsQuery();
  const { data: users } = useGetUsersQuery(undefined, { skip: !isSuperAdmin });

  const unread = notifs?.data.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Role: <span className="font-semibold text-emerald-800 capitalize">{user?.role?.name?.replace(/_/g, ' ') || 'Admin'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/transactions">
            <Button className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm">
              <CalendarCheck className="h-4 w-4" /> Create & Assign Dues
            </Button>
          </Link>
          {isSuperAdmin && (
            <Link href="/dashboard/users">
              <Button variant="outline" className="flex items-center gap-2 cursor-pointer border-slate-200">
                <Users className="h-4 w-4" /> Manage Users
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-slate-900">{trx?.meta?.total ?? 0}</CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ledger Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">BDT {trx?.summary?.page_total ?? 0}</CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-slate-900">{users?.meta?.total ?? users?.data?.length ?? 0}</CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-slate-900">
              {unread > 0 ? <Badge variant="destructive">{unread} new</Badge> : 'All read'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Management & Operations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/transactions" className="block group">
            <Card className="h-full border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CalendarCheck className="h-6 w-6 text-emerald-700" />
                  <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-base text-slate-900 pt-2">Billing & Payment Assignment</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Create monthly payments by selecting months & amounts, or assign one-time dues to members.
              </CardContent>
            </Card>
          </Link>

          {isSuperAdmin && (
            <Link href="/dashboard/users" className="block group">
              <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Users className="h-6 w-6 text-slate-700" />
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="text-base text-slate-900 pt-2">User Management</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600">
                  Create new members, assign roles, manage status, and edit member profiles.
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href="/dashboard/reports" className="block group">
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <FileText className="h-6 w-6 text-slate-700" />
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-base text-slate-900 pt-2">Financial Reports</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Generate printable date-filtered ledger summaries and export official PDF statements.
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
