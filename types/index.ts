export type RoleName = 'super_admin' | 'admin' | 'accountant' | 'member' | string;

export interface Permission {
  id: number;
  module: string;
  action: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: Permission[];
  users_count?: number;
}

export interface MemberProfile {
  id: number;
  member_no: string;
  phone?: string;
  address?: string;
  id_photo?: string;
  id_photos?: string[];
  share_amount: number;
}

export interface User {
  id: number; name: string; email: string; designation?: string; is_active: boolean;
  can_change_payment?: boolean;
  role?: Role; member_profile?: MemberProfile; created_at: string; updated_at?: string;
}

export interface AdminModifier {
  id: number;
  name: string;
  role?: string;
  member_no?: string;
  action?: 'Created' | 'Updated' | 'Confirmed' | 'Rejected' | string;
}

export interface Transaction {
  id: number;
  transaction_no: string;
  type: string;
  payment_category?: string;
  amount: number;
  status?: 'pending' | 'paid' | 'rejected' | 'cancelled' | string;
  month?: string;
  transaction_date: string;
  description?: string;
  member?: { id: number; name: string; member_no?: string };
  created_by?: AdminModifier | string;
  updated_by?: AdminModifier | string;
  last_modified_by?: AdminModifier;
  receipt?: Receipt;
  receipt_photo?: string;
  receipt_photo_uploaded_at?: string;
  member_paid_amount?: number;
  member_trx_reference?: string;
  member_payment_method?: string;
  member_comment?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface TransactionList {
  data: Transaction[];
  summary: { page_total: number; count: number };
  meta: PageMeta;
}

export interface Receipt {
  id: number;
  receipt_no: string;
  amount: number;
  payment_method: string;
  receipt_date: string;
  member?: { id: number; name: string; member_no?: string; email?: string; phone?: string };
  created_by?: AdminModifier | string;
  creator?: AdminModifier;
  confirmed_by?: AdminModifier;
  transaction?: {
    id: number;
    transaction_no: string;
    description?: string;
    month?: string;
    receipt_photo?: string;
    receipt_photo_uploaded_at?: string;
    member_paid_amount?: number;
    member_trx_reference?: string;
    member_payment_method?: string;
    created_by?: AdminModifier | string;
    updated_by?: AdminModifier | string;
    last_modified_by?: AdminModifier;
  };
  created_at?: string;
  updated_at?: string;
}

export interface MeetingExpense {
  id: number;
  title: string;
  expense_date: string;
  created_at?: string;
  amount: number;
  description?: string;
  created_by?: string;
  created_by_id?: number;
  creator?: {
    id: number;
    name: string;
    email?: string;
    member_no?: string;
    role?: string;
  };
}

export interface Fdr {
  id: number; fdr_no: string; amount: number; start_date: string;
  maturity_date?: string; status: string; member?: { id: number; name: string };
}

export interface AppNotification {
  id: number; title: string; message: string; type: string; is_read: boolean; created_at: string;
}

export interface Setting { id: number; setting_key: string; setting_value: string; description?: string }

export interface AdminPaymentPermission {
  id: number; admin?: { id: number; name: string }; can_change_payment: boolean; assigned_by?: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  table_name: string;
  record_id?: number | string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_id?: number;
  user?: {
    id: number;
    name: string;
    email?: string;
    role?: string;
    designation?: string;
  } | string;
  user_name?: string;
  created_at: string;
}

export interface ProfileShare {
  id: number;
  primary_user?: {
    id: number;
    name: string;
    email?: string;
    member_no?: string;
    role?: string;
  };
  shared_user?: {
    id: number;
    name: string;
    email?: string;
    member_no?: string;
    role?: string;
  };
  primary_user_id?: number;
  shared_user_id?: number;
  relation?: string;
  group_name?: string;
  status: 'active' | 'inactive' | string;
  created_at?: string;
}

export interface PageMeta { current_page: number; last_page: number; per_page: number; total: number }
export interface Paginated<T> { data: T[]; meta: PageMeta }

export interface DashboardStats {
  total_transactions: number;
  total_demands: number;
  total_collections: number;
  total_receipts: number;
  cleared_receipts_count: number;
  cleared_receipts_amount: number;
  partial_count: number;
  partial_collected_amount: number;
  received_slips_count: number;
  received_slips_amount: number;
  due_pending_count: number;
  due_pending_amount: number;
  pure_unpaid_due_count: number;
  rejected_slips_count: number;
  rejected_slips_amount: number;
  pending_slips: number;
  pending_slips_amount: number;
  active_members: number;
  total_users: number;
  total_expenses: number;
  total_fdrs: number;
}

