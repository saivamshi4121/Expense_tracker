import type { PaymentMethod } from '@/types/expense';

export interface PaymentMethodMeta {
  label: PaymentMethod;
  icon: string; // Ionicons icon name
  color: string; // accent color for the payment method chip
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { label: 'Cash',           icon: 'cash-outline',              color: '#22C55E' },
  { label: 'UPI',            icon: 'phone-portrait-outline',    color: '#8B5CF6' },
  { label: 'Bank Transfer',  icon: 'business-outline',          color: '#3B82F6' },
  { label: 'Debit Card',     icon: 'card-outline',              color: '#F97316' },
  { label: 'Credit Card',    icon: 'card-outline',              color: '#EC4899' },
  { label: 'Other',          icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'Other';