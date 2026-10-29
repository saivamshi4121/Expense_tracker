import type { Expense, ExpenseCategory, PaymentMethod } from '@/types/expense';

export type DateFilter = 'All Time' | 'Today' | 'This Week' | 'This Month';

export interface ExpenseFilters {
  category: ExpenseCategory | 'All';
  paymentMethod: PaymentMethod | 'All';
  date: DateFilter;
}

export const DEFAULT_FILTERS: ExpenseFilters = {
  category: 'All',
  paymentMethod: 'All',
  date: 'All Time',
};

/**
 * Checks if an expense falls within the specified date range.
 */
function isWithinDateRange(expenseDate: string, filter: DateFilter): boolean {
  if (filter === 'All Time') return true;

  const expense = new Date(expenseDate);
  const now = new Date();

  // Reset time parts for accurate date comparison
  const expenseDay = new Date(expense.getFullYear(), expense.getMonth(), expense.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case 'Today':
      return expenseDay.getTime() === today.getTime();

    case 'This Week': {
      // Get start of current week (Monday)
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      return expenseDay >= startOfWeek && expenseDay <= today;
    }

    case 'This Month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return expenseDay >= startOfMonth && expenseDay <= today;
    }

    default:
      return true;
  }
}

/**
 * Filters expenses based on the provided filters.
 * Returns a new array with only the expenses that match all filter criteria.
 */
export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  return expenses.filter((expense) => {
    // Category filter
    const matchesCategory = filters.category === 'All' || expense.category === filters.category;

    // Payment method filter
    const matchesPaymentMethod = filters.paymentMethod === 'All' || expense.paymentMethod === filters.paymentMethod;

    // Date filter
    const matchesDate = isWithinDateRange(expense.date, filters.date);

    return matchesCategory && matchesPaymentMethod && matchesDate;
  });
}

/**
 * Calculates the total amount of the given expenses.
 */
export function calculateTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Checks if any filters are actively applied (not default values).
 */
export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return filters.category !== 'All' || filters.paymentMethod !== 'All' || filters.date !== 'All Time';
}