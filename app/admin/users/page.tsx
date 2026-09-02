'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleGate } from '@/components/role-gate';
import { useAppSelector } from '@/store/hooks';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useAssignPaymentPermissionMutation,
  useGetProfileSharesQuery,
  useCreateProfileShareMutation,
  useUpdateProfileShareMutation,
  useDeleteProfileShareMutation,
} from '@/lib/api';
import { userSchema } from '@/lib/schemas';
import type { User, ProfileShare } from '@/types';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getSecurePhotoUrl } from '@/lib/utils';
import { SecureImage, fetchSecureBlobUrl } from '@/components/secure-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Sparkles,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  ShieldCheck,
  Ban,
  Phone,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RotateCcw,
  Search,
  Eye,
  Upload,
  Image as ImageIcon,
  Trash2,
  MapPin,
  Maximize2,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Link2,
  Unlink,
  HeartHandshake,
  Users2,
  UserCheck,
  Pencil,
  Check,
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
  address: '',
  id_photo: '',
  id_photos: [],
};

const PREFIX_SUGGESTIONS = ['AMN-', 'ADM-', 'ACC-', 'MEM-', '2026-'];

interface MergedGroup {
  id: string;
  name?: string;
  memberIds: number[];
  shareIds: number[];
  members: User[];
}

