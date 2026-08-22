'use client';
import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import {
  useGetRolesQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from '@/lib/api';
import type { Role, Permission } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, Trash2, Edit3 } from 'lucide-react';

export default function RolesPage() {
  return (
    <RoleGate roles={['super_admin']}>
      <RolesContent />
    </RoleGate>
  );
}

function RolesContent() {
  const { data: roles, isLoading: rolesLoading } = useGetRolesQuery();
  const { data: allPermissions, isLoading: permsLoading } = useGetPermissionsQuery();

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedPermIds([]);
    setFormError(null);
    setOpenDialog(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setSelectedPermIds(role.permissions?.map((p) => p.id) || []);
    setFormError(null);
    setOpenDialog(true);
  };

  const togglePermission = (id: number) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!roleName.trim()) {
      setFormError('Role name is required.');
      return;
    }

    try {
      if (editingRole) {
        await updateRole({
          id: editingRole.id,
          body: {
            name: roleName,
            description: roleDesc,
            permissions: selectedPermIds,
          },
        }).unwrap();
      } else {
        await createRole({
          name: roleName,
          description: roleDesc,
          permissions: selectedPermIds,
        }).unwrap();
      }
      setOpenDialog(false);
    } catch (err: any) {
      setFormError(err?.data?.message || 'Failed to save role.');
    }
  };

  const handleDelete = async (role: Role) => {
    if (['super_admin', 'admin', 'member'].includes(role.name)) {
      alert('System default roles cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to delete role '${role.name}'?`)) {
      try {
        await deleteRole(role.id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to delete role.');
      }
    }
  };

  // Group permissions by module
  const permsByModule = (allPermissions || []).reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const isSystemRole = (name: string) => ['super_admin', 'admin', 'member'].includes(name);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define administrative roles, assign granular permissions, and control member access.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add New Role
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28 text-center">Users</TableHead>
                <TableHead>Assigned Permissions</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolesLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Loading roles...
                  </TableCell>
                </TableRow>
              )}
              {roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{role.name.replace(/_/g, ' ')}</span>
                      {isSystemRole(role.name) && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          System
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {role.description || <span className="text-slate-400 italic">No description</span>}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    <Badge variant="outline">{role.users_count ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5 max-w-lg">
                      {role.permissions && role.permissions.length > 0 ? (
                        role.permissions.map((p) => (
                          <Badge
                            key={p.id}
                            className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs hover:bg-emerald-100"
                          >
                            {p.module}:{p.action}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(role)}
                      className="cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {!isSystemRole(role.name) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        className="cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Role Modal */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? `Edit Role: ${editingRole.name}` : 'Add New Role'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <Label>Role Identifier Name</Label>
              <Input
                placeholder="e.g. branch_manager, field_officer, auditor"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={editingRole ? isSystemRole(editingRole.name) : false}
                className="bg-white"
              />
              <p className="text-xs text-slate-500">
                Lowercase letters and underscores recommended (e.g. `auditor`).
              </p>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="Brief summary of responsibilities..."
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-bold text-slate-900 block">
                Assign Module Permissions
              </Label>

              {permsLoading && <p className="text-sm text-slate-500">Loading available permissions...</p>}

              <div className="space-y-3">
                {Object.entries(permsByModule).map(([module, perms]) => (
                  <Card key={module} className="border-slate-200">
                    <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {module} module
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 px-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const checked = selectedPermIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.id)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            <span>
                              <span className="font-semibold capitalize">{p.action}</span>
                              {p.description && (
                                <span className="block text-[11px] text-slate-500 font-normal">
                                  {p.description}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="cursor-pointer">
                {isCreating || isUpdating ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
