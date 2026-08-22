'use client';
import React, { useState } from 'react';
import { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetNotificationsQuery({ page });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAllRead().unwrap()}>Mark all as read</Button>
      </div>

      {isLoading && <p className="text-slate-500">Loading notifications...</p>}
      {data?.data.length === 0 && <p className="text-slate-500 text-sm">No notifications found.</p>}
      {data?.data.map((n) => (
        <Card key={n.id} className={n.is_read ? 'opacity-60 bg-slate-50' : 'bg-white'}>
          <CardContent className="py-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{n.title}</span>
                <Badge variant="outline" className="capitalize">{n.type}</Badge>
              </div>
              <p className="text-sm text-slate-600 mt-1">{n.message}</p>
              <p className="text-xs text-slate-400 mt-2">{n.created_at}</p>
            </div>
            {!n.is_read && <Button size="sm" variant="outline" onClick={() => markRead(n.id).unwrap()}>Mark read</Button>}
          </CardContent>
        </Card>
      ))}

      <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
    </div>
  );
}