function computeMergedGroups(shares: ProfileShare[], allMembers: User[]): MergedGroup[] {
  const adjacency = new Map<number, Set<number>>();
  const shareMap = new Map<string, number>();
  const memberMap = new Map<number, User>();

  allMembers.forEach((m) => memberMap.set(m.id, m));

  shares.forEach((s) => {
    if (s.status !== 'active') return;
    const p = s.primary_user_id || s.primary_user?.id;
    const sh = s.shared_user_id || s.shared_user?.id;
    if (!p || !sh) return;

    if (!adjacency.has(p)) adjacency.set(p, new Set());
    if (!adjacency.has(sh)) adjacency.set(sh, new Set());
    adjacency.get(p)!.add(sh);
    adjacency.get(sh)!.add(p);

    const key = `${Math.min(p, sh)}-${Math.max(p, sh)}`;
    shareMap.set(key, s.id);

    if (s.primary_user && !memberMap.has(p)) memberMap.set(p, s.primary_user as any);
    if (s.shared_user && !memberMap.has(sh)) memberMap.set(sh, s.shared_user as any);
  });

  const visited = new Set<number>();
  const groups: MergedGroup[] = [];

  for (const startId of adjacency.keys()) {
    if (visited.has(startId)) continue;

    const clusterIds: number[] = [];
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      clusterIds.push(curr);

      for (const neighbor of adjacency.get(curr) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (clusterIds.length >= 2) {
      const clusterShares: number[] = [];
      for (let i = 0; i < clusterIds.length; i++) {
        for (let j = i + 1; j < clusterIds.length; j++) {
          const key = `${Math.min(clusterIds[i], clusterIds[j])}-${Math.max(clusterIds[i], clusterIds[j])}`;
          if (shareMap.has(key)) {
            clusterShares.push(shareMap.get(key)!);
          }
        }
      }

      const clusterMembers = clusterIds
        .map((id) => memberMap.get(id))
        .filter((u): u is User => Boolean(u));

      const foundShareWithName = shares.find(
        (s) =>
          (clusterIds.includes(s.primary_user_id || 0) || clusterIds.includes(s.shared_user_id || 0)) &&
          Boolean(s.group_name)
      );
      const groupName = foundShareWithName?.group_name || undefined;

      groups.push({
        id: clusterIds.sort((a, b) => a - b).join('-'),
        name: groupName,
        memberIds: clusterIds,
        shareIds: clusterShares,
        members: clusterMembers,
      });
    }
  }

  return groups;
}

function getConnectedMembers(userId: number, shares: ProfileShare[], allMembers: User[]): User[] {
  const groups = computeMergedGroups(shares, allMembers);
  const found = groups.find((g) => g.memberIds.includes(userId));
  if (!found) return [];
  return found.members.filter((m) => m.id !== userId);
}

export default function AdminUsersPage() {
  return (
    <RoleGate roles={['super_admin', 'admin']}>
      <UsersContent />
    </RoleGate>
  );
}

function UsersContent() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const isSuperAdmin = currentUser?.role?.name === 'super_admin';

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
  const [assignPaymentPermission] = useAssignPaymentPermissionMutation();
  const [togglingPermissionId, setTogglingPermissionId] = useState<number | null>(null);

  // Profile Shares / Merged Accounts State
  const { data: profileSharesData } = useGetProfileSharesQuery();
  const profileSharesList: ProfileShare[] = Array.isArray(profileSharesData)
    ? profileSharesData
    : (profileSharesData as any)?.data || [];

  const [createProfileShare, { isLoading: isLinking }] = useCreateProfileShareMutation();
  const [updateProfileShare] = useUpdateProfileShareMutation();
  const [deleteProfileShare, { isLoading: isDeletingShare }] = useDeleteProfileShareMutation();

  const [openMergeModal, setOpenMergeModal] = useState(false);
  const [mergeTab, setMergeTab] = useState<'link' | 'list'>('link');
  const [mergeSelectedMemberIds, setMergeSelectedMemberIds] = useState<number[]>([]);
  const [mergeGroupName, setMergeGroupName] = useState<string>('');
  const [mergeMemberSearch, setMergeMemberSearch] = useState<string>('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupNameInput, setEditGroupNameInput] = useState<string>('');
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);

  // All users for select options (filtered to members only for merging)
  const { data: allUsersData } = useGetUsersQuery({ per_page: 250 });
  const allUsersList = allUsersData?.data || [];
  const membersOnlyList = allUsersList.filter((u) => u.role?.name === 'member');
  const mergedGroups = computeMergedGroups(profileSharesList, allUsersList);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [viewPhotoIndex, setViewPhotoIndex] = useState(0);
  const [customPrefix, setCustomPrefix] = useState('AMN-');
  const [idPhotosList, setIdPhotosList] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Enlarged Photo Lightbox Gallery State
  const [zoomPhotosList, setZoomPhotosList] = useState<string[]>([]);
  const [zoomPhotoIndex, setZoomPhotoIndex] = useState<number>(0);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  const openEnlargeModal = (photos: string[], startIndex: number = 0) => {
    if (!photos || photos.length === 0) return;
    setZoomPhotosList(photos);
    const validIndex = startIndex >= 0 && startIndex < photos.length ? startIndex : 0;
    setZoomPhotoIndex(validIndex);
    setZoomPhotoUrl(photos[validIndex] || photos[0]);
  };

  const handleNextZoomPhoto = React.useCallback(() => {
    if (zoomPhotosList.length <= 1) return;
    setZoomPhotoIndex((prev) => {
      const nextIdx = (prev + 1) % zoomPhotosList.length;
      setZoomPhotoUrl(zoomPhotosList[nextIdx]);
      return nextIdx;
    });
  }, [zoomPhotosList]);

  const handlePrevZoomPhoto = React.useCallback(() => {
    if (zoomPhotosList.length <= 1) return;
    setZoomPhotoIndex((prev) => {
      const prevIdx = (prev - 1 + zoomPhotosList.length) % zoomPhotosList.length;
      setZoomPhotoUrl(zoomPhotosList[prevIdx]);
      return prevIdx;
    });
  }, [zoomPhotosList]);

  React.useEffect(() => {
    if (!zoomPhotoUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextZoomPhoto();
      } else if (e.key === 'ArrowLeft') {
        handlePrevZoomPhoto();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomPhotoUrl, handleNextZoomPhoto, handlePrevZoomPhoto]);

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

  const handleMultiplePhotosPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newPhotos: string[] = [];

    fileList.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 10MB limit and was skipped.`);
        loadedCount++;
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          newPhotos.push(dataUrl);
        }
        loadedCount++;
        if (loadedCount === fileList.length) {
          setIdPhotosList((prev) => {
            const combined = [...prev, ...newPhotos];
            setValue('id_photos', combined);
            setValue('id_photo', combined[0] || '');
            return combined;
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhotoAtIndex = (index: number) => {
    setIdPhotosList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activePhotoIndex >= updated.length) {
        setActivePhotoIndex(Math.max(0, updated.length - 1));
      }
      setValue('id_photos', updated);
      setValue('id_photo', updated[0] || '');
      return updated;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setIdPhotosList([]);
    setActivePhotoIndex(0);
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

    let existingPhotos: string[] = [];
    if (user.member_profile?.id_photos && user.member_profile.id_photos.length > 0) {
      existingPhotos = [...user.member_profile.id_photos];
    } else if (user.member_profile?.id_photo) {
      existingPhotos = [user.member_profile.id_photo];
    }
    existingPhotos = existingPhotos.map((p) => getSecurePhotoUrl(p, token));

    setIdPhotosList(existingPhotos);
    setActivePhotoIndex(0);

    reset({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role?.id ? String(user.role.id) : '',
      designation: user.designation ?? '',
      can_change_payment: Boolean(user.can_change_payment),
      member_no: existingNo || `AMN-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: user.member_profile?.phone ?? '',
      address: user.member_profile?.address ?? '',
      id_photo: existingPhotos[0] || '',
      id_photos: existingPhotos,
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
        address: values.address || undefined,
        id_photos: idPhotosList,
        id_photo: idPhotosList[0] || undefined,
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

  const handleToggleAdminTransactionPermission = async (targetUser: User, newAllowed: boolean) => {
    setTogglingPermissionId(targetUser.id);
    try {
      await assignPaymentPermission({
        admin_user_id: targetUser.id,
        can_change_payment: newAllowed,
      }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update transaction creation permission.');
    } finally {
      setTogglingPermissionId(null);
    }
  };

  const openMergeForMember = (memberId: number) => {
    const existingGroup = mergedGroups.find((g) => g.memberIds.includes(memberId));
    if (existingGroup) {
      setMergeSelectedMemberIds([...existingGroup.memberIds]);
      setMergeGroupName(existingGroup.name || '');
    } else {
      setMergeSelectedMemberIds([memberId]);
      setMergeGroupName('');
    }
    setMergeTab('link');
    setOpenMergeModal(true);
  };

  const handleToggleMemberSelection = (memberId: number) => {
    setMergeSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleLinkAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeSelectedMemberIds.length < 2) {
      alert('Please select at least 2 members to merge into a joint group.');
      return;
    }

    const selectedUsers = allUsersList.filter((u) => mergeSelectedMemberIds.includes(u.id));
    const nonMember = selectedUsers.find((u) => u.role?.name !== 'member');
    if (nonMember) {
      alert(`User "${nonMember.name}" is not a Member. Account merging is strictly for Society Members.`);
      return;
    }

    try {
      await createProfileShare({
        member_ids: mergeSelectedMemberIds,
        group_name: mergeGroupName.trim() || undefined,
        status: 'active',
      }).unwrap();
      alert(`Successfully merged ${mergeSelectedMemberIds.length} member accounts! All members in this group can now view each other's reports and pay dues on behalf of one another.`);
      setMergeTab('list');
      setMergeSelectedMemberIds([]);
      setMergeGroupName('');
      setMergeMemberSearch('');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to merge member accounts.');
    }
  };

  const handleSaveGroupName = async (group: MergedGroup, newName: string) => {
    if (group.shareIds.length === 0) return;
    setIsSavingGroupName(true);
    try {
      await updateProfileShare({
        id: group.shareIds[0],
        group_name: newName.trim(),
      }).unwrap();
      setEditingGroupId(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update group name.');
    } finally {
      setIsSavingGroupName(false);
    }
  };

  const handleUnlinkShare = async (shareId: number) => {
    if (confirm('Are you sure you want to unlink this account link?')) {
      try {
        await deleteProfileShare(shareId).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to unlink account.');
      }
    }
  };

  const handleUnlinkMemberFromGroup = async (group: MergedGroup, memberId: number) => {
    const member = group.members.find((m) => m.id === memberId);
    if (!confirm(`Are you sure you want to remove ${member?.name || 'this member'} from the merged group?`)) return;

    const sharesToDelete = profileSharesList.filter(
      (s) =>
        ((s.primary_user_id === memberId || s.shared_user_id === memberId) ||
         (s.primary_user?.id === memberId || s.shared_user?.id === memberId)) &&
        (group.shareIds.includes(s.id) ||
         (group.memberIds.includes(s.primary_user_id || 0) && group.memberIds.includes(s.shared_user_id || 0)))
    );

    try {
      for (const s of sharesToDelete) {
        await deleteProfileShare(s.id).unwrap();
      }
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to remove member from group.');
    }
  };

  const handleUnlinkEntireGroup = async (group: MergedGroup) => {
    if (!confirm(`Are you sure you want to completely disband this merged group of ${group.members.length} members?`)) return;

    try {
      for (const shareId of group.shareIds) {
        await deleteProfileShare(shareId).unwrap();
      }
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to disband merged group.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage society members, administrators, member family account merges, contact info, and permissions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => {
              setMergeSelectedMemberIds([]);
              setMergeGroupName('');
              setMergeTab('link');
              setOpenMergeModal(true);
            }}
            variant="outline"
            className="flex items-center gap-2 cursor-pointer border-purple-300 text-purple-900 bg-purple-50/70 hover:bg-purple-100 hover:text-purple-950 font-bold shadow-2xs"
          >
            <Link2 className="h-4 w-4 text-purple-700" />
            <span>Merge Member Accounts</span>
            {mergedGroups.length > 0 && (
              <span className="bg-purple-700 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {mergedGroups.length} {mergedGroups.length === 1 ? 'group' : 'groups'}
              </span>
            )}
          </Button>

          {isSuperAdmin && (
            <Button onClick={openCreate} className="flex items-center gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 shadow-sm">
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          )}
        </div>
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
                const photoCount = user.member_profile?.id_photos?.length || (user.member_profile?.id_photo ? 1 : 0);

                return (
                  <TableRow key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.member_profile?.id_photo ? (
                          <div
                            className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-emerald-300 shadow-2xs cursor-pointer group"
                            onClick={() => {
                              setViewingUser(user);
                              setViewPhotoIndex(0);
                            }}
                            title="Click to view full details & photos"
                          >
                            <SecureImage
                              src={user.member_profile.id_photo}
                              alt={user.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                              fallback={
                                <div className="h-full w-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              }
                            />
                            {photoCount > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-bold text-white px-1 py-0.2 rounded-tl-sm">
                                +{photoCount - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm shadow-2xs">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="font-semibold text-slate-900 text-sm leading-tight">{user.name}</span>
                          {user.member_profile?.member_no ? (
                            <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shadow-2xs">
                              ID: {user.member_profile.member_no}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No ID</span>
                          )}

                          {/* Merged / Linked Family Profile Badge (Members Only) */}
                          {user.role?.name === 'member' && (() => {
                            const connected = getConnectedMembers(user.id, profileSharesList, allUsersList);
                            if (connected.length === 0) return null;
                            const currentGroup = mergedGroups.find((g) => g.memberIds.includes(user.id));

                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMergeForMember(user.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-purple-100 shadow-2xs"
                                  title={
                                    currentGroup?.name
                                      ? `Group: ${currentGroup.name} (${connected.length + 1} Members)`
                                      : `Merged Group with: ${connected.map((c) => c.name).join(', ')}. Click to manage.`
                                  }
                                >
                                  <Link2 className="h-2.5 w-2.5 text-purple-700 shrink-0" />
                                  <span>
                                    {currentGroup?.name
                                      ? `${currentGroup.name} (${connected.length + 1})`
                                      : connected.length === 1
                                      ? `Linked: ${connected[0].name} ${connected[0].member_profile?.member_no ? `#${connected[0].member_profile.member_no}` : ''}`
                                      : `Linked Group (${connected.length + 1} Members)`}
                                  </span>
                                </span>
                              </div>
                            );
                          })()}
                        </div>
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
                        {user.role?.name === 'super_admin' ? (
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 capitalize text-xs font-bold shadow-2xs">
                              Super Admin
                            </Badge>
                            <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-600" /> Full Access
                            </span>
                          </div>
                        ) : user.role?.name === 'admin' ? (
                          <Badge variant="secondary" className="capitalize text-xs font-bold bg-slate-100 text-slate-800 border-slate-300">
                            Admin
                          </Badge>
                        ) : user.role?.name === 'accountant' ? (
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge variant="secondary" className="capitalize text-xs font-semibold">
                              Accountant
                            </Badge>
                            <span className="text-[10px] text-blue-700 font-medium">
                              Audit &amp; Settle Only
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="capitalize text-xs font-medium text-slate-700">
                            Member
                          </Badge>
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

                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {user.role?.name === 'admin' && (
                          isSuperAdmin ? (
                            <button
                              type="button"
                              disabled={togglingPermissionId === user.id}
                              onClick={() => handleToggleAdminTransactionPermission(user, !user.can_change_payment)}
                              className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-bold border transition-all shadow-2xs cursor-pointer select-none ${
                                user.can_change_payment
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                                  : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100 hover:border-red-300'
                              }`}
                              title={
                                user.can_change_payment
                                  ? 'Click to Revoke Admin Transaction Creation Permission'
                                  : 'Click to Grant Admin Transaction Creation Permission'
                              }
                            >
                              {togglingPermissionId === user.id ? (
                                <span className="text-[10px] text-slate-500 font-medium animate-pulse">Updating...</span>
                              ) : user.can_change_payment ? (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>Can Create Trx</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  <span>Trx Restricted</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 h-8 rounded-lg text-xs font-medium border ${
                                user.can_change_payment
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {user.can_change_payment ? (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>Can Create Trx</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>Trx Restricted</span>
                                </>
                              )}
                            </span>
                          )
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingUser(user);
                            setViewPhotoIndex(0);
                          }}
                          className="cursor-pointer text-xs font-semibold gap-1 text-emerald-800 border-emerald-300 hover:bg-emerald-50 h-8 px-2.5"
                          title="View Detailed User Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Details</span>
                        </Button>
                        {user.role?.name === 'member' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMergeForMember(user.id)}
                            className="cursor-pointer text-xs font-semibold gap-1 text-purple-800 border-purple-300 hover:bg-purple-50 h-8 px-2.5"
                            title="Merge this member with other member accounts"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            <span>Merge</span>
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEdit(user)} className="cursor-pointer h-8 px-2.5 text-xs">
                              Edit
                            </Button>
                            {user.role?.name !== 'super_admin' && (
                              <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)} className="cursor-pointer h-8 px-2.5 text-xs">
                                Delete
                              </Button>
                            )}
                          </>
                        )}
                      </div>
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

      {/* USER DETAILED VIEW MODAL */}
      <Dialog
        open={!!viewingUser}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingUser(null);
            setViewPhotoIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-full p-0 overflow-hidden max-h-[92vh] flex flex-col md:flex-row border border-slate-200 shadow-2xl rounded-3xl bg-white">
          {viewingUser && (() => {
            const rawPhotos: string[] = viewingUser.member_profile?.id_photos?.length
              ? viewingUser.member_profile.id_photos
              : viewingUser.member_profile?.id_photo
              ? [viewingUser.member_profile.id_photo]
              : [];
            const userPhotos: string[] = rawPhotos.map((p) => getSecurePhotoUrl(p, token));
            const currentPhoto = userPhotos[viewPhotoIndex] || userPhotos[0];

            return (
              <>
                {/* LEFT SIDE: ONLY FULL HEIGHT PIC AS CONTAINER */}
                <div className="w-full md:w-[420px] lg:w-[480px] shrink-0 bg-slate-950 relative flex flex-col justify-between overflow-hidden min-h-[380px] md:min-h-[640px]">
                  {currentPhoto ? (
                    <>
                      {/* Background ambient blur effect */}
                      <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-2xl opacity-40 scale-125 pointer-events-none"
                        style={{ backgroundImage: `url(${currentPhoto})` }}
                      />

                      {/* Full-Height Image */}
                      <SecureImage
                        src={currentPhoto}
                        alt={`${viewingUser.name} document ${viewPhotoIndex + 1}`}
                        className="relative z-0 w-full h-full object-contain p-4 md:p-6 transition-all duration-300 drop-shadow-2xl"
                      />

                      {/* Top Overlay Controls */}
                      <div className="relative z-10 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
                        <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wider bg-emerald-700/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {userPhotos.length > 1 ? `Photo ${viewPhotoIndex + 1} of ${userPhotos.length}` : 'Official Document'}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEnlargeModal(userPhotos, viewPhotoIndex)}
                          className="h-8 md:h-9 text-xs md:text-sm px-3.5 gap-1.5 bg-white/95 hover:bg-white text-slate-900 font-bold shadow-md cursor-pointer pointer-events-auto"
                        >
                          <Maximize2 className="h-4 w-4" /> Enlarge
                        </Button>
                      </div>

                      {/* Navigation Arrows (if multiple photos) */}
                      {userPhotos.length > 1 && (
                        <div className="relative z-10 flex items-center justify-between px-3 pointer-events-none">
                          <button
                            type="button"
                            onClick={() => setViewPhotoIndex((prev) => (prev > 0 ? prev - 1 : userPhotos.length - 1))}
                            className="p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                            title="Previous photo"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewPhotoIndex((prev) => (prev < userPhotos.length - 1 ? prev + 1 : 0))}
                            className="p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                            title="Next photo"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      )}

                      {/* Bottom Overlay & Thumbnail Strip */}
                      <div className="relative z-10 p-4 md:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3">
                        {/* Multiple Thumbnail Strip */}
                        {userPhotos.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none justify-center">
                            {userPhotos.map((photo, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setViewPhotoIndex(idx)}
                                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                                  idx === viewPhotoIndex
                                    ? 'border-emerald-400 scale-110 shadow-lg ring-2 ring-emerald-400/60'
                                    : 'border-white/40 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <SecureImage src={photo} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="text-white text-center space-y-0.5">
                          <p className="text-base md:text-lg font-extrabold drop-shadow-md">{viewingUser.name}</p>
                          <p className="text-xs md:text-sm text-slate-300 font-mono drop-shadow-sm font-semibold">
                            {viewingUser.member_profile?.member_no ? `ID: ${viewingUser.member_profile.member_no}` : `System Record #${viewingUser.id}`}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-900 to-slate-950 text-white my-auto">
                      <div className="h-28 w-28 rounded-full bg-emerald-900/60 border-2 border-emerald-400/60 text-emerald-300 flex items-center justify-center font-bold text-5xl shadow-2xl mb-4">
                        {viewingUser.name ? viewingUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="text-xl font-bold text-white">{viewingUser.name}</span>
                      <span className="text-sm text-slate-400 font-mono mt-1 font-semibold">
                        {viewingUser.member_profile?.member_no ? `ID: ${viewingUser.member_profile.member_no}` : `System ID #${viewingUser.id}`}
                      </span>
                      <span className="mt-4 text-xs font-semibold text-slate-300 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                        No Documents Uploaded
                      </span>
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE: INFOS */}
                <div className="flex-1 flex flex-col justify-between p-6 md:p-8 lg:p-10 overflow-y-auto max-h-[92vh] bg-white space-y-6">
                  {/* Header */}
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <DialogTitle className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                          {viewingUser.name}
                        </DialogTitle>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs md:text-sm font-extrabold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg shadow-2xs">
                            {viewingUser.member_profile?.member_no ? `ID: ${viewingUser.member_profile.member_no}` : `ID: #${viewingUser.id}`}
                          </span>
                          <Badge variant="secondary" className="capitalize text-xs md:text-sm font-bold px-3 py-1">
                            {viewingUser.role?.name?.replace(/_/g, ' ') || 'Member'}
                          </Badge>
                          <Badge variant={viewingUser.is_active ? "default" : "destructive"} className="text-xs md:text-sm font-bold px-3 py-1">
                            {viewingUser.is_active ? 'Active Account' : 'Inactive'}
                          </Badge>
                          {userPhotos.length > 0 && (
                            <Badge variant="outline" className="text-xs md:text-sm border-emerald-300 text-emerald-800 bg-emerald-50/70 font-bold gap-1.5 px-3 py-1">
                              <ImageIcon className="h-3.5 w-3.5" /> {userPhotos.length} {userPhotos.length === 1 ? 'Document' : 'Documents'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {viewingUser.designation && (
                        <span className="text-xs md:text-sm font-bold text-slate-800 bg-slate-100 border border-slate-300 px-3.5 py-1.5 rounded-lg shadow-2xs">
                          {viewingUser.designation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Information Sections */}
                  <div className="space-y-4">
                    {/* Contact Info */}
                    <div className="p-4 md:p-5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
                      <div className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Mail className="h-4 w-4 text-emerald-700" />
                        <span>Contact &amp; Location Information</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-500 block text-xs md:text-sm font-medium">Email Address:</span>
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-1 text-sm md:text-base">
                            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                            <a href={`mailto:${viewingUser.email}`} className="text-emerald-700 hover:underline">
                              {viewingUser.email}
                            </a>
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-xs md:text-sm font-medium">Phone Number:</span>
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-1 text-sm md:text-base">
                            <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                            {viewingUser.member_profile?.phone ? (
                              <a href={`tel:${viewingUser.member_profile.phone}`} className="font-mono font-bold text-slate-800 hover:underline">
                                {viewingUser.member_profile.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400 italic font-normal">Not provided</span>
                            )}
                          </span>
                        </div>

                        <div className="col-span-1 sm:col-span-2">
                          <span className="text-slate-500 block text-xs md:text-sm font-medium">Physical / Postal Address:</span>
                          <span className="font-semibold text-slate-800 flex items-start gap-2 mt-1 text-sm md:text-base">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{viewingUser.member_profile?.address || <span className="text-slate-400 italic font-normal">No address recorded</span>}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role & Permissions + Society Records */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Role & Permissions */}
                      <div className="p-4 md:p-5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <div className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                          <ShieldAlert className="h-4 w-4 text-emerald-700" />
                          <span>Role &amp; Permissions</span>
                        </div>
                        <div className="space-y-2 text-sm md:text-base">
                          <div>
                            <span className="text-slate-500 block text-xs md:text-sm font-medium">Assigned Role:</span>
                            <span className="font-extrabold text-emerald-950 capitalize text-sm md:text-base">
                              {viewingUser.role?.name?.replace(/_/g, ' ') || 'Member'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs md:text-sm font-medium">Transaction Creation Permission:</span>
                            {viewingUser.role?.name === 'super_admin' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold text-xs md:text-sm mt-0.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Full Access (Super Admin)
                              </span>
                            ) : viewingUser.role?.name === 'admin' ? (
                              <div className="mt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={togglingPermissionId === viewingUser.id}
                                  onClick={() => handleToggleAdminTransactionPermission(viewingUser, !viewingUser.can_change_payment)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border transition-all shadow-2xs cursor-pointer ${
                                    viewingUser.can_change_payment
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                                  }`}
                                >
                                  {viewingUser.can_change_payment ? (
                                    <>
                                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span>Allowed to Create Transactions</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-4 w-4 text-red-500 shrink-0" />
                                      <span>Creation Restricted</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium text-xs md:text-sm mt-0.5">
                                Not Applicable for {viewingUser.role?.name || 'Member'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Society Record */}
                      <div className="p-4 md:p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <div className="text-xs md:text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-2">
                          <Sparkles className="h-4 w-4 text-emerald-700" />
                          <span>Society Record</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-slate-600 block text-xs md:text-sm font-medium">Share Capital Value:</span>
                            <span className="font-mono font-extrabold text-emerald-950 text-base md:text-lg">
                              BDT {Number(viewingUser.member_profile?.share_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600 block text-xs md:text-sm font-medium">Database Record:</span>
                            <span className="font-mono font-bold text-slate-800 text-sm md:text-base">#{viewingUser.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Merged Accounts / Family Linking (Members Only) */}
                    {viewingUser.role?.name === 'member' && (() => {
                      const connected = getConnectedMembers(viewingUser.id, profileSharesList, allUsersList);
                      const currentGroup = mergedGroups.find((g) => g.memberIds.includes(viewingUser.id));

                      return (
                        <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                              <HeartHandshake className="h-4 w-4 text-purple-700" />
                              <span>
                                {currentGroup?.name
                                  ? `Group: ${currentGroup.name} (${connected.length + 1} Members)`
                                  : `Merged Member Accounts (${connected.length > 0 ? `${connected.length + 1} Members` : '0 Linked'})`}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openMergeForMember(viewingUser.id)}
                              className="h-7 px-2.5 text-xs font-bold text-purple-800 border-purple-300 hover:bg-purple-100 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add / Merge Members
                            </Button>
                          </div>

                          {connected.length === 0 ? (
                            <div className="text-xs md:text-sm text-slate-500 italic py-1">
                              No other member accounts are currently merged with this profile.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {connected.map((otherUser) => (
                                <div
                                  key={otherUser.id}
                                  className="p-3 bg-white rounded-xl border border-purple-200/80 flex items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                                      {otherUser.name ? otherUser.name.charAt(0).toUpperCase() : 'M'}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs md:text-sm">
                                        {otherUser.name}{' '}
                                        {otherUser.member_profile?.member_no && (
                                          <span className="font-mono text-purple-800 font-semibold">({otherUser.member_profile.member_no})</span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-medium">
                                        Merged Member &bull; Shared Reports &amp; Dues
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                                      Active
                                    </span>
                                    {currentGroup && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleUnlinkMemberFromGroup(currentGroup, otherUser.id)}
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 cursor-pointer"
                                        title="Remove this member from merged group"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Audit Timestamps */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
                        <div>
                          <span className="text-slate-500 text-xs md:text-sm block font-medium">Account Created:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {viewingUser.created_at
                              ? new Date(viewingUser.created_at).toLocaleString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs md:text-sm block font-medium">Last Updated:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {viewingUser.updated_at
                              ? new Date(viewingUser.updated_at).toLocaleString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : 'Never updated'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setViewingUser(null);
                        setViewPhotoIndex(0);
                      }}
                      className="cursor-pointer h-11 px-6 text-sm md:text-base font-semibold rounded-xl"
                    >
                      Close
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        const u = viewingUser;
                        setViewingUser(null);
                        setViewPhotoIndex(0);
                        openEdit(u);
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer gap-2 h-11 px-6 text-sm md:text-base rounded-xl shadow-md"
                    >
                      <span>Edit This User</span>
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: MERGE / LINK MULTI-MEMBER ACCOUNTS MODAL */}
      <Dialog open={openMergeModal} onOpenChange={setOpenMergeModal}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-800/60 rounded-2xl border border-purple-400/40">
                  <HeartHandshake className="h-6 w-6 text-purple-200" />
                </div>
                <div>
                  <DialogTitle className="text-xl md:text-2xl font-black text-white">
                    Merge Member Accounts
                  </DialogTitle>
                  <p className="text-xs md:text-sm text-purple-200 mt-0.5">
                    Merge 2 or more member accounts into a joint group for shared records, dual reports, and paying dues on behalf (Members only).
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mt-6 bg-white/10 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setMergeTab('link')}
                className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  mergeTab === 'link'
                    ? 'bg-white text-purple-950 shadow-md'
                    : 'text-purple-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Plus className="h-3.5 w-3.5 inline mr-1" /> Merge Members {mergeSelectedMemberIds.length > 0 ? `(${mergeSelectedMemberIds.length} Selected)` : ''}
              </button>
              <button
                type="button"
                onClick={() => setMergeTab('list')}
                className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  mergeTab === 'list'
                    ? 'bg-white text-purple-950 shadow-md'
                    : 'text-purple-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users2 className="h-3.5 w-3.5 inline mr-1" /> Active Merged Groups ({mergedGroups.length})
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 max-h-[72vh] overflow-y-auto bg-white">
            {mergeTab === 'link' ? (
              <form onSubmit={handleLinkAccounts} className="space-y-5">
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs md:text-sm text-purple-950 space-y-1.5 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-purple-900">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>How Multi-Member Account Merging Works:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li>You can merge <strong>2, 3, 4, or more member accounts</strong> into a single joint family/group cluster.</li>
                    <li>All merged members can access each other’s transaction receipts and statement reports in their Member Portal.</li>
                    <li>Any merged member can pay society dues and upload payment slips on behalf of other members in their group.</li>
                    <li>Each member maintains their own unique Member ID, records, and login credentials.</li>
                  </ul>
                </div>

                {/* Group Name (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs md:text-sm font-bold text-slate-900">
                      Group / Family Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <span className="text-[11px] text-purple-700 font-medium">Can be added or edited later</span>
                  </div>
                  <Input
                    type="text"
                    placeholder='e.g. "Chowdhury Family", "Khan Joint Accounts" (or leave blank)'
                    value={mergeGroupName}
                    onChange={(e) => setMergeGroupName(e.target.value)}
                    className="bg-slate-50 focus:bg-white text-xs md:text-sm h-10 rounded-xl"
                  />
                </div>

                {/* Selected Members Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs md:text-sm font-bold text-slate-900">
                      Selected Members to Merge ({mergeSelectedMemberIds.length})
                    </Label>
                    {mergeSelectedMemberIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMergeSelectedMemberIds([])}
                        className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {mergeSelectedMemberIds.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500">
                      No members selected yet. Search and click on members below to add them to this merged group (Select at least 2 members).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 bg-purple-50/50 border border-purple-200 rounded-2xl min-h-[48px]">
                      {mergeSelectedMemberIds.map((id) => {
                        const member = allUsersList.find((u) => u.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 bg-white border border-purple-300 text-purple-950 px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs"
                          >
                            <span>{member?.name || `Member #${id}`}</span>
                            {member?.member_profile?.member_no && (
                              <span className="font-mono text-[10px] text-purple-700 bg-purple-100 px-1 py-0.2 rounded">
                                #{member.member_profile.member_no}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleMemberSelection(id)}
                              className="text-slate-400 hover:text-red-600 ml-0.5 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Member Search & Selection Grid */}
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800 text-xs md:text-sm">
                    Search &amp; Select Members
                  </Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search member by name, Member ID, phone, or email..."
                      value={mergeMemberSearch}
                      onChange={(e) => setMergeMemberSearch(e.target.value)}
                      className="pl-9 bg-slate-50 focus:bg-white text-xs md:text-sm h-10 rounded-xl"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                    {membersOnlyList
                      .filter((u) => {
                        if (!mergeMemberSearch) return true;
                        const q = mergeMemberSearch.toLowerCase();
                        return (
                          u.name.toLowerCase().includes(q) ||
                          (u.member_profile?.member_no || '').toLowerCase().includes(q) ||
                          (u.member_profile?.phone || '').toLowerCase().includes(q) ||
                          u.email.toLowerCase().includes(q)
                        );
                      })
                      .map((u) => {
                        const isSelected = mergeSelectedMemberIds.includes(u.id);
                        const existingGroup = mergedGroups.find((g) => g.memberIds.includes(u.id));

                        return (
                          <div
                            key={u.id}
                            onClick={() => handleToggleMemberSelection(u.id)}
                            className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-purple-100/70 hover:bg-purple-100'
                                : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent div onClick
                                className="h-4 w-4 rounded text-purple-600 border-slate-300 pointer-events-none"
                              />
                              <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs shrink-0">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'M'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs md:text-sm truncate">
                                  {u.name}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                  {u.member_profile?.member_no && (
                                    <span className="font-mono font-bold text-purple-900">
                                      ID: {u.member_profile.member_no}
                                    </span>
                                  )}
                                  {u.member_profile?.phone && (
                                    <span>Phone: {u.member_profile.phone}</span>
                                  )}
                                  {existingGroup && !isSelected && (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                                      Already in Group of {existingGroup.members.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1 rounded-lg text-xs font-bold border shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-700 text-white border-purple-700'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-purple-400'
                              }`}
                            >
                              {isSelected ? 'Selected' : '+ Add'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenMergeModal(false)}
                    className="cursor-pointer h-11 px-5 rounded-xl font-semibold text-xs md:text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLinking || mergeSelectedMemberIds.length < 2}
                    className="cursor-pointer bg-purple-700 hover:bg-purple-800 text-white font-bold h-11 px-7 rounded-xl shadow-md text-xs md:text-sm"
                  >
                    {isLinking
                      ? 'Merging...'
                      : `Confirm & Merge (${mergeSelectedMemberIds.length} Members)`}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4">
                {mergedGroups.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-3">
                    <HeartHandshake className="h-12 w-12 text-slate-300 mx-auto" />
                    <div className="text-sm font-semibold">No Merged Member Groups Found</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      There are currently no member accounts merged into joint groups.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setMergeTab('link')}
                      className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold mt-2 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Merge First Member Group
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mergedGroups.map((group, idx) => (
                      <div
                        key={group.id}
                        className="p-5 bg-slate-50/90 border border-slate-200 rounded-3xl space-y-4 shadow-2xs hover:border-purple-200 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="h-6 w-6 rounded-full bg-purple-700 text-white flex items-center justify-center font-black text-xs shrink-0">
                              {idx + 1}
                            </span>
                            {editingGroupId === group.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={editGroupNameInput}
                                  onChange={(e) => setEditGroupNameInput(e.target.value)}
                                  placeholder="Enter group name..."
                                  className="h-8 text-xs font-bold w-48 bg-white"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSaveGroupName(group, editGroupNameInput)}
                                  disabled={isSavingGroupName}
                                  className="h-8 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingGroupId(null)}
                                  className="h-8 px-2 text-xs font-semibold cursor-pointer"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-sm md:text-base">
                                  {group.name ? group.name : `Merged Group (${group.members.length} Members)`}
                                </span>
                                {group.name && (
                                  <span className="text-[11px] text-purple-800 bg-purple-100 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                                    {group.members.length} Members
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingGroupId(group.id);
                                    setEditGroupNameInput(group.name || '');
                                  }}
                                  className="text-purple-700 hover:text-purple-900 hover:bg-purple-100 p-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  title={group.name ? 'Edit group name' : 'Add group name'}
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>{group.name ? 'Rename' : '+ Add Name'}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMergeSelectedMemberIds([...group.memberIds]);
                                setMergeGroupName(group.name || '');
                                setMergeTab('link');
                              }}
                              className="h-8 px-2.5 text-xs font-bold text-purple-900 border-purple-300 hover:bg-purple-100 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add Members
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUnlinkEntireGroup(group)}
                              disabled={isDeletingShare}
                              className="h-8 px-2.5 text-xs font-semibold cursor-pointer gap-1"
                              title="Disband this entire merged group"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Disband</span>
                            </Button>
                          </div>
                        </div>

                        {/* Group Members List */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.members.map((member) => (
                            <div
                              key={member.id}
                              className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs shrink-0">
                                  {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs md:text-sm truncate">
                                    {member.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    {member.member_profile?.member_no ? `ID: ${member.member_profile.member_no}` : 'No ID'}
                                  </div>
                                </div>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUnlinkMemberFromGroup(group, member.id)}
                                disabled={isDeletingShare}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 cursor-pointer shrink-0"
                                title={`Remove ${member.name} from group`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: CREATE / EDIT USER MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-full p-0 overflow-hidden max-h-[92vh] flex flex-col md:flex-row border border-slate-200 shadow-2xl rounded-3xl bg-white">
          {/* LEFT SIDE: ONLY FULL HEIGHT PIC AS CONTAINER */}
          <div className="w-full md:w-[420px] lg:w-[480px] shrink-0 bg-slate-950 relative flex flex-col justify-between overflow-hidden min-h-[380px] md:min-h-[640px]">
            {idPhotosList.length > 0 ? (
              <>
                {/* Background ambient blur effect */}
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-2xl opacity-40 scale-125 pointer-events-none"
                  style={{ backgroundImage: `url(${idPhotosList[activePhotoIndex] || idPhotosList[0]})` }}
                />

                {/* Active Full Height Photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={idPhotosList[activePhotoIndex] || idPhotosList[0]}
                  alt="Member ID Preview"
                  className="relative z-0 w-full h-full object-contain p-4 md:p-6 transition-all duration-300 drop-shadow-2xl"
                />

                {/* Top Overlay Controls */}
                <div className="relative z-10 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
                  <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wider bg-emerald-700 px-3.5 py-1.5 rounded-full shadow flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" />
                    {idPhotosList.length > 1 ? `Photo ${activePhotoIndex + 1} of ${idPhotosList.length}` : 'ID Photo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhotoAtIndex(activePhotoIndex)}
                    className="text-xs md:text-sm text-rose-300 hover:text-white bg-rose-950/85 hover:bg-rose-900 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold cursor-pointer transition-colors shadow"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>

                {/* Prev / Next Arrows if multiple */}
                {idPhotosList.length > 1 && (
                  <div className="relative z-10 flex items-center justify-between px-3 pointer-events-none">
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : idPhotosList.length - 1))}
                      className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex((prev) => (prev < idPhotosList.length - 1 ? prev + 1 : 0))}
                      className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Bottom Overlay & Thumbnails + Add More Button */}
                <div className="relative z-10 p-4 md:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3">
                  {/* Thumbnails Row */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none justify-center">
                    {idPhotosList.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                          idx === activePhotoIndex
                            ? 'border-emerald-400 scale-110 shadow-lg ring-2 ring-emerald-400/60'
                            : 'border-white/40 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEnlargeModal(idPhotosList, activePhotoIndex)}
                      className="h-9 md:h-10 text-xs md:text-sm font-bold bg-white/90 hover:bg-white text-slate-900 cursor-pointer gap-1.5 shadow"
                    >
                      <Maximize2 className="h-4 w-4" /> Enlarge
                    </Button>

                    <label className="h-9 md:h-10 text-xs md:text-sm text-white font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 bg-emerald-700/90 hover:bg-emerald-600 rounded-lg border border-emerald-500/50 transition-colors shadow">
                      <Plus className="h-4 w-4" />
                      <span>Add More</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultiplePhotosPicked}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white transition-colors group">
                <div className="h-24 w-24 rounded-3xl bg-emerald-950/80 border-2 border-dashed border-emerald-500/60 flex flex-col items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-400 transition-all shadow-xl mb-4">
                  <Upload className="h-10 w-10 mb-1" />
                </div>
                <span className="text-base md:text-lg font-bold text-white block">Upload ID Photos / Documents</span>
                <span className="text-xs md:text-sm text-slate-300 block mt-2 max-w-[280px] leading-relaxed">
                  Select 1 or multiple images.<br />Supports Front, Back, Passport (Max 10MB each).
                </span>
                <span className="mt-5 text-xs md:text-sm font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-4 py-2 rounded-full shadow flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Browse Documents
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMultiplePhotosPicked}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* RIGHT SIDE: INFOS / FORM */}
          <div className="flex-1 flex flex-col justify-between p-6 md:p-8 lg:p-10 overflow-y-auto max-h-[92vh] bg-white space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <DialogHeader className="border-b border-slate-100 pb-3">
                <DialogTitle className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {editing ? `Edit User: ${editing.name}` : 'Add New User'}
                </DialogTitle>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Enter society member identity, role, credentials, and contact records.
                </p>
              </DialogHeader>

              {/* Form Fields Grid */}
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Full Name</Label>
                    <Input placeholder="Full Name" {...register('name')} className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl" />
                    {errors.name && <p className="text-xs md:text-sm text-red-600 mt-1">{String(errors.name.message)}</p>}
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Email Address</Label>
                    <Input type="email" placeholder="email@example.com" {...register('email')} className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl" />
                    {errors.email && <p className="text-xs md:text-sm text-red-600 mt-1">{String(errors.email.message)}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Password {editing && '(leave blank to keep current)'}</Label>
                    <Input type="password" placeholder="••••••••" {...register('password')} className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl" />
                    {errors.password && !editing && <p className="text-xs md:text-sm text-red-600 mt-1">{String(errors.password.message)}</p>}
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Role</Label>
                    <select className="w-full border border-slate-300 rounded-xl p-2 text-sm md:text-base bg-white mt-1.5 h-10 md:h-11 font-medium" {...register('role_id')}>
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
                    {errors.role_id && <p className="text-xs md:text-sm text-red-600 mt-1">{String(errors.role_id.message)}</p>}
                  </div>
                </div>

                {isAdminRole && (
                  <div className="space-y-3 p-4 md:p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                    <div className="space-y-1.5">
                      <Label className="text-emerald-950 font-bold text-xs md:text-sm">Official Designation (Admin Only)</Label>
                      <Input placeholder="e.g. President, General Secretary, Vice President" {...register('designation')} className="bg-white h-10 md:h-11 text-sm md:text-base rounded-xl" />
                    </div>

                    {selectedRole?.name !== 'super_admin' && (
                      <div className="p-3.5 bg-white rounded-xl border border-emerald-200/80 flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="can_change_payment"
                          {...register('can_change_payment')}
                          className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 h-4.5 w-4.5 cursor-pointer"
                        />
                        <label htmlFor="can_change_payment" className="text-xs md:text-sm cursor-pointer select-none">
                          <span className="font-bold text-slate-900 block text-xs md:text-sm">Allow Creating Transactions &amp; Modifying Demand Prices</span>
                          <span className="text-slate-500 block text-xs md:text-sm mt-0.5">
                            Authorizes this Admin to create individual transactions, generate payment demand batches, and configure subscription prices. (Only assigned by Super Admin).
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Member ID Generator */}
                <div className="p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-slate-800 text-xs md:text-sm">Assign Member ID</Label>
                    <button
                      type="button"
                      onClick={() => generateMemberIdWithPrefix()}
                      className="text-xs md:text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 font-bold cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" /> Re-Generate
                    </button>
                  </div>

                  <div className="flex gap-2.5 items-center">
                    <div className="w-32">
                      <Input
                        placeholder="Prefix"
                        value={customPrefix}
                        onChange={(e) => setCustomPrefix(e.target.value)}
                        className="bg-white font-mono text-xs md:text-sm h-10 md:h-11 rounded-xl"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Generated ID (e.g. AMN-0001)"
                        {...register('member_no')}
                        className="bg-white font-mono font-bold text-slate-900 text-xs md:text-sm h-10 md:h-11 rounded-xl"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => generateMemberIdWithPrefix()}
                      className="h-10 md:h-11 px-4 shrink-0 cursor-pointer text-xs md:text-sm font-bold rounded-xl"
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                {/* Phone and Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Contact Phone</Label>
                    <Input placeholder="+8801XXXXXXXXX" {...register('phone')} className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl" />
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Physical / Postal Address</Label>
                    <Input
                      placeholder="e.g. House #12, Road #4, Sector 7, Uttara"
                      {...register('address')}
                      className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer h-11 md:h-12 px-6 text-sm md:text-base font-semibold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11 md:h-12 px-7 text-sm md:text-base rounded-xl shadow-md">
                  {isCreating || isUpdating ? 'Saving...' : editing ? 'Update User' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* PHOTO ZOOM MODAL WITH SLIDER ARROWS (TOPMOST Z-INDEX) */}
      <Dialog open={!!zoomPhotoUrl} onOpenChange={(isOpen) => !isOpen && setZoomPhotoUrl(null)} className="z-[200]">
        <DialogContent className="max-w-5xl md:max-w-6xl p-4 sm:p-6 bg-slate-950/95 border border-slate-800 text-white rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/90">
            <div className="flex items-center gap-3">
              <h3 className="text-base md:text-lg font-bold text-slate-200 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-emerald-400" />
                Official Member ID Document Photo
              </h3>
              {zoomPhotosList.length > 1 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-700 text-white border border-emerald-500/50 shadow-md">
                  Page {zoomPhotoIndex + 1} of {zoomPhotosList.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative py-2 flex items-center justify-center min-h-[400px] max-h-[76vh] overflow-hidden rounded-2xl group select-none">
            {/* Previous Arrow Button */}
            {zoomPhotosList.length > 1 && (
              <button
                type="button"
                onClick={handlePrevZoomPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/75 hover:bg-emerald-700 text-white border border-white/20 shadow-2xl transition-all hover:scale-110 cursor-pointer"
                title="Previous Document (Left Arrow)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Active Full Uncropped Photo */}
            {zoomPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={zoomPhotoUrl}
                alt={`Enlarged ID Document ${zoomPhotoIndex + 1}`}
                className="max-h-[72vh] w-auto object-contain rounded-xl shadow-2xl transition-all duration-200"
              />
            )}

            {/* Next Arrow Button */}
            {zoomPhotosList.length > 1 && (
              <button
                type="button"
                onClick={handleNextZoomPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/75 hover:bg-emerald-700 text-white border border-white/20 shadow-2xl transition-all hover:scale-110 cursor-pointer"
                title="Next Document (Right Arrow)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip for Quick Navigation */}
          {zoomPhotosList.length > 1 && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2.5 overflow-x-auto py-1">
              {zoomPhotosList.map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setZoomPhotoIndex(idx);
                    setZoomPhotoUrl(photo);
                  }}
                  className={`h-12 w-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === zoomPhotoIndex
                      ? 'border-emerald-400 ring-2 ring-emerald-500/60 scale-105 opacity-100 shadow-md'
                      : 'border-slate-700 opacity-50 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
