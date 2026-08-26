'use client';
import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetSettingsQuery, useUpdateSettingMutation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminSettingsPage() {
  return (
    <RoleGate roles={['super_admin', 'admin']}>
      <SettingsContent />
    </RoleGate>
  );
}

function SettingsContent() {
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSetting, { error }] = useUpdateSettingMutation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const save = async (key: string, current: string) => {
    try {
      setSuccessMsg(null);
      await updateSetting({ setting_key: key, setting_value: values[key] ?? current }).unwrap();
      setSuccessMsg(`Setting '${key}' updated successfully!`);
    } catch {}
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings &amp; Payment Amounts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure default monthly subscription dues, admission fees, and society values.</p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-50 text-emerald-800 text-sm border border-emerald-200">
          {successMsg}
        </div>
      )}
      {(error as any)?.data?.message && (
        <p className="text-sm text-red-600">{(error as any).data.message}</p>
      )}
      {isLoading && <p className="text-slate-500">Loading settings...</p>}
      {(Array.isArray(settings) ? settings : (settings as any)?.data || []).map((s: any) => (
        <Card key={s.id} className="border-slate-200 shadow-2xs">
          <CardHeader><CardTitle className="text-base text-slate-900 font-bold">{s.setting_key}</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-slate-600">{s.description || 'Value'}</Label>
              <Input defaultValue={s.setting_value} onChange={(e) => setValues((v) => ({ ...v, [s.setting_key]: e.target.value }))} className="mt-1 bg-white" />
            </div>
            <Button onClick={() => save(s.setting_key, s.setting_value)} className="bg-emerald-700 hover:bg-emerald-800 cursor-pointer">Save</Button>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-slate-500">Note: Only Super Admin or an Admin with explicit payment permission can save changes.</p>
    </div>
  );
}
