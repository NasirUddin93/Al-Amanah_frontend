import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type * as T from '@/types';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  prepareHeaders: (headers, { getState }) => {
    let token = (getState() as any)?.auth?.token;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept', 'application/json');
    return headers;
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
  tagTypes: ['Users', 'Roles', 'Permissions', 'Transactions', 'Receipts', 'MeetingExpenses', 'Fdrs',
             'Notifications', 'Settings', 'AdminPermissions', 'ProfileShares', 'ActivityLogs'],
  endpoints: (builder) => ({

    /* ---------- Auth ---------- */
    login: builder.mutation<{ user: T.User; token: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
      transformResponse: (res: any) => {
        const rawUser = res.user?.data || res.user || res.data?.user || res.data;
        return {
          user: rawUser,
          token: res.token || res.access_token,
        };
      },
    }),
    me: builder.query<T.User, void>({
      query: () => '/me',
      transformResponse: (res: any) => res.data || res,
    }),
    logout: builder.mutation<{ message: string }, void>({ query: () => ({ url: '/logout', method: 'POST' }) }),

    /* ---------- Users / Roles ---------- */
    getUsers: builder.query<T.Paginated<T.User>, {
      page?: number;
      per_page?: number;
      search?: string;
      role_id?: number | string;
      status?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } | void>({
      query: (params) => ({ url: '/users', params: params || undefined }),
      providesTags: ['Users'],
    }),
    createUser: builder.mutation<T.User, any>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation<T.User, { id: number; body: any }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Users'],
    }),
    deleteUser: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Users'],
    }),
    assignRole: builder.mutation<T.User, { userId: number; role_id: number; designation?: string }>({
      query: ({ userId, ...body }) => ({ url: `/users/${userId}/assign-role`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Users'],
    }),
    getRoles: builder.query<T.Role[], void>({
      query: () => '/roles',
      transformResponse: (res: any) => (Array.isArray(res) ? res : res?.data || []),
      providesTags: ['Roles'],
    }),
    getPermissions: builder.query<T.Permission[], void>({
      query: () => '/permissions',
      transformResponse: (res: any) => (Array.isArray(res) ? res : res?.data || []),
      providesTags: ['Permissions'],
    }),
    createRole: builder.mutation<T.Role, { name: string; description?: string; permissions?: number[] }>({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Roles'],
    }),
    updateRole: builder.mutation<T.Role, { id: number; body: { name?: string; description?: string; permissions?: number[] } }>({
      query: ({ id, body }) => ({ url: `/roles/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Roles', 'Users'],
    }),
    deleteRole: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Roles'],
    }),

    /* ---------- Transactions ---------- */
    getTransactions: builder.query<T.TransactionList, {
      page?: number;
      per_page?: number;
      type?: string;
      status?: string;
      member_id?: number | string;
      payment_category?: string;
    } | void>({
      query: (params) => ({ url: '/transactions', params: params || undefined }),
      providesTags: ['Transactions'],
    }),
    createTransaction: builder.mutation<T.Transaction, any>({
      query: (body) => ({ url: '/transactions', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Transactions'],
    }),
    updateTransaction: builder.mutation<T.Transaction, { id: number; body: any }>({
      query: ({ id, body }) => ({ url: `/transactions/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Transactions'],
    }),
    deleteTransaction: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Transactions'],
    }),
    generatePayments: builder.mutation<{ message: string; count: number }, {
      payment_category: 'monthly_payment' | 'one_time';
      member_ids: (number | string)[];
      amount: number;
      months?: string[];
      title?: string;
      due_date?: string;
      description?: string;
      transaction_no?: string;
    }>({
      query: (body) => ({ url: '/transactions/generate-payments', method: 'POST', body }),
      invalidatesTags: ['Transactions', 'Receipts', 'Notifications'],
    }),
    collectPayment: builder.mutation<{
      message: string;
      status: 'paid' | 'partial';
      paid_amount: number;
      remaining_due: number;
      transaction: T.Transaction;
      remaining_trx?: T.Transaction;
    }, {
      id: number;
      body: {
        paid_amount: number;
        payment_method?: string;
        payment_date?: string;
        notes?: string;
        reference?: string;
        trx_reference?: string;
        create_receipt?: boolean;
      };
    }>({
      query: ({ id, body }) => ({ url: `/transactions/${id}/collect-payment`, method: 'POST', body }),
      invalidatesTags: ['Transactions', 'Receipts', 'Notifications'],
    }),
    uploadReceiptPhoto: builder.mutation<{ message: string; transaction: T.Transaction }, { id: number; body: any }>({
      query: ({ id, body }) => ({
        url: `/transactions/${id}/upload-receipt-photo`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Transactions', 'Receipts', 'Notifications'],
    }),
    batchUploadReceiptPhoto: builder.mutation<
      { message: string; transactions: T.Transaction[] },
      { body: { transaction_ids: number[]; photo_data?: string | null; trx_reference: string; payment_method?: string; comment?: string; allocations?: { transaction_id: number; paid_amount: number }[] } }
    >({
      query: ({ body }) => ({
        url: '/transactions/batch-upload-receipt-photo',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Transactions', 'Receipts', 'Notifications'],
    }),
    rejectReceiptPhoto: builder.mutation<{ message: string; transaction: T.Transaction }, { id: number; body?: { reason?: string } }>({
      query: ({ id, body }) => ({
        url: `/transactions/${id}/reject-receipt-photo`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Transactions', 'Receipts', 'Notifications'],
    }),
    getReport: builder.query<T.TransactionList, { from?: string; to?: string; type?: string; page?: number; per_page?: number } | void>({
      query: (params) => ({ url: '/reports/transactions', params: params || undefined }),
    }),
    getDashboardStats: builder.query<{ success: boolean; data: T.DashboardStats }, void>({
      query: () => '/reports/stats',
      providesTags: ['Transactions', 'Receipts', 'Users', 'MeetingExpenses', 'Fdrs'],
    }),

    /* ---------- Receipts ---------- */
    getReceipts: builder.query<T.Paginated<T.Receipt>, { page?: number; per_page?: number } | void>({
      query: (params) => ({ url: '/receipts', params: params || undefined }),
      providesTags: ['Receipts'],
    }),
    createReceipt: builder.mutation<T.Receipt, any>({
      query: (body) => ({ url: '/receipts', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Receipts'],
    }),
    updateReceipt: builder.mutation<T.Receipt, { id: number; body: any }>({
      query: ({ id, body }) => ({ url: `/receipts/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Receipts'],
    }),
    deleteReceipt: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/receipts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Receipts'],
    }),

    /* ---------- Meeting Expenses ---------- */
    getMeetingExpenses: builder.query<T.Paginated<T.MeetingExpense>, void>({
      query: () => '/meeting-expenses',
      providesTags: ['MeetingExpenses'],
    }),
    createMeetingExpense: builder.mutation<T.MeetingExpense, any>({
      query: (body) => ({ url: '/meeting-expenses', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['MeetingExpenses'],
    }),
    deleteMeetingExpense: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/meeting-expenses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MeetingExpenses'],
    }),

    /* ---------- FDR ---------- */
    getFdrs: builder.query<T.Paginated<T.Fdr>, void>({
      query: () => '/fdrs',
      providesTags: ['Fdrs'],
    }),
    createFdr: builder.mutation<T.Fdr, any>({
      query: (body) => ({ url: '/fdrs', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Fdrs'],
    }),
    deleteFdr: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/fdrs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Fdrs'],
    }),

    /* ---------- Notifications ---------- */
    getNotifications: builder.query<T.Paginated<T.AppNotification>, { page?: number } | void>({
      query: (params) => ({ url: '/notifications', params: params || undefined }),
      providesTags: ['Notifications'],
    }),
    markRead: builder.mutation<T.AppNotification, number>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Notifications'],
    }),
    markAllRead: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),

    /* ---------- Settings ---------- */
    getSettings: builder.query<T.Setting[], void>({
      query: () => '/settings',
      transformResponse: (res: any) => (Array.isArray(res) ? res : res?.data || []),
      providesTags: ['Settings'],
    }),
    updateSetting: builder.mutation<T.Setting, { setting_key: string; setting_value: string }>({
      query: (body) => ({ url: '/settings', method: 'PUT', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['Settings'],
    }),

    /* ---------- Admin Payment Permissions ---------- */
    getAdminPermissions: builder.query<T.Paginated<T.AdminPaymentPermission>, void>({
      query: () => '/admin-payment-permissions',
      providesTags: ['AdminPermissions'],
    }),
    assignPaymentPermission: builder.mutation<T.AdminPaymentPermission, { admin_user_id: number; can_change_payment: boolean }>({
      query: (body) => ({ url: '/admin-payment-permissions', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['AdminPermissions', 'Users'],
    }),

    /* ---------- Profile Shares (Merged / Linked Accounts) ---------- */
    getProfileShares: builder.query<{ data: T.ProfileShare[] } | T.Paginated<T.ProfileShare> | T.ProfileShare[], void>({
      query: () => '/profile-shares',
      transformResponse: (res: any) => res?.data || res,
      providesTags: ['ProfileShares'],
    }),
    createProfileShare: builder.mutation<T.ProfileShare, { primary_user_id?: number; shared_user_id?: number; member_ids?: number[]; shared_user_ids?: number[]; relation?: string; group_name?: string; status?: string }>({
      query: (body) => ({ url: '/profile-shares', method: 'POST', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['ProfileShares', 'Users'],
    }),
    updateProfileShare: builder.mutation<T.ProfileShare, { id: number; status?: string; group_name?: string }>({
      query: ({ id, ...body }) => ({ url: `/profile-shares/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data || res,
      invalidatesTags: ['ProfileShares', 'Users'],
    }),
    deleteProfileShare: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/profile-shares/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ProfileShares', 'Users'],
    }),

    /* ---------- Activity Logs ---------- */
    getActivityLogs: builder.query<T.Paginated<T.ActivityLog>, {
      page?: number;
      per_page?: number;
      search?: string;
      action?: string;
      table_name?: string;
      user_id?: number;
    } | void>({
      query: (params) => ({ url: '/activity-logs', params: params || undefined }),
      providesTags: ['ActivityLogs'],
    }),

  }),
});

export const {
  useLoginMutation, useMeQuery, useLogoutMutation,
  useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation,
  useAssignRoleMutation, useGetRolesQuery, useGetPermissionsQuery, useCreateRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation,
  useGetTransactionsQuery, useCreateTransactionMutation, useUpdateTransactionMutation,
  useCollectPaymentMutation,
  useUploadReceiptPhotoMutation,
  useBatchUploadReceiptPhotoMutation,
  useRejectReceiptPhotoMutation,
  useDeleteTransactionMutation, useGeneratePaymentsMutation, useGetReportQuery, useGetDashboardStatsQuery,
  useGetReceiptsQuery, useCreateReceiptMutation, useUpdateReceiptMutation, useDeleteReceiptMutation,
  useGetMeetingExpensesQuery, useCreateMeetingExpenseMutation, useDeleteMeetingExpenseMutation,
  useGetFdrsQuery, useCreateFdrMutation, useDeleteFdrMutation,
  useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation,
  useGetSettingsQuery, useUpdateSettingMutation,
  useGetAdminPermissionsQuery, useAssignPaymentPermissionMutation,
  useGetProfileSharesQuery, useCreateProfileShareMutation, useUpdateProfileShareMutation, useDeleteProfileShareMutation,
  useGetActivityLogsQuery,
} = api;
