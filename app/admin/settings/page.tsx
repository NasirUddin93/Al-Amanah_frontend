'use client';

import React, { useState, useEffect } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetSettingsQuery, useUpdateSettingMutation, useGetUsersQuery } from '@/lib/api';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Settings,
  CalendarCheck,
  CreditCard,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  Building2,
  Users,
  Save,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <RoleGate roles={['super_admin', 'admin']}>
      <SettingsContent />
    </RoleGate>
  );
}

function SettingsContent() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = currentUser?.role?.name === 'super_admin';
  const canChangePayment = isSuperAdmin || Boolean(currentUser?.can_change_payment);

  const { data: settingsData, isLoading: loadingSettings, refetch: refetchSettings } = useGetSettingsQuery();
  const { data: usersData } = useGetUsersQuery({ per_page: 500 });
  const [updateSetting, { isLoading: isUpdating }] = useUpdateSettingMutation();

  const membersCount = usersData?.data?.filter((u) => u.role?.name === 'member').length || 0;

  // Extract settings array
  const settingsList = Array.isArray(settingsData)
    ? settingsData
    : (settingsData as any)?.data || [];

  // Values state
  const [monthlySubValue, setMonthlySubValue] = useState<string>('2000');
  const [oneTimeValue, setOneTimeValue] = useState<string>('3000');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial values from settings API
  useEffect(() => {
    if (settingsList.length > 0) {
      const monthly =
        settingsList.find((s: any) => s.setting_key === 'monthly_subscription_default')?.setting_value ||
        settingsList.find((s: any) => s.setting_key === 'payment_amount_1')?.setting_value;
      if (monthly) setMonthlySubValue(monthly);

      const oneTime =
        settingsList.find((s: any) => s.setting_key === 'one_time_payment_default')?.setting_value ||
        settingsList.find((s: any) => s.setting_key === 'payment_amount_2')?.setting_value;
      if (oneTime) setOneTimeValue(oneTime);
    }
  }, [settingsList]);

  const handleSaveSetting = async (key: string, value: string, title: string) => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    try {
      setSavingKey(key);
      setErrorMsg(null);
      setSuccessMsg(null);

      await updateSetting({
        setting_key: key,
        setting_value: String(num),
      }).unwrap();

      refetchSettings();
      setSuccessMsg(`Default value for "${title}" saved successfully as BDT ${num.toLocaleString()}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to update setting. Check your permissions.');
    } finally {
      setSavingKey(null);
    }
  };

  const monthlyPresets = ['1500', '2000', '2500', '3000', '5000'];
  const oneTimePresets = ['1000', '2000', '3000', '5000', '10000'];

  const estMonthlyTotal = (Number(monthlySubValue) || 0) * membersCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-emerald-700" />
            Society Financial Settings &amp; Default Dues
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system default amounts for monthly subscription dues batches, 1-time payments, and billing generation.
          </p>
        </div>

        <div>
          {canChangePayment ? (
            <Badge className="bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 gap-1.5 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Authorized to Change Amounts</span>
            </Badge>
          ) : (
            <Badge variant="destructive" className="font-bold px-3 py-1.5 gap-1.5 shadow-2xs">
              <AlertCircle className="h-4 w-4" />
              <span>Read-Only Access</span>
            </Badge>
          )}
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 text-sm font-semibold border border-emerald-200 flex items-center gap-2.5 shadow-2xs animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 text-red-900 text-sm font-semibold border border-red-200 flex items-center gap-2.5 shadow-2xs animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ESTIMATED MONTHLY REVENUE BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white p-5 sm:p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <TrendingUp className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
              Estimated Monthly Dues Projection
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono mt-0.5">
              BDT {estMonthlyTotal.toLocaleString()}{' '}
              <span className="text-xs font-normal text-emerald-200">/ month</span>
            </div>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-emerald-100 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-300" />
          <span>
            <b>{membersCount} Active Members</b> &times; BDT {Number(monthlySubValue || 0).toLocaleString()} default
          </span>
        </div>
      </div>

      {/* MAIN SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: MONTHLY SUBSCRIPTION DEFAULT */}
        <Card className="border-slate-200 rounded-2xl shadow-xs overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                  <CalendarCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Monthly Subscription Default
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Auto-filled when creating monthly billing demand batches
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono font-bold text-xs">
                Monthly
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-800 block mb-1.5">
                Default Monthly Amount (BDT)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  BDT
                </span>
                <Input
                  type="number"
                  step="100"
                  min="1"
                  value={monthlySubValue}
                  onChange={(e) => setMonthlySubValue(e.target.value)}
                  disabled={!canChangePayment || isUpdating}
                  className="pl-14 font-mono font-extrabold text-base sm:text-lg h-11 bg-white rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-slate-900"
                  placeholder="2000"
                />
              </div>
            </div>

            {/* Quick Presets */}
            {canChangePayment && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Amount Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {monthlyPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMonthlySubValue(preset)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        monthlySubValue === preset
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      BDT {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Key: <code className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded font-mono">monthly_subscription_default</code>
              </span>

              <Button
                type="button"
                disabled={!canChangePayment || isUpdating}
                onClick={() =>
                  handleSaveSetting(
                    'monthly_subscription_default',
                    monthlySubValue,
                    'Monthly Subscription'
                  )
                }
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 px-5 text-xs rounded-xl shadow-xs cursor-pointer gap-1.5"
              >
                {savingKey === 'monthly_subscription_default' ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Monthly Dues</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: 1-TIME PAYMENT / ADMISSION DEFAULT */}
        <Card className="border-slate-200 rounded-2xl shadow-xs overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold border border-purple-200">
                  <CreditCard className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    1-Time Payment Default
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Auto-filled for admission fees, special fund demands &amp; levies
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-mono font-bold text-xs">
                One-Time
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-800 block mb-1.5">
                Default 1-Time Amount (BDT)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  BDT
                </span>
                <Input
                  type="number"
                  step="100"
                  min="1"
                  value={oneTimeValue}
                  onChange={(e) => setOneTimeValue(e.target.value)}
                  disabled={!canChangePayment || isUpdating}
                  className="pl-14 font-mono font-extrabold text-base sm:text-lg h-11 bg-white rounded-xl border-slate-300 focus:border-purple-500 focus:ring-purple-500 text-slate-900"
                  placeholder="3000"
                />
              </div>
            </div>

            {/* Quick Presets */}
            {canChangePayment && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Amount Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {oneTimePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOneTimeValue(preset)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        oneTimeValue === preset
                          ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      BDT {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Key: <code className="text-purple-800 font-bold bg-purple-50 px-1.5 py-0.5 rounded font-mono">one_time_payment_default</code>
              </span>

              <Button
                type="button"
                disabled={!canChangePayment || isUpdating}
                onClick={() =>
                  handleSaveSetting(
                    'one_time_payment_default',
                    oneTimeValue,
                    '1-Time Payment'
                  )
                }
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold h-10 px-5 text-xs rounded-xl shadow-xs cursor-pointer gap-1.5"
              >
                {savingKey === 'one_time_payment_default' ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save 1-Time Amount</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ADDITIONAL SETTINGS INFO ACCORDION / NOTE */}
      <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-600 space-y-2">
        <div className="font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-700" />
          <span>How Payment Default Values Work</span>
        </div>
        <p className="leading-relaxed">
          Whenever you open <b>Create / Assign Payment Dues</b> in Receipts or Transactions, selecting <b>Monthly Payment</b> will automatically prefill with your configured Monthly Subscription amount, while selecting <b>One-Time Payment</b> will prefill with the 1-Time payment value.
        </p>
        <p className="text-slate-500 text-xs">
          Changes take effect immediately across all billing generator interfaces.
        </p>
      </div>
    </div>
  );
}
