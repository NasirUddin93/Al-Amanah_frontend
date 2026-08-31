'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bell,
  Receipt,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function AccountsNotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetNotificationsQuery({ page }, { pollingInterval: 4000 });
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllReadMutation();

  const getIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <Receipt className="h-5 w-5 text-emerald-600" />;
      case 'payment':
      case 'payment_due':
        return <CalendarCheck className="h-5 w-5 text-blue-600" />;
      case 'transaction':
        return <ShieldCheck className="h-5 w-5 text-indigo-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const unreadCount = data?.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Accounts Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-600 text-white font-bold text-xs">{unreadCount} New</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time alerts for submitted member receipt slips, dues collections, and audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/accounts/receipts">
            <Button variant="outline" size="sm" className="text-xs font-semibold border-slate-200 cursor-pointer">
              <Receipt className="h-4 w-4 text-emerald-700 mr-1.5" /> Review Receipts
            </Button>
          </Link>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isMarkingAll}
              onClick={() => markAllRead().unwrap()}
              className="text-xs font-semibold cursor-pointer border-slate-200 hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4 text-slate-600 mr-1" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-slate-500 text-sm">Checking for latest notifications...</p>}
      {data?.data.length === 0 && !isLoading && (
        <div className="bg-white p-8 text-center rounded-xl border border-slate-200">
          <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 font-semibold text-sm">No notifications found.</p>
          <p className="text-slate-400 text-xs mt-0.5">When members submit receipt slips or payments, alerts will appear here in real time.</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.data.map((n) => {
          const isReceiptAlert = n.type === 'receipt' || n.title?.toLowerCase().includes('slip') || n.title?.toLowerCase().includes('receipt');

          return (
            <Card
              key={n.id}
              className={`transition-all ${
                n.is_read
                  ? 'bg-slate-50/70 border-slate-200'
                  : 'bg-white border-emerald-200 shadow-2xs hover:border-emerald-300'
              }`}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 border ${
                    n.is_read ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${n.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {n.title}
                      </span>
                      <Badge variant="outline" className="capitalize text-[10px] font-mono border-slate-200">
                        {n.type?.replace(/_/g, ' ')}
                      </Badge>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${n.is_read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(n.created_at)}
                      </span>
                      {isReceiptAlert && (
                        <Link
                          href="/accounts/receipts"
                          className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          Verify in Receipts <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!n.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markRead(n.id).unwrap()}
                    className="cursor-pointer text-xs shrink-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
    </div>
  );
}
