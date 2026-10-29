/**
 * useDailyClosing.ts  (src/hooks/useDailyClosing.ts)
 *
 * Reactive hook for the Daily Closing feature.
 *
 * Composes:
 *  - existing expense data (from useExpenses)
 *  - existing wallet state (from useCashWallet)
 *  - daily_closing DB table (via src/db/dailyClosing.ts)
 *
 * The screen only calls this hook — no SQL appears in the screen.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getClosingByDate, upsertClosing } from '@/db/dailyClosing';
import type { ClosingResolution, DailyClosing } from '@/types/dailyClosing';
import type { Expense } from '@/types/expense';
import { calcTodaySpending, getTodayDateString } from '@/utils/dailyClosingCalc';

interface UseDailyClosingProps {
  /** All expenses currently loaded (pass from useExpenses). */
  allExpenses: Expense[];
  /** Expected cash from the wallet (pass from useCashWallet). */
  expectedCash: number;
}

interface UseDailyClosingReturn {
  /** Today's date string "YYYY-MM-DD" */
  todayDate: string;

  /** Today's cash spending total */
  cashSpending: number;

  /** Today's digital spending total */
  digitalSpending: number;

  /** Today's total spending */
  totalSpending: number;

  /** Expected cash balance from wallet (passed in) */
  expectedCash: number;

  /**
   * The actual cash the user entered in this session.
   * Null if they haven't entered it yet today.
   */
  actualCash: number | null;

  /**
   * difference = expectedCash - actualCash
   * null if actualCash is null.
   */
  difference: number | null;

  /** The persisted closing record for today (null if none saved yet) */
  savedClosing: DailyClosing | null;

  loading: boolean;
  error: string | null;

  /** Persist actual cash + auto-set resolution='resolved' if diff=0 */
  submitActualCash: (actualCash: number) => Promise<void>;

  /** Save resolution: 'forgot' or 'review_later' */
  submitResolution: (resolution: Exclude<ClosingResolution, 'resolved'>) => Promise<void>;

  /** Re-load today's persisted record (e.g. after returning from Add Expense). */
  refresh: () => Promise<void>;
}

export function useDailyClosing({
  allExpenses,
  expectedCash,
}: UseDailyClosingProps): UseDailyClosingReturn {
  const db = useSQLiteContext();

  const todayDate = useMemo(() => getTodayDateString(), []);

  // ── Today's spending ────────────────────────────────────────────────────────
  const { cashSpending, digitalSpending, totalSpending } = useMemo(
    () => calcTodaySpending(allExpenses, todayDate),
    [allExpenses, todayDate]
  );

  // ── Persisted closing state ─────────────────────────────────────────────────
  const [savedClosing, setSavedClosing] = useState<DailyClosing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await getClosingByDate(db, todayDate);
      setSavedClosing(record);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load daily closing';
      setError(message);
      console.error('[useDailyClosing] refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [db, todayDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Local actual cash (session value, takes precedence over saved) ───────────
  // Use saved value if already persisted; otherwise null.
  const actualCash = savedClosing?.actualCash ?? null;
  const difference = actualCash !== null ? expectedCash - actualCash : null;

  // ── Actions ─────────────────────────────────────────────────────────────────

  const submitActualCash = useCallback(
    async (enteredActualCash: number) => {
      const diff = expectedCash - enteredActualCash;
      const resolution: ClosingResolution = diff === 0 ? 'resolved' : null!;
      const saved = await upsertClosing(db, {
        date: todayDate,
        cashSpending,
        digitalSpending,
        expectedCash,
        actualCash: enteredActualCash,
        difference: diff,
        // Only auto-resolve if perfectly balanced; otherwise keep null
        resolution: diff === 0 ? 'resolved' : savedClosing?.resolution ?? null,
      });
      setSavedClosing(saved);
    },
    [db, todayDate, cashSpending, digitalSpending, expectedCash, savedClosing]
  );

  const submitResolution = useCallback(
    async (resolution: Exclude<ClosingResolution, 'resolved'>) => {
      // Persist the current state + chosen resolution
      const saved = await upsertClosing(db, {
        date: todayDate,
        cashSpending,
        digitalSpending,
        expectedCash,
        actualCash,
        difference,
        resolution,
      });
      setSavedClosing(saved);
    },
    [db, todayDate, cashSpending, digitalSpending, expectedCash, actualCash, difference]
  );

  return {
    todayDate,
    cashSpending,
    digitalSpending,
    totalSpending,
    expectedCash,
    actualCash,
    difference,
    savedClosing,
    loading,
    error,
    submitActualCash,
    submitResolution,
    refresh,
  };
}
