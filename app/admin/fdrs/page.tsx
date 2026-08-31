'use client';

import React from 'react';
import Link from 'next/link';
import { RoleGate } from '@/components/role-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PiggyBank,
  Clock,
  Sparkles,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';

export default function AdminFdrsPage() {
  return (
    <RoleGate roles={['super_admin', 'admin']}>
      <FdrUnavailableContent />
    </RoleGate>
  );
}

function FdrUnavailableContent() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <PiggyBank className="h-7 w-7 text-amber-600" />
              Fixed Deposit Receipts (FDR)
            </h1>
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold uppercase text-[10px] tracking-wider">
              Not Available Yet
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Term deposit certificates, maturity tracking, and society long-term investment accounts.
          </p>
        </div>

        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer text-xs font-bold rounded-xl h-9">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* HERO COMING SOON CARD */}
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center space-y-6">
          {/* Animated Icon Avatar */}
          <div className="relative">
            <div className="h-24 w-24 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-md">
              <PiggyBank className="h-12 w-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              FDR Module is Under Development
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              The <b>Fixed Deposit Receipts (FDR)</b> module is not available yet in the current release of the Al-Amanah system. Our development team is currently building and testing this feature.
            </p>
          </div>

          {/* UPCOMING CAPABILITIES LIST */}
          <div className="w-full max-w-xl bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 text-left space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>What this module will include when launched</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Term Certificate Records</span>
                  <span className="text-[11px] text-slate-500">1-Year, 3-Year &amp; 5-Year fixed deposit tenures.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Maturity &amp; Profit Calculator</span>
                  <span className="text-[11px] text-slate-500">Automated accrual and maturity date alerts.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Official PDF Certificates</span>
                  <span className="text-[11px] text-slate-500">Download and print verified member certificates.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Audit &amp; Security Logs</span>
                  <span className="text-[11px] text-slate-500">Full audit trail of renewals and liquidations.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/admin">
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11 px-6 rounded-xl cursor-pointer shadow-md text-xs sm:text-sm gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </Button>
            </Link>

            <Link href="/admin/transactions">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold h-11 px-6 rounded-xl cursor-pointer text-xs sm:text-sm">
                <span>View Billing &amp; Demands</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
