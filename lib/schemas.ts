import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters').optional().or(z.literal('')),
  role_id: z.coerce.number().min(1, 'Role is required'),
  designation: z.string().optional(),
  can_change_payment: z.boolean().optional(),
  member_no: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  id_photo: z.string().optional(),
  id_photos: z.array(z.string()).optional(),
});
export type UserValues = z.infer<typeof userSchema>;

export const transactionSchema = z.object({
  member_id: z.coerce.number().min(1, 'Member is required'),
  type: z.enum(['payment', 'share', 'fdr', 'expense', 'other']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  transaction_date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});
export type TransactionValues = z.infer<typeof transactionSchema>;

export const receiptSchema = z.object({
  transaction_id: z.coerce.number().min(1, 'Transaction is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bank', 'mobile_banking', 'other']),
  receipt_date: z.string().min(1, 'Date is required'),
});
export type ReceiptValues = z.infer<typeof receiptSchema>;

export const expenseSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  expense_date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
});
export type ExpenseValues = z.infer<typeof expenseSchema>;

export const fdrSchema = z.object({
  member_id: z.coerce.number().min(1, 'Member is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  start_date: z.string().min(1, 'Date is required'),
  maturity_date: z.string().optional(),
});
export type FdrValues = z.infer<typeof fdrSchema>;

export const settingSchema = z.object({
  setting_key: z.string().min(1),
  setting_value: z.string().min(1, 'Value is required'),
});
export type SettingValues = z.infer<typeof settingSchema>;

export const paymentPermissionSchema = z.object({
  admin_user_id: z.coerce.number().min(1, 'Admin user is required'),
  can_change_payment: z.boolean(),
});
export type PaymentPermissionValues = z.infer<typeof paymentPermissionSchema>;
