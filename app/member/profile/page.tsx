'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RoleGate } from '@/components/role-gate';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/authSlice';
import {
  useMeQuery,
  useUpdateUserMutation,
  useGetProfileSharesQuery,
  useGetUsersQuery,
} from '@/lib/api';
import type { User, ProfileShare } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getSecurePhotoUrl } from '@/lib/utils';
import { SecureImage } from '@/components/secure-image';
import { useLanguage } from '@/components/language-context';
import { MEMBER_TRANSLATIONS } from '@/lib/member-translations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Mail,
  Phone,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  X,
  Pencil,
  HeartHandshake,
  Users2,
  Clock,
  ShieldAlert,
  Building2,
  User as UserIcon,
} from 'lucide-react';

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

export default function MemberProfilePage() {
  return (
    <RoleGate roles={['member', 'admin', 'super_admin', 'accountant']}>
      <MemberProfileContent />
    </RoleGate>
  );
}

function MemberProfileContent() {
  const { lang, isBn } = useLanguage();
  const t = MEMBER_TRANSLATIONS[lang];
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((s) => s.auth.user);
  const { data: freshUser, refetch: refetchMe } = useMeQuery(undefined, { pollingInterval: 10000 });

  const activeUser: User | null = useMemo(() => {
    return freshUser || reduxUser || null;
  }, [freshUser, reduxUser]);

  // Profile Shares / Merged Accounts State
  const { data: profileSharesData } = useGetProfileSharesQuery();
  const profileSharesList: ProfileShare[] = useMemo(() => {
    if (!profileSharesData) return [];
    return Array.isArray(profileSharesData)
      ? profileSharesData
      : (profileSharesData as any)?.data || [];
  }, [profileSharesData]);

  const { data: usersData } = useGetUsersQuery({ per_page: 500 });
  const allUsersList: User[] = useMemo(() => {
    return usersData?.data || [];
  }, [usersData]);

  const mergedGroups: MergedGroup[] = useMemo(() => {
    return computeMergedGroups(profileSharesList, allUsersList);
  }, [profileSharesList, allUsersList]);

  const connectedMembers: User[] = useMemo(() => {
    if (!activeUser?.id) return [];
    return getConnectedMembers(activeUser.id, profileSharesList, allUsersList);
  }, [activeUser, profileSharesList, allUsersList]);

  const currentMergedGroup = useMemo(() => {
    if (!activeUser?.id) return undefined;
    return mergedGroups.find((g) => g.memberIds.includes(activeUser.id));
  }, [activeUser, mergedGroups]);

  const token = useAppSelector((s) => s.auth.token);

  // User Document Photos
  const userPhotos: string[] = useMemo(() => {
    if (!activeUser) return [];
    const photos: string[] = [];
    const mainPhoto = activeUser.member_profile?.id_photo || (activeUser as any).id_photo;
    if (mainPhoto) {
      photos.push(getSecurePhotoUrl(mainPhoto, token));
    }
    const extraPhotos =
      activeUser.member_profile?.id_photos ||
      (activeUser as any).id_photos ||
      (activeUser.member_profile as any)?.documents ||
      [];
    if (Array.isArray(extraPhotos)) {
      extraPhotos.forEach((p) => {
        if (p && typeof p === 'string') {
          const secured = getSecurePhotoUrl(p, token);
          if (!photos.includes(secured)) photos.push(secured);
        }
      });
    }
    return photos;
  }, [activeUser, token]);

  const [viewPhotoIndex, setViewPhotoIndex] = useState<number>(0);

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

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [idPhotosList, setIdPhotosList] = useState<string[]>([]);
  const [editPhotoIndex, setEditPhotoIndex] = useState<number>(0);

  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      member_no: '',
    },
  });

  const openEditModal = () => {
    if (!activeUser) return;
    const existingNo = activeUser.member_profile?.member_no || (activeUser as any).memberProfile?.member_no || '';

    setIdPhotosList(userPhotos);
    setEditPhotoIndex(0);

    reset({
      name: activeUser.name,
      email: activeUser.email,
      password: '',
      phone: activeUser.member_profile?.phone || (activeUser as any).phone || '',
      address: activeUser.member_profile?.address || '',
      member_no: existingNo,
    });

    setIsEditOpen(true);
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
          setIdPhotosList((prev) => [...prev, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeEditPhotoAtIndex = (index: number) => {
    setIdPhotosList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (editPhotoIndex >= updated.length) {
        setEditPhotoIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const onEditSubmit = async (values: any) => {
    if (!activeUser) return;

    const body: any = {
      name: values.name,
      email: values.email,
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
      const updated = await updateUser({ id: activeUser.id, body }).unwrap();
      if (updated) {
        dispatch(setUser(updated));
      }
      refetchMe();
      setIsEditOpen(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update profile.');
    }
  };

  if (!activeUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  const memberNo = activeUser.member_profile?.member_no || (activeUser as any).memberProfile?.member_no || `MEM-${activeUser.id}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-emerald-700" />
            {isBn ? 'আমার অফিসিয়াল সদস্য প্রোফাইল' : 'My Official Member Profile'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBn
              ? 'আপনার প্রাতিষ্ঠানিক সদস্যপদ, পরিচয়পত্র, যোগাযোগের তথ্য এবং যৌথ অ্যাকাউন্টের বিবরণ।'
              : 'Your official society registration records, identity documentation, contact details, and joint merged accounts.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            onClick={openEditModal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer gap-2 h-10 px-5 text-xs sm:text-sm rounded-xl shadow-xs"
          >
            <Pencil className="h-4 w-4" />
            <span>{t.profile.btnEdit}</span>
          </Button>
        </div>
      </div>

      {/* MAIN PROFILE CARD (IDENTICAL PRESENTATION TO ADMIN USERS VIEW MODAL) */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT COLUMN: OFFICIAL DOCUMENT PHOTO GALLERY / CAROUSEL */}
        <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 bg-slate-950 relative flex flex-col justify-between overflow-hidden min-h-[380px] lg:min-h-[640px]">
          {userPhotos.length > 0 ? (
            <>
              {/* Background ambient blur effect */}
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-2xl opacity-40 scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${userPhotos[viewPhotoIndex] || userPhotos[0]})` }}
              />

              {/* Active Full Uncropped Photo */}
              <SecureImage
                src={userPhotos[viewPhotoIndex] || userPhotos[0]}
                alt="Member ID Document"
                className="relative z-0 w-full h-full object-contain p-4 md:p-6 transition-all duration-300 drop-shadow-2xl"
              />

              {/* Top Overlay Badge */}
              <div className="relative z-10 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
                <span className="text-xs font-bold text-white uppercase tracking-wider bg-emerald-700 px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4" />
                  {userPhotos.length > 1
                    ? isBn
                      ? `ডকুমেন্ট ${viewPhotoIndex + 1} / ${userPhotos.length}`
                      : `Document ${viewPhotoIndex + 1} of ${userPhotos.length}`
                    : isBn
                    ? 'অফিসিয়াল আইডি ডকুমেন্ট'
                    : 'Official ID Document'}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => openEnlargeModal(userPhotos, viewPhotoIndex)}
                  className="h-8 text-xs font-bold bg-white/90 hover:bg-white text-slate-900 cursor-pointer gap-1.5 shadow-md"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> {isBn ? 'বড় করে দেখুন' : 'Enlarge'}
                </Button>
              </div>

              {/* Prev / Next Controls if multiple photos */}
              {userPhotos.length > 1 && (
                <div className="relative z-10 flex items-center justify-between px-3 pointer-events-none">
                  <button
                    type="button"
                    onClick={() => setViewPhotoIndex((prev) => (prev > 0 ? prev - 1 : userPhotos.length - 1))}
                    className="p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                    title="Previous document photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewPhotoIndex((prev) => (prev < userPhotos.length - 1 ? prev + 1 : 0))}
                    className="p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                    title="Next document photo"
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
                  <p className="text-base md:text-lg font-extrabold drop-shadow-md">{activeUser.name}</p>
                  <p className="text-xs md:text-sm text-slate-300 font-mono drop-shadow-sm font-semibold">
                    ID: {memberNo}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-900 to-slate-950 text-white my-auto">
              <div className="h-28 w-28 rounded-full bg-emerald-900/60 border-2 border-emerald-400/60 text-emerald-300 flex items-center justify-center font-bold text-5xl shadow-2xl mb-4">
                {activeUser.name ? activeUser.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <span className="text-xl font-bold text-white">{activeUser.name}</span>
              <span className="text-sm text-slate-400 font-mono mt-1 font-semibold">
                ID: {memberNo}
              </span>
              <Button
                type="button"
                onClick={openEditModal}
                className="mt-5 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-md cursor-pointer gap-1.5"
              >
                <Upload className="h-4 w-4" /> Upload Document Photos
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED INFORMATIONS (IDENTICAL TO ADMIN USERS VIEW MODAL) */}
        <div className="flex-1 p-6 md:p-8 lg:p-10 space-y-6">
          {/* Header Block */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {activeUser.name}
                </h2>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs md:text-sm font-extrabold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg shadow-2xs">
                    {t.profile.memberId}: {memberNo}
                  </span>
                  <Badge variant="secondary" className="capitalize text-xs md:text-sm font-bold px-3 py-1">
                    {isBn ? 'সম্মানিত সদস্য' : activeUser.role?.name?.replace(/_/g, ' ') || 'Member'}
                  </Badge>
                  <Badge variant={activeUser.is_active ? "default" : "destructive"} className="text-xs md:text-sm font-bold px-3 py-1 bg-emerald-600 text-white">
                    {activeUser.is_active ? (isBn ? 'সক্রিয় অ্যাকাউন্ট' : 'Active Account') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                  </Badge>
                  {userPhotos.length > 0 && (
                    <Badge variant="outline" className="text-xs md:text-sm border-emerald-300 text-emerald-800 bg-emerald-50/70 font-bold gap-1.5 px-3 py-1">
                      <ImageIcon className="h-3.5 w-3.5" /> {userPhotos.length} {isBn ? 'ডকুমেন্ট' : (userPhotos.length === 1 ? 'Document' : 'Documents')}
                    </Badge>
                  )}
                </div>
              </div>
              {activeUser.designation && (
                <span className="text-xs md:text-sm font-bold text-slate-800 bg-slate-100 border border-slate-300 px-3.5 py-1.5 rounded-lg shadow-2xs">
                  {activeUser.designation}
                </span>
              )}
            </div>
          </div>

          {/* Contact & Location Information */}
          <div className="p-4 md:p-5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
            <div className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Mail className="h-4 w-4 text-emerald-700" />
              <span>{isBn ? 'যোগাযোগ ও ঠিকানার বিবরণ' : 'Contact & Location Information'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block text-xs md:text-sm font-medium">{t.profile.email}:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-1 text-sm md:text-base">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${activeUser.email}`} className="text-emerald-700 hover:underline">
                    {activeUser.email}
                  </a>
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-xs md:text-sm font-medium">{t.profile.phone}:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-1 text-sm md:text-base">
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  {activeUser.member_profile?.phone ? (
                    <a href={`tel:${activeUser.member_profile.phone}`} className="font-mono font-bold text-slate-800 hover:underline">
                      {activeUser.member_profile.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic font-normal">{isBn ? 'প্রদান করা হয়নি' : 'Not provided'}</span>
                  )}
                </span>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-slate-500 block text-xs md:text-sm font-medium">{isBn ? 'বর্তমান ও ডাক যোগাযোগের ঠিকানা:' : 'Physical / Postal Address:'}</span>
                <span className="font-semibold text-slate-800 flex items-start gap-2 mt-1 text-sm md:text-base">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{activeUser.member_profile?.address || <span className="text-slate-400 italic font-normal">{isBn ? 'কোনো ঠিকানা লিপিবদ্ধ নেই' : 'No address recorded'}</span>}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Role & Permissions + Society Records (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role & Permissions */}
            <div className="p-4 md:p-5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <ShieldAlert className="h-4 w-4 text-emerald-700" />
                <span>{isBn ? 'সদস্য স্তর ও পদমর্যাদা' : 'Role & Permissions'}</span>
              </div>
              <div className="space-y-2 text-sm md:text-base">
                <div>
                  <span className="text-slate-500 block text-xs md:text-sm font-medium">{isBn ? 'নির্ধারিত পদ:' : 'Assigned Role:'}</span>
                  <span className="font-extrabold text-emerald-950 capitalize text-sm md:text-base">
                    {isBn ? 'সাধারণ সদস্য' : activeUser.role?.name?.replace(/_/g, ' ') || 'Member'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs md:text-sm font-medium">{isBn ? 'অ্যাকাউন্ট স্ট্যাটাস:' : 'Account Status:'}</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold text-xs md:text-sm mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {isBn ? 'সক্রিয় ও নিয়মিত' : 'Active & Good Standing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Society Record */}
            <div className="p-4 md:p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="text-xs md:text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-2">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>{isBn ? 'সোসাইটি সঞ্চয় রেকর্ড' : 'Society Record'}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-600 block text-xs md:text-sm font-medium">{isBn ? 'শেয়ার মূলধনের পরিমাণ:' : 'Share Capital Value:'}</span>
                  <span className="font-mono font-extrabold text-emerald-950 text-base md:text-lg">
                    {isBn ? '৳ ' : 'BDT '}{Number(activeUser.member_profile?.share_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-xs md:text-sm font-medium">{isBn ? 'ডাটাবেজ রেকর্ড:' : 'Database Record:'}</span>
                  <span className="font-mono font-bold text-slate-800 text-sm md:text-base">#{activeUser.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Merged Accounts / Joint Group Linking */}
          <div className="p-4 md:p-5 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                <HeartHandshake className="h-4 w-4 text-purple-700" />
                <span>
                  {currentMergedGroup?.name
                    ? `Joint Group: ${currentMergedGroup.name} (${connectedMembers.length + 1} Connected Members)`
                    : `Merged Member Accounts (${connectedMembers.length > 0 ? `${connectedMembers.length + 1} Members` : 'Individual Account'})`}
                </span>
              </div>
            </div>

            {connectedMembers.length === 0 ? (
              <div className="text-xs md:text-sm text-slate-500 italic py-1">
                No other member accounts are currently merged with your profile. Merging is managed by Society Administrators.
              </div>
            ) : (
              <div className="space-y-2">
                {connectedMembers.map((otherUser) => (
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
                          Merged Account &bull; Shared Reports &amp; Dues Consolidation
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Timestamps */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
              <div>
                <span className="text-slate-500 text-xs md:text-sm block font-medium">Account Registered:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {activeUser.created_at
                    ? new Date(activeUser.created_at).toLocaleString(undefined, {
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
                <span className="text-slate-500 text-xs md:text-sm block font-medium">Last Profile Update:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {activeUser.updated_at
                    ? new Date(activeUser.updated_at).toLocaleString(undefined, {
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
      </div>

      {/* EDIT PROFILE MODAL (MATCHES ADMIN USERS EDIT DIALOG) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-6xl w-full p-0 overflow-hidden max-h-[92vh] flex flex-col md:flex-row border border-slate-200 shadow-2xl rounded-3xl bg-white">
          {/* LEFT SIDE: MULTI-PHOTO UPLOADER & CAROUSEL */}
          <div className="w-full md:w-[420px] lg:w-[480px] shrink-0 bg-slate-950 relative flex flex-col justify-between overflow-hidden min-h-[380px] md:min-h-[640px]">
            {idPhotosList.length > 0 ? (
              <>
                {/* Background ambient blur effect */}
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-2xl opacity-40 scale-125 pointer-events-none"
                  style={{ backgroundImage: `url(${idPhotosList[editPhotoIndex] || idPhotosList[0]})` }}
                />

                {/* Active Full Uncropped Photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={idPhotosList[editPhotoIndex] || idPhotosList[0]}
                  alt="Member ID Preview"
                  className="relative z-0 w-full h-full object-contain p-4 md:p-6 transition-all duration-300 drop-shadow-2xl"
                />

                {/* Top Overlay Controls */}
                <div className="relative z-10 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
                  <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wider bg-emerald-700 px-3.5 py-1.5 rounded-full shadow flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" />
                    {idPhotosList.length > 1 ? `Photo ${editPhotoIndex + 1} of ${idPhotosList.length}` : 'ID Photo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEditPhotoAtIndex(editPhotoIndex)}
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
                      onClick={() => setEditPhotoIndex((prev) => (prev > 0 ? prev - 1 : idPhotosList.length - 1))}
                      className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white pointer-events-auto transition-colors cursor-pointer shadow-xl"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPhotoIndex((prev) => (prev < idPhotosList.length - 1 ? prev + 1 : 0))}
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
                        onClick={() => setEditPhotoIndex(idx)}
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                          idx === editPhotoIndex
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
                      onClick={() => openEnlargeModal(idPhotosList, editPhotoIndex)}
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

          {/* RIGHT SIDE: PROFILE EDIT FORM */}
          <div className="flex-1 flex flex-col justify-between p-6 md:p-8 lg:p-10 overflow-y-auto max-h-[92vh] bg-white space-y-6">
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-5">
              <DialogHeader className="border-b border-slate-100 pb-3">
                <DialogTitle className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Edit My Profile
                </DialogTitle>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Update your contact details, address, credentials, and ID documents.
                </p>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Full Name</Label>
                    <Input
                      placeholder="Full Name"
                      {...register('name', { required: 'Name is required' })}
                      className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl"
                    />
                    {errors.name && <p className="text-xs md:text-sm text-red-600 mt-1">{String(errors.name.message)}</p>}
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...register('email', { required: 'Email is required' })}
                      className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl"
                    />
                    {errors.email && <p className="text-xs md:text-sm text-red-600 mt-1">{String(errors.email.message)}</p>}
                  </div>
                </div>

                {/* Password & Member ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Password (leave blank to keep current)</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...register('password')}
                      className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Member ID</Label>
                    <Input
                      disabled
                      {...register('member_no')}
                      className="bg-slate-50 font-mono font-bold text-slate-700 mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Official ID assigned by Society Administration.</p>
                  </div>
                </div>

                {/* Contact Phone & Physical Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Contact Phone</Label>
                    <Input
                      placeholder="+8801XXXXXXXXX"
                      {...register('phone')}
                      className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm font-bold text-slate-800">Physical / Postal Address</Label>
                    <Input
                      placeholder="e.g. House #12, Road #4, Sector 7, Dhaka"
                      {...register('address')}
                      className="bg-white mt-1.5 h-10 md:h-11 text-sm md:text-base rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="cursor-pointer h-11 md:h-12 px-6 text-sm md:text-base font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11 md:h-12 px-7 text-sm md:text-base rounded-xl shadow-md"
                >
                  {isUpdating ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* PHOTO ZOOM LIGHTBOX MODAL WITH SLIDER ARROWS (TOPMOST Z-INDEX) */}
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
