'use client';
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, User as UserIcon } from 'lucide-react';

export default function MemberProfilePage() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Member Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Your official society registration details, member identification, and share contributions.
        </p>
      </div>

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border border-emerald-200 shadow-inner">
              {user?.name?.slice(0, 2).toUpperCase() || 'MB'}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">{user?.name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ID: {user?.member_profile?.member_no ?? 'Unassigned'}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-semibold text-emerald-700">Active Member</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block font-medium">Email Address</span>
              <span className="font-semibold text-slate-900 block mt-1 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" /> {user?.email}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block font-medium">Contact Phone</span>
              <span className="font-semibold text-slate-900 block mt-1 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-emerald-600" /> {user?.member_profile?.phone ?? 'Not provided'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block font-medium">Share Capital</span>
              <span className="font-bold text-emerald-900 block mt-1 text-base font-mono">
                BDT {Number(user?.member_profile?.share_amount || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block font-medium">Society Status</span>
              <span className="font-semibold text-emerald-700 block mt-1">
                {user?.is_active ? 'Active & Good Standing' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 block font-medium">Registered Address</span>
            <span className="font-medium text-slate-800 block mt-1 flex items-start gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              {user?.member_profile?.address ?? 'No address registered with the society.'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
