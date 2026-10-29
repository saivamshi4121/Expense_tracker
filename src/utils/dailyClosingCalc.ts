/**
 * dailyClosingCalc.ts  (src/utils/dailyClosingCalc.ts)
 *
 * Re-exports from the shared reconciliation service (M14).
 * Daily Closing now uses the same calculation logic as Money Check.
 * This file exists for backward compatibility.
 */

import type { Expense } from '@/types/expense';
import {
  calculateTodaySpending as _calcToday,
  getTodayDateString as _getToday,
} from '@/utils/reconciliation';

export interface TodaySpendingSummary {
  cashSpending: number;
  digitalSpending: number;
  totalSpending: number;
  todayExpenses: Expense[];
}

/** Returns today's date as "YYYY-MM-DD" in local time. */
export function getTodayDateString(): string {
  return _getToday();
}

/**
 * Splits today's expenses into cash vs. digital and totals each bucket.
 * Delegates to the shared reconciliation service.
 */
export function calcTodaySpending(
  allExpenses: Expense[],
  todayDate: string
): TodaySpendingSummary {
  const todayExpenses = allExpenses.filter((e) => e.date === todayDate);
  const { cashSpending, digitalSpending, totalSpending } = _calcToday(allExpenses);

  return {
    cashSpending,
    digitalSpending,
    totalSpending,
    todayExpenses,
  };
}
