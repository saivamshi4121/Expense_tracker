/**
 * useCashWallet.ts
 *
 * Reactive hook for the Cash Wallet feature.
 * Provides wallet state and derived values (expectedBalance, difference).
 * All DB calls are delegated to src/db/wallet.ts.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getWallet,
  getCashExpensesTotal,
  setInitialBalance,
  setActualBalance,
} from '@/db/wallet';
import type { CashWallet } from '@/types/wallet';

interface UseCashWalletReturn {
  /** Raw wallet row — null while loading */
  wallet: CashWallet | null;
  /** Sum of all Cash-payment expenses */
  cashExpensesTotal: number;
  /**
   * Expected cash still in the user's wallet:
   * initialBalance - cashExpensesTotal
   */
  expectedBalance: number;
  /**
   * Difference between expected and actual cash:
   * expectedBalance - actualBalance
   * null if the user has not entered an actual balance yet.
   */
  difference: number | null;
  loading: boolean;
  error: string | null;

  /** Replace the initial balance (resets actualBalance to null). */
  updateInitialBalance: (amount: number) => Promise<void>;
  /** Record the user's physical cash count. */
  updateActualBalance: (amount: number) => Promise<void>;
  /** Re-fetch wallet + cash total from the DB. */
  refresh: () => Promise<void>;
}

export function useCashWallet(): UseCashWalletReturn {
  const db = useSQLiteContext();

  const [wallet, setWallet] = useState<CashWallet | null>(null);
  const [cashExpensesTotal, setCashExpensesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, total] = await Promise.all([
        getWallet(db),
        getCashExpensesTotal(db),
      ]);
      setWallet(w);
      setCashExpensesTotal(total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wallet';
      setError(message);
      console.error('[useCashWallet] refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const expectedBalance = wallet
    ? Math.max(0, wallet.initialBalance - cashExpensesTotal)
    : 0;

  const difference =
    wallet?.actualBalance != null ? expectedBalance - wallet.actualBalance : null;

  // ── Actions ────────────────────────────────────────────────────────────────

  const updateInitialBalance = useCallback(
    async (amount: number) => {
      const updated = await setInitialBalance(db, amount);
      // Refresh total in case new cash expenses have been added since last open.
      const total = await getCashExpensesTotal(db);
      setWallet(updated);
      setCashExpensesTotal(total);
    },
    [db]
  );

  const updateActualBalance = useCallback(
    async (amount: number) => {
      const updated = await setActualBalance(db, amount);
      setWallet(updated);
    },
    [db]
  );

  return {
    wallet,
    cashExpensesTotal,
    expectedBalance,
    difference,
    loading,
    error,
    updateInitialBalance,
    updateActualBalance,
    refresh,
  };
}
