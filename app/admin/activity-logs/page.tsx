'use client';

import React, { useState, useMemo } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetActivityLogsQuery } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  Search,
  RefreshCw,
  Filter,
  Eye,
  Calendar,
  Globe,
  Database,
  User as UserIcon,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { ActivityLog } from '@/types';

export default function AdminActivityLogsPage() {
  return (
    <RoleGate roles={['super_admin']}>
      <ActivityLogsContent />
    </RoleGate>
  );
}

function ActivityLogsContent() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  // Selected Log for Deep Inspection Modal
  const [inspectingLog, setInspectingLog] = useState<ActivityLog | null>(null);

  const { data, isLoading, isFetching, refetch } = useGetActivityLogsQuery(
    {
      page,
      per_page: perPage,
      search: search.trim() || undefined,
      action: actionFilter || undefined,
      table_name: tableFilter || undefined,
    },
    { pollingInterval: 15000 }
  );

  const logsList: ActivityLog[] = useMemo(() => {
    return data?.data || [];
  }, [data]);

  const meta = data?.meta;

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('');
    setTableFilter('');
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('create') || act.includes('store') || act.includes('add')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
          <Plus className="h-3 w-3 text-emerald-600" />
          <span className="capitalize">{action}</span>
        </span>
      );
    }
    if (act.includes('update') || act.includes('edit') || act.includes('modify')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs">
          <Pencil className="h-3 w-3 text-blue-600" />
          <span className="capitalize">{action}</span>
        </span>
      );
    }
    if (act.includes('delete') || act.includes('destroy') || act.includes('remove')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
          <Trash2 className="h-3 w-3 text-rose-600" />
          <span className="capitalize">{action}</span>
        </span>
      );
    }
    if (act.includes('collect') || act.includes('paid') || act.includes('settle')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-400 shadow-2xs">
          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
          <span className="capitalize">{action.replace(/_/g, ' ')}</span>
        </span>
      );
    }
    if (act.includes('reject') || act.includes('decline') || act.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
          <XCircle className="h-3 w-3 text-amber-600" />
          <span className="capitalize">{action.replace(/_/g, ' ')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
        <Activity className="h-3 w-3 text-slate-500" />
        <span className="capitalize">{action.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  const getTableBadge = (tableName: string) => {
    const table = (tableName || '').toLowerCase();
    let bg = 'bg-slate-100 text-slate-800 border-slate-200';
    if (table.includes('transaction')) bg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
    if (table.includes('receipt')) bg = 'bg-teal-50 text-teal-900 border-teal-200';
    if (table.includes('user') || table.includes('member')) bg = 'bg-purple-50 text-purple-900 border-purple-200';
    if (table.includes('setting')) bg = 'bg-amber-50 text-amber-900 border-amber-200';
    if (table.includes('profile_share')) bg = 'bg-indigo-50 text-indigo-900 border-indigo-200';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${bg}`}>
        <Database className="h-3 w-3 opacity-70" />
        <span>{tableName}</span>
      </span>
    );
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-emerald-700" />
            System Activity Logs &amp; Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time chronological record of administrative actions, billing changes, user modifications, and system events.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {meta && (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-mono font-bold text-xs px-3 py-1.5 shadow-2xs">
              {meta.total.toLocaleString()} Total Events
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="cursor-pointer gap-1.5 h-9 text-xs font-bold border-slate-300 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-700' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Logs'}</span>
          </Button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search user, action, IP, table..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-white text-xs sm:text-sm h-10 rounded-xl"
              />
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-slate-300 rounded-xl px-3 h-10 text-xs sm:text-sm bg-white font-medium text-slate-800"
              >
                <option value="">All Actions</option>
                <option value="create">Create / Insert</option>
                <option value="update">Update / Modify</option>
                <option value="delete">Delete / Remove</option>
                <option value="collect_payment">Collect Payment</option>
                <option value="reject_slip">Reject Slip</option>
                <option value="assign_role">Assign Role</option>
              </select>
            </div>

            {/* Table / Module Filter */}
            <div>
              <select
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-slate-300 rounded-xl px-3 h-10 text-xs sm:text-sm bg-white font-medium text-slate-800"
              >
                <option value="">All Tables / Modules</option>
                <option value="transactions">Transactions (transactions)</option>
                <option value="receipts">Receipts (receipts)</option>
                <option value="users">Users &amp; Members (users)</option>
                <option value="settings">Settings (settings)</option>
                <option value="profile_shares">Merged Accounts (profile_shares)</option>
                <option value="roles">Roles &amp; Permissions (roles)</option>
                <option value="fdrs">FDR Deposits (fdrs)</option>
                <option value="meeting_expenses">Meeting Expenses</option>
              </select>
            </div>

            {/* Per Page & Reset */}
            <div className="flex items-center gap-2">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-slate-300 rounded-xl px-2.5 h-10 text-xs bg-white font-semibold text-slate-700"
              >
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              {(search || actionFilter || tableFilter) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 h-10 px-3 cursor-pointer font-bold rounded-xl"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIVITY LOGS DATA TABLE */}
      <Card className="border-slate-200 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-slate-800">
              <TableRow className="text-xs font-extrabold uppercase tracking-wider">
                <TableHead className="py-3.5 px-4 text-slate-900 font-extrabold">Operator / User</TableHead>
                <TableHead className="py-3.5 px-4 text-slate-900 font-extrabold">Action Performed</TableHead>
                <TableHead className="py-3.5 px-4 text-slate-900 font-extrabold">Target Entity</TableHead>
                <TableHead className="py-3.5 px-4 text-slate-900 font-extrabold">Client IP Address</TableHead>
                <TableHead className="py-3.5 px-4 text-slate-900 font-extrabold">Timestamp</TableHead>
                <TableHead className="py-3.5 px-4 text-right text-slate-900 font-extrabold">Inspection</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
                      <span className="text-sm font-semibold">Loading system audit logs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && logsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Activity className="h-10 w-10 text-slate-300" />
                      <p className="text-base font-bold text-slate-800">No Activity Logs Found</p>
                      <p className="text-xs text-slate-400">
                        No system activity events matched your search filters. Try adjusting your parameters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                logsList.map((log) => {
                  const userName =
                    typeof log.user === 'object' && log.user?.name
                      ? log.user.name
                      : typeof log.user === 'string'
                      ? log.user
                      : log.user_name || 'System Operator';

                  const userRole =
                    typeof log.user === 'object' && log.user?.role
                      ? log.user.role
                      : 'Super Admin';

                  const userEmail =
                    typeof log.user === 'object' && log.user?.email
                      ? log.user.email
                      : undefined;

                  return (
                    <TableRow
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs sm:text-sm"
                    >
                      {/* Operator User */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200 shrink-0 shadow-2xs">
                            {userName ? userName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{userName}</span>
                              {userRole && (
                                <Badge variant="secondary" className="capitalize text-[10px] py-0 px-1.5 font-bold">
                                  {userRole.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            {userEmail && (
                              <span className="text-[11px] text-slate-400 font-mono block">
                                {userEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-3 px-4">
                        {getActionBadge(log.action)}
                      </TableCell>

                      {/* Target Entity */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getTableBadge(log.table_name)}
                          {log.record_id && (
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              #{log.record_id}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* IP Address */}
                      <TableCell className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                          <Globe className="h-3 w-3 text-slate-400" />
                          {log.ip_address || '127.0.0.1'}
                        </span>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="py-3 px-4">
                        <div>
                          <span className="font-semibold text-slate-800 text-xs block font-mono">
                            {formatDate(log.created_at)}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Inspection Action */}
                      <TableCell className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingLog(log)}
                          className="h-8 px-2.5 text-xs font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer shadow-2xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PAGINATION */}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination meta={meta} page={page} onPageChange={setPage} />
        </div>
      )}

      {/* AUDIT LOG DEEP INSPECTION MODAL */}
      <Dialog open={!!inspectingLog} onOpenChange={(open) => !open && setInspectingLog(null)}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-700" />
              Activity Audit Log #{inspectingLog?.id}
            </DialogTitle>
          </DialogHeader>

          {inspectingLog && (
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-slate-500 text-xs block font-medium">Operator / User:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {typeof inspectingLog.user === 'object' && inspectingLog.user?.name
                      ? inspectingLog.user.name
                      : inspectingLog.user_name || 'System Operator'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-xs block font-medium">Action:</span>
                  <div className="mt-0.5">{getActionBadge(inspectingLog.action)}</div>
                </div>

                <div>
                  <span className="text-slate-500 text-xs block font-medium">Target Table / ID:</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                    {inspectingLog.table_name} #{inspectingLog.record_id || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-xs block font-medium">IP Address:</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {inspectingLog.ip_address || '127.0.0.1'}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-500 text-xs block font-medium">Timestamp:</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(inspectingLog.created_at)}
                  </span>
                </div>
              </div>

              {/* Payload Comparison (Old Values vs New Values) */}
              {(inspectingLog.old_values || inspectingLog.new_values) ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-emerald-700" />
                    Database Payload Changes
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inspectingLog.old_values && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                          Previous Values (Old)
                        </span>
                        <pre className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto max-h-48 scrollbar-thin">
                          {JSON.stringify(inspectingLog.old_values, null, 2)}
                        </pre>
                      </div>
                    )}

                    {inspectingLog.new_values && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Updated Values (New)
                        </span>
                        <pre className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto max-h-48 scrollbar-thin">
                          {JSON.stringify(inspectingLog.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-xs text-center italic">
                  No structural old/new payload diff captured for this direct system event.
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInspectingLog(null)}
                  className="rounded-xl px-5 text-xs font-bold cursor-pointer"
                >
                  Close Inspection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
