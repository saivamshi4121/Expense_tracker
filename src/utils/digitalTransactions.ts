/**
 * digitalTransactions.ts  (src/utils/digitalTransactions.ts)
 *
 * Pure helpers for the Digital Transactions screen.
 * No SQL, no React — operates on expense data already loaded in memory.
 * "Digital" means any expense whose paymentMethod is NOT 'Cash'.
 */

import type { Expense } from '@/types/expense';

export interface DigitalSummary {
  /** All-time digital expenses, sorted newest first */
  digitalExpenses: Expense[];
  /** Sum of digital expenses with today's date */
  spendingToday: number;
  /** Sum of digital expenses in the current calendar month */
  spendingThisMonth: number;
  /** Count of all digital expenses */
  count: number;
}

/** Returns today's date as "YYYY-MM-DD" in local time. */
function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns "YYYY-MM" for the current calendar month. */
function currentMonthPrefix(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Extracts the digital sub-set from all loaded expenses and calculates
 * summary figures.  Returns a stable object — cheap to call on every render.
 */
export function calcDigitalSummary(allExpenses: Expense[]): DigitalSummary {
  const today = todayString();
  const monthPrefix = currentMonthPrefix();

  // Filter: anything that is NOT Cash
  const digitalExpenses = allExpenses
    .filter((e) => e.paymentMethod !== 'Cash')
    .sort((a, b) => {
      // Primary sort: date descending; secondary: id descending (newest first)
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.id - a.id;
    });

  let spendingToday = 0;
  let spendingThisMonth = 0;

  for (const e of digitalExpenses) {
    if (e.date === today) spendingToday += e.amount;
    if (e.date.startsWith(monthPrefix)) spendingThisMonth += e.amount;
  }

  return {
    digitalExpenses,
    spendingToday,
    spendingThisMonth,
    count: digitalExpenses.length,
  };
}
