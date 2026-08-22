'use client';
import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { useGetSettingsQuery, useUpdateSettingMutation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
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
      <h1 className="text-2xl font-bold text-slate-900">Settings (Payment Values)</h1>
      {successMsg && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
          {successMsg}
        </div>
      )}
      {(error as any)?.data?.message && (
        <p className="text-sm text-red-600">{(error as any).data.message}</p>
      )}
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {(Array.isArray(settings) ? settings : (settings as any)?.data || []).map((s: any) => (
        <Card key={s.id}>
          <CardHeader><CardTitle className="text-base text-slate-800">{s.setting_key}</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1">
              <Label>{s.description || 'Value'}</Label>
              <Input defaultValue={s.setting_value} onChange={(e) => setValues((v) => ({ ...v, [s.setting_key]: e.target.value }))} className="mt-1" />
            </div>
            <Button onClick={() => save(s.setting_key, s.setting_value)}>Save</Button>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-slate-500">Note: Only Super Admin or an Admin with explicit payment permission can save changes.</p>
    </div>
  );
}
