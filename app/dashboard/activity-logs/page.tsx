'use client';
import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetActivityLogsQuery } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetActivityLogsQuery({ page });

  return (
    <RoleGate roles={['super_admin']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6">Loading logs...</TableCell></TableRow>}
                {!isLoading && (!data?.data || data.data.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">No activity logs recorded yet.</TableCell></TableRow>
                )}
                {data?.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.user ?? 'System'}</TableCell>
                    <TableCell className="capitalize">{log.action}</TableCell>
                    <TableCell>{log.table_name} #{log.record_id}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{log.ip_address}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{log.created_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
      </div>
    </RoleGate>
  );
}
