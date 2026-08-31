'use client';
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetTransactionsQuery, useGetProfileSharesQuery } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HeartHandshake, Link2, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { ProfileShare } from '@/types';

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: trx, isLoading } = useGetTransactionsQuery();
  const { data: profileSharesData } = useGetProfileSharesQuery();

  const profileSharesList: ProfileShare[] = Array.isArray(profileSharesData)
    ? profileSharesData
    : (profileSharesData as any)?.data || [];

  const activeFamilyShares = profileSharesList.filter((s) => s.status === 'active');

  const linkedMembersMap = new Map<number, any>();
  activeFamilyShares.forEach((s) => {
    const other = s.primary_user_id === user?.id ? s.shared_user : s.primary_user;
    if (other && other.id !== user?.id && !linkedMembersMap.has(other.id)) {
      linkedMembersMap.set(other.id, other);
    }
  });
  const linkedMembersList = Array.from(linkedMembersMap.values());

  const activeGroupName = activeFamilyShares.find((s) => Boolean(s.group_name))?.group_name;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View your society profile details, member status, linked family accounts, and transaction records.
        </p>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base text-slate-800 font-bold">Profile &amp; Membership Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-4">
          <div><span className="text-slate-500 font-medium">Full Name:</span> <span className="font-bold text-slate-900 ml-1">{user?.name}</span></div>
          <div><span className="text-slate-500 font-medium">Email Address:</span> <span className="font-medium text-slate-900 ml-1">{user?.email}</span></div>
          <div>
            <span className="text-slate-500 font-medium">Member ID:</span>{' '}
            <span className="font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded ml-1 text-xs">
              {user?.member_profile?.member_no ?? '-'}
            </span>
          </div>
          <div><span className="text-slate-500 font-medium">Contact Phone:</span> <span className="font-mono font-medium text-slate-900 ml-1">{user?.member_profile?.phone ?? '-'}</span></div>
          <div>
            <span className="text-slate-500 font-medium">Share Capital:</span>{' '}
            <span className="font-mono font-bold text-emerald-950 ml-1">
              BDT {Number(user?.member_profile?.share_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div><span className="text-slate-500 font-medium">Physical Address:</span> <span className="font-medium text-slate-900 ml-1">{user?.member_profile?.address ?? '-'}</span></div>
        </CardContent>
      </Card>

      {/* Merged Family Accounts Section */}
      <Card className="border-purple-200 shadow-xs bg-gradient-to-br from-purple-50/40 via-white to-slate-50">
        <CardHeader className="border-b border-purple-100 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-purple-700" />
              <CardTitle className="text-base text-purple-950 font-bold">
                {activeGroupName ? `Merged Group: ${activeGroupName}` : 'Merged Member Accounts & Shared Access'}
              </CardTitle>
            </div>
            {linkedMembersList.length > 0 && (
              <Badge className="bg-purple-700 text-white font-bold text-xs">
                {linkedMembersList.length} {linkedMembersList.length === 1 ? 'Linked Member' : 'Linked Members'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {linkedMembersList.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-2">
              No member accounts are currently merged with your profile. Merging is managed by society administrators.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-white rounded-xl border border-purple-200/80 text-xs text-slate-700 space-y-1 shadow-2xs">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>Shared Account Privileges Active:</span>
                </div>
                <p>
                  You and your linked member(s) have dual access to view combined transaction receipts, dues demand notices, and society ledger reports. Any member in the group can clear dues on behalf of each other.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedMembersList.map((otherUser: any) => (
                  <div
                    key={otherUser.id}
                    className="p-4 bg-white rounded-xl border border-purple-200 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-sm shrink-0 border border-purple-300">
                      {otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">{otherUser?.name || 'Member'}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {otherUser?.member_no && (
                          <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                            ID: {otherUser.member_no}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Active Merged Account</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base text-slate-800 font-bold">My Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Transaction No</TableHead>
                <TableHead className="font-bold text-slate-900">Type</TableHead>
                <TableHead className="font-bold text-slate-900">Amount</TableHead>
                <TableHead className="font-bold text-slate-900">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-6">Loading...</TableCell></TableRow>}
              {trx?.data?.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">No transactions recorded yet.</TableCell></TableRow>
              )}
              {trx?.data?.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-medium font-mono text-xs">{t.transaction_no}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs font-semibold">{t.type}</Badge></TableCell>
                  <TableCell className="font-bold text-emerald-950 font-mono text-sm">
                    BDT {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{t.transaction_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
