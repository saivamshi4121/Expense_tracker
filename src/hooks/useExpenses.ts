import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from '@/db/expenses';
import type { Expense, NewExpense } from '@/types/expense';

interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  addExpense: (expense: NewExpense) => Promise<Expense>;
  updateExpenseById: (id: number, expense: NewExpense) => Promise<Expense>;
  removeExpense: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useExpenses(): UseExpensesReturn {
  // useSQLiteContext() returns the fully-initialised DB provided by
  // <SQLiteProvider> in _layout.tsx. It is never null here — the provider
  // guarantees migrations have completed before children render.
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpenses(db);
      setExpenses(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load expenses';
      setError(message);
      console.error('[useExpenses] refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addExpense = useCallback(
    async (input: NewExpense): Promise<Expense> => {
      const created = await createExpense(db, input);
      await refresh();
      return created;
    },
    [db, refresh]
  );

  const updateExpenseById = useCallback(
    async (id: number, input: NewExpense): Promise<Expense> => {
      const updated = await updateExpense(db, id, input);
      await refresh();
      return updated;
    },
    [db, refresh]
  );

  const removeExpense = useCallback(
    async (id: number): Promise<void> => {
      await deleteExpense(db, id);
      await refresh();
    },
    [db, refresh]
  );

  return { expenses, loading, error, addExpense, updateExpenseById, removeExpense, refresh };
}
