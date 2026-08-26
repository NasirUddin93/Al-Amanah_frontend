'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleGate } from '@/components/role-gate';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation, useGetRolesQuery } from '@/lib/api';
import { userSchema } from '@/lib/schemas';
import type { User } from '@/types';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Sparkles,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role_id: '',
  designation: '',
  can_change_payment: false,
  member_no: '',
  phone: '',
};

const PREFIX_SUGGESTIONS = ['AMN-', 'ADM-', 'ACC-', 'MEM-', '2026-'];

export default function AdminUsersPage() {
  return (
    <RoleGate roles={['super_admin']}>
      <UsersContent />
    </RoleGate>
  );
}

function UsersContent() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useGetUsersQuery({
    page,
    per_page: perPage,
    search: search || undefined,
    role_id: selectedRoleFilter ? Number(selectedRoleFilter) : undefined,
    status: selectedStatusFilter || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const { data: roles } = useGetRolesQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [customPrefix, setCustomPrefix] = useState('AMN-');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyForm,
  });

  const selectedRoleId = watch('role_id');
  const selectedRole = roles?.find((r) => String(r.id) === String(selectedRoleId));

  const isAdminRole = selectedRole?.name === 'admin' || (editing?.role?.name === 'super_admin' && selectedRole?.name === 'super_admin');

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60 inline ml-1 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-700 font-bold inline ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-700 font-bold inline ml-1" />
    );
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedRoleFilter('');
    setSelectedStatusFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const isFiltered = search !== '' || selectedRoleFilter !== '' || selectedStatusFilter !== '' || sortBy !== 'created_at' || sortOrder !== 'desc';

  const generateMemberIdWithPrefix = (prefixToUse?: string) => {
    const p = prefixToUse !== undefined ? prefixToUse : customPrefix;
    const num = Math.floor(1000 + Math.random() * 9000);
    const cleanPrefix = p.trim();
    const formatted = cleanPrefix === '' || cleanPrefix.endsWith('-') || cleanPrefix.endsWith('/') || cleanPrefix.endsWith('_')
      ? `${cleanPrefix}${num}`
      : `${cleanPrefix}-${num}`;
    setValue('member_no', formatted);
  };

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setCustomPrefix('AMN-');
    const memberRole = roles?.find((r) => r.name === 'member');
    if (memberRole) {
      setValue('role_id', String(memberRole.id));
    }
    const num = Math.floor(1000 + Math.random() * 9000);
    setValue('member_no', `AMN-${num}`);
    setOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    const existingNo = user.member_profile?.member_no || '';
    if (existingNo.includes('-')) {
      const parts = existingNo.split('-');
      setCustomPrefix(`${parts[0]}-`);
    } else {
      setCustomPrefix('AMN-');
    }

    reset({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role?.id ? String(user.role.id) : '',
      designation: user.designation ?? '',
      can_change_payment: Boolean(user.can_change_payment),
      member_no: existingNo || `AMN-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: user.member_profile?.phone ?? '',
    });
    setOpen(true);
  };

  const onSubmit = async (values: any) => {
    const roleId = Number(values.role_id);
    const roleObj = roles?.find((r) => r.id === roleId);
    const isAdmin = roleObj?.name === 'admin';

    const body: any = {
      name: values.name,
      email: values.email,
      role_id: roleId,
      designation: isAdmin ? (values.designation || null) : null,
      can_change_payment: isAdmin ? Boolean(values.can_change_payment) : false,
      profile: {
        member_no: values.member_no || undefined,
        phone: values.phone || undefined,
      },
    };

    if (values.password) {
      body.password = values.password;
    }

    try {
      if (editing) {
        await updateUser({ id: editing.id, body }).unwrap();
      } else {
        await createUser(body).unwrap();
      }
      setOpen(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to save user.');
    }
  };

  const onDelete = async (id: number) => {
    if (confirm('Delete this user (soft delete)?')) {
      try {
        await deleteUser(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to delete user.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage society members, administrators, roles, contact info, and system permissions.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-emerald-700" />
            Filter &amp; Search Users
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search name, email, phone, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-slate-50 border-slate-200 text-sm h-9"
            />
          </div>

          <div>
            <select
              value={selectedRoleFilter}
              onChange={(e) => { setSelectedRoleFilter(e.target.value); setPage(1); }}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-slate-50 h-9 text-slate-700 font-medium cursor-pointer"
            >
              <option value="">All Roles</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => { setSelectedStatusFilter(e.target.value); setPage(1); }}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-slate-50 h-9 text-slate-700 font-medium cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500 font-medium px-2">
            Total Results: <b className="ml-1 text-slate-900">{data?.meta?.total ?? data?.data?.length ?? 0}</b>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead
                  onClick={() => handleSort('name')}
                  className="cursor-pointer select-none group font-bold text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center">
                    User / ID {renderSortIcon('name')}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('email')}
                  className="cursor-pointer select-none group font-bold text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center">
                    Contact Details {renderSortIcon('email')}
                  </div>
                </TableHead>

                <TableHead className="font-bold text-slate-900">Role &amp; Permissions</TableHead>

                <TableHead
                  onClick={() => handleSort('designation')}
                  className="cursor-pointer select-none group font-bold text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center">
                    Designation {renderSortIcon('designation')}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('created_at')}
                  className="cursor-pointer select-none group font-bold text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center">
                    Created / Updated {renderSortIcon('created_at')}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('is_active')}
                  className="cursor-pointer select-none group font-bold text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('is_active')}
                  </div>
                </TableHead>

                <TableHead className="text-right font-bold text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {data?.data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No users found matching your filters.
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((user) => {
                const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                const updatedDate = user.updated_at ? new Date(user.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

                return (
                  <TableRow key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-semibold text-slate-900 text-sm">{user.name}</span>
                        {user.member_profile?.member_no ? (
                          <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shadow-2xs">
                            ID: {user.member_profile.member_no}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No ID</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-emerald-700 inline shrink-0" />
                          {user.member_profile?.phone || <span className="text-slate-400 italic">No phone</span>}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400 inline shrink-0" />
                          {user.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="secondary" className="capitalize text-xs font-semibold">
                          {user.role?.name?.replace(/_/g, ' ') || 'Member'}
                        </Badge>
                        {user.role?.name === 'admin' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border flex items-center gap-1 ${
                            user.can_change_payment
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {user.can_change_payment ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Price Edit Allowed
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-3 w-3 text-slate-400" />
                                Price Edit Restricted
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {user.designation ? (
                        <span className="font-semibold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {user.designation}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                        <span><span className="text-slate-400 font-medium">Created:</span> {createdDate}</span>
                        {updatedDate && updatedDate !== createdDate && (
                          <span className="text-[11px] text-slate-400 font-medium"><span>Updated:</span> {updatedDate}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)} className="cursor-pointer">
                        Edit
                      </Button>
                      {user.role?.name !== 'super_admin' && (
                        <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)} className="cursor-pointer">
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        meta={data?.meta}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      {/* User Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit User: ${editing.name}` : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-2">
            <div>
              <Label>Full Name</Label>
              <Input placeholder="Full Name" {...register('name')} className="bg-white mt-1" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{String(errors.name.message)}</p>}
            </div>

            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="email@example.com" {...register('email')} className="bg-white mt-1" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{String(errors.email.message)}</p>}
            </div>

            <div>
              <Label>Password {editing && '(leave blank to keep current password)'}</Label>
              <Input type="password" placeholder="••••••••" {...register('password')} className="bg-white mt-1" />
              {errors.password && !editing && <p className="text-xs text-red-600 mt-1">{String(errors.password.message)}</p>}
            </div>

            <div>
              <Label>Role</Label>
              <select className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white mt-1" {...register('role_id')}>
                <option value="">Select role</option>
                {roles
                  ?.filter((r) => {
                    if (r.name === 'super_admin') {
                      return editing?.role?.name === 'super_admin';
                    }
                    return true;
                  })
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
              </select>
              {errors.role_id && <p className="text-xs text-red-600 mt-1">{String(errors.role_id.message)}</p>}
            </div>

            {isAdminRole && (
              <div className="space-y-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-md">
                <div className="space-y-1">
                  <Label className="text-emerald-950 font-semibold">Official Designation (Admin Only)</Label>
                  <Input placeholder="e.g. President, General Secretary, Vice President" {...register('designation')} className="bg-white" />
                  <p className="text-[11px] text-emerald-800">Administrative title for official society documentation and signatures.</p>
                </div>

                {selectedRole?.name !== 'super_admin' && (
                  <div className="p-3 bg-white rounded-md border border-emerald-200/80 space-y-1">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="can_change_payment"
                        {...register('can_change_payment')}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="can_change_payment" className="text-xs cursor-pointer select-none">
                        <span className="font-bold text-slate-900 block">Allow Modifying Price / Payment Values</span>
                        <span className="text-slate-500 block mt-0.5 leading-relaxed">
                          Allow this Admin to edit default subscription amounts and fees in <b>Settings</b>. If unchecked, this admin can only view settings.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="font-semibold text-slate-800">Assign ID</Label>
                  <button
                    type="button"
                    onClick={() => generateMemberIdWithPrefix()}
                    className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Re-Generate
                  </button>
                </div>

                <div className="space-y-2 mb-2 p-2.5 bg-white rounded-md border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">Custom ID Prefix:</span>
                    <div className="flex items-center gap-1">
                      {PREFIX_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setCustomPrefix(sug);
                            generateMemberIdWithPrefix(sug);
                          }}
                          className={`px-1.5 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                            customPrefix === sug
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="w-32">
                      <Input
                        placeholder="Prefix (e.g. AMN-)"
                        value={customPrefix}
                        onChange={(e) => {
                          setCustomPrefix(e.target.value);
                        }}
                        className="bg-slate-50 font-mono text-xs h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Generated ID (e.g. AMN-0001)"
                        {...register('member_no')}
                        className="bg-white font-mono font-semibold text-slate-900 text-sm h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => generateMemberIdWithPrefix()}
                      className="h-9 px-3 shrink-0 cursor-pointer text-xs font-semibold"
                    >
                      Apply Prefix
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Assigned user identification code across all society activities and receipts.
                </p>
              </div>

              <div>
                <Label>Contact Phone Number</Label>
                <Input placeholder="+8801XXXXXXXXX" {...register('phone')} className="bg-white mt-1" />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="cursor-pointer bg-emerald-700 hover:bg-emerald-800">
                {isCreating || isUpdating ? 'Saving...' : editing ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
