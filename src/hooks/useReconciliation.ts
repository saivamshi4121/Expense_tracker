/**
 * useReconciliation.ts  (src/hooks/useReconciliation.ts)
 *
 * Reactive hook for M14 Smart Money Reconciliation.
 * Composes expenses + wallet + detected transactions into a single
 * money summary with anomaly detection.
 *
 * Daily Closing can also consume this hook to reuse the same logic.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { getPendingDetectedTransactions } from '@/db/detectedTransactions';
import type { Expense } from '@/types/expense';
import type { CashWallet } from '@/types/wallet';
import type { DetectedTransaction } from '@/types/detectedTransaction';
import {
  calculateMoneySummary,
  detectAnomalies,
  calculateTodaySpending,
  type MoneySummary,
  type Anomaly,
} from '@/utils/reconciliation';

interface UseReconciliationProps {
  /** All expenses currently loaded (pass from useExpenses). */
  allExpenses: Expense[];
  /** Wallet state (pass from useCashWallet). */
  wallet: CashWallet | null;
  /** Loading state from parent */
  loading?: boolean;
}

interface UseReconciliationReturn {
  /** Full money summary */
  summary: MoneySummary;
  /** Detected anomalies */
  anomalies: Anomaly[];
  /** Today's spending breakdown */
  todaySpending: { cashSpending: number; digitalSpending: number; totalSpending: number };
  /** Pending detected transactions */
  pendingTransactions: DetectedTransaction[];
  /** Whether any data is still loading */
  loading: boolean;
  /** Re-fetch pending transactions */
  refresh: () => Promise<void>;
}

export function useReconciliation({
  allExpenses,
  wallet,
  loading: parentLoading = false,
}: UseReconciliationProps): UseReconciliationReturn {
  const db = useSQLiteContext();
  const [pendingTransactions, setPendingTransactions] = useState<DetectedTransaction[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const refresh = useCallback(async () => {
    setLoadingPending(true);
    try {
      const pending = await getPendingDetectedTransactions(db);
      setPendingTransactions(pending);
    } catch {
      // Silent fail — anomalies will just not include pending transactions
    } finally {
      setLoadingPending(false);
    }
  }, [db]);

  // Refresh pending transactions on focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Compute summary from in-memory data (no async)
  const summary = useMemo(
    () => calculateMoneySummary(allExpenses, wallet),
    [allExpenses, wallet]
  );

  const todaySpending = useMemo(
    () => calculateTodaySpending(allExpenses),
    [allExpenses]
  );

  const anomalies = useMemo(
    () => detectAnomalies(allExpenses, pendingTransactions),
    [allExpenses, pendingTransactions]
  );

  return {
    summary,
    anomalies,
    todaySpending,
    pendingTransactions,
    loading: parentLoading || loadingPending,
    refresh,
  };
}
