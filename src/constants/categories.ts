import type { ExpenseCategory } from '@/types/expense';

export interface CategoryMeta {
  label: ExpenseCategory;
  icon: string; // Ionicons icon name
  color: string; // accent color for the category chip
}

export const CATEGORIES: CategoryMeta[] = [
  { label: 'Food',     icon: 'fast-food-outline',       color: '#F97316' },
  { label: 'Travel',   icon: 'airplane-outline',        color: '#3B82F6' },
  { label: 'Shopping', icon: 'cart-outline',            color: '#A855F7' },
  { label: 'Bills',    icon: 'document-text-outline',   color: '#EAB308' },
  { label: 'Other',    icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export const DEFAULT_CATEGORY: ExpenseCategory = 'Other';
