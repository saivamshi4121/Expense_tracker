/**
 * reconciliation.ts  (src/utils/reconciliation.ts)
 *
 * Pure calculation service for Smart Money Reconciliation (M14).
 * Combines digital transactions, cash wallet, and expenses to determine
 * whether the user's recorded money matches reality.
 *
 * No SQL, no React — just math over existing data types.
 * Daily Closing reuses this service to avoid duplicate logic.
 */

import type { Expense } from '@/types/expense';
import type { CashWallet } from '@/types/wallet';
import type { DetectedTransaction } from '@/types/detectedTransaction';

// ─── Money Summary ────────────────────────────────────────────────────────

export interface MoneySummary {
  /** All expenses where paymentMethod !== 'Cash' */
  digitalSpending: number;
  /** All expenses where paymentMethod === 'Cash' */
  cashSpending: number;
  /** digitalSpending + cashSpending */
  totalSpending: number;
  /** initialBalance - cashSpending */
  expectedCash: number;
  /** User's latest physical cash count (null if not entered) */
  actualCash: number | null;
  /** expectedCash - actualCash (null if actualCash not set) */
  difference: number | null;
  /** Reconciliation status string */
  status: ReconciliationStatus;
}

export type ReconciliationStatus =
  | { type: 'balanced'; message: string }         // difference === 0
  | { type: 'mismatch'; message: string }          // difference !== 0
  | { type: 'no_actual'; message: string }         // actualCash is null
  | { type: 'no_wallet'; message: string };        // initialBalance === 0 and no expenses

// ─── Anomaly Detection ────────────────────────────────────────────────────

export type AnomalyType =
  | 'pending_detected'     // detected transactions awaiting review
  | 'large_expense'        // expense > 5x average daily spend
  | 'possible_duplicate';  // two expenses with same amount + merchant + date

export interface Anomaly {
  type: AnomalyType;
  message: string;
  /** Optional related expense amount for display */
  amount?: number;
  /** Optional related expense for navigation */
  expenseId?: number;
}

// ─── Core Calculation ─────────────────────────────────────────────────────

/**
 * Calculates the full money summary from expenses and wallet data.
 * Replaces separate daily-closing / wallet calculations with a single source.
 */
export function calculateMoneySummary(
  allExpenses: Expense[],
  wallet: CashWallet | null
): MoneySummary {
  let cashSpending = 0;
  let digitalSpending = 0;

  for (const e of allExpenses) {
    if (e.paymentMethod === 'Cash') {
      cashSpending += e.amount;
    } else {
      digitalSpending += e.amount;
    }
  }

  const totalSpending = cashSpending + digitalSpending;
  const initialBalance = wallet?.initialBalance ?? 0;
  const expectedCash = Math.max(0, initialBalance - cashSpending);
  const actualCash = wallet?.actualBalance ?? null;
  const difference = actualCash !== null ? expectedCash - actualCash : null;

  const status = getStatus(expectedCash, actualCash, difference);

  return {
    digitalSpending,
    cashSpending,
    totalSpending,
    expectedCash,
    actualCash,
    difference,
    status,
  };
}

/**
 * Determines the reconciliation status from the computed values.
 */
function getStatus(
  expectedCash: number,
  actualCash: number | null,
  difference: number | null
): ReconciliationStatus {
  if (difference === 0) {
    return { type: 'balanced', message: 'Everything adds up' };
  }
  if (difference !== null && difference !== 0) {
    const sign = difference > 0 ? '+' : '';
    return {
      type: 'mismatch',
      message: `${sign}${Math.abs(difference).toLocaleString('en-IN')} difference found`,
    };
  }
  if (actualCash === null && expectedCash > 0) {
    return { type: 'no_actual', message: 'Count your cash to check' };
  }
  return { type: 'no_wallet', message: 'Set your starting cash first' };
}

// ─── Today's Spending ─────────────────────────────────────────────────────

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateTodaySpending(allExpenses: Expense[]) {
  const today = getTodayDateString();
  let cashSpending = 0;
  let digitalSpending = 0;

  for (const e of allExpenses) {
    if (e.date === today) {
      if (e.paymentMethod === 'Cash') {
        cashSpending += e.amount;
      } else {
        digitalSpending += e.amount;
      }
    }
  }

  return {
    cashSpending,
    digitalSpending,
    totalSpending: cashSpending + digitalSpending,
  };
}

// ─── Anomaly Detection ────────────────────────────────────────────────────

/**
 * Detects anomalies across expenses and detected transactions.
 * Returns a list of issues for the user to review.
 */
export function detectAnomalies(
  allExpenses: Expense[],
  pendingTransactions: DetectedTransaction[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Pending detected payments (not yet accepted or ignored)
  if (pendingTransactions.length > 0) {
    const totalPending = pendingTransactions.reduce((s, t) => s + t.amount, 0);
    anomalies.push({
      type: 'pending_detected',
      message: `${pendingTransactions.length} detected payment${pendingTransactions.length > 1 ? 's' : ''} waiting for review (${totalPending.toLocaleString('en-IN')})`,
    });
  }

  // 2. Unusually large expenses (> 5x average daily spend)
  if (allExpenses.length >= 3) {
    const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0);
    const uniqueDays = new Set(allExpenses.map((e) => e.date)).size;
    const avgDailySpend = uniqueDays > 0 ? totalSpent / uniqueDays : 0;

    for (const e of allExpenses) {
      if (avgDailySpend > 0 && e.amount > avgDailySpend * 5) {
        anomalies.push({
          type: 'large_expense',
          message: `Large expense: ${e.note || e.category} (${e.amount.toLocaleString('en-IN')})`,
          amount: e.amount,
          expenseId: e.id,
        });
      }
    }
  }

  // 3. Possible duplicates (same amount + same category + same date)
  const seen = new Map<string, Expense>();
  for (const e of allExpenses) {
    const key = `${e.amount}:${e.category}:${e.date}`;
    const existing = seen.get(key);
    if (existing) {
      anomalies.push({
        type: 'possible_duplicate',
        message: `Possible duplicate: ${e.amount.toLocaleString('en-IN')} (${e.category}) on ${e.date}`,
        amount: e.amount,
      });
    } else {
      seen.set(key, e);
    }
  }

  return anomalies;
}
