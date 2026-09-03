'use client';
import React, { useState } from 'react';
import { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/components/language-context';
import { MEMBER_TRANSLATIONS } from '@/lib/member-translations';

export default function MemberNotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetNotificationsQuery({ page });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const { lang, isBn } = useLanguage();
  const t = MEMBER_TRANSLATIONS[lang];

  const unreadCount = data?.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.notifications.pageTitle}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.notifications.pageSub}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead().unwrap()} className="cursor-pointer gap-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t.notifications.btnMarkAllRead}
          </Button>
        )}
      </div>

      {isLoading && <p className="text-slate-500 text-xs">{t.notifications.loading}</p>}
      {data?.data.length === 0 && !isLoading && <p className="text-slate-500 text-sm">{t.notifications.empty}</p>}
      {data?.data.map((n) => (
        <Card key={n.id} className={n.is_read ? 'opacity-60 bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-2xs'}>
          <CardContent className="py-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{n.title}</span>
                <Badge variant="outline" className="capitalize text-[10px]">{n.type}</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                {new Date(n.created_at).toLocaleString(isBn ? 'bn-BD' : 'en-US')}
              </p>
            </div>
            {!n.is_read && (
              <Button size="sm" variant="outline" onClick={() => markRead(n.id).unwrap()} className="cursor-pointer text-xs shrink-0">
                {t.notifications.btnMarkRead}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
    </div>
  );
}
