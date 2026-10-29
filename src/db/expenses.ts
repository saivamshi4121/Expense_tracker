/**
 * expenses.ts
 *
 * Typed CRUD operations for the expenses table.
 * Every function accepts a SQLiteDatabase instance obtained from
 * useSQLiteContext() — no openDatabaseAsync calls here.
 * All SQL stays in this file — screens and hooks never write raw queries.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Expense, ExpenseCategory, NewExpense, PaymentMethod } from '@/types/expense';

// ─── Internal row type ────────────────────────────────────────────────────────
interface ExpenseRow {
  id: number;
  amount: number;
  category: string;
  payment_method: string;
  note: string | null;
  date: string;
  created_at: string;
}

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category as ExpenseCategory,
    paymentMethod: row.payment_method as PaymentMethod,
    note: row.note ?? undefined,
    date: row.date,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createExpense(db: SQLiteDatabase, input: NewExpense): Promise<Expense> {
  const stmt = await db.prepareAsync(
    `INSERT INTO expenses (amount, category, payment_method, note, date, created_at)
     VALUES ($amount, $category, $paymentMethod, $note, $date, $created_at)`
  );
  try {
    const result = await stmt.executeAsync({
      $amount: input.amount,
      $category: input.category,
      $paymentMethod: input.paymentMethod,
      $note: input.note ?? null,
      $date: input.date,
      $created_at: nowIso(),
    });
    const created = await getExpenseById(db, result.lastInsertRowId);
    if (!created) throw new Error(`createExpense: cannot retrieve id=${result.lastInsertRowId}`);
    return created;
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  const stmt = await db.prepareAsync(
    `SELECT id, amount, category, payment_method, note, date, created_at
     FROM expenses
     ORDER BY date DESC, created_at DESC`
  );
  try {
    const result = await stmt.executeAsync<ExpenseRow>({});
    const rows = await result.getAllAsync();
    return rows.map(rowToExpense);
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getExpenseById(db: SQLiteDatabase, id: number): Promise<Expense | null> {
  const stmt = await db.prepareAsync(
    `SELECT id, amount, category, payment_method, note, date, created_at
     FROM expenses WHERE id = $id`
  );
  try {
    const result = await stmt.executeAsync<ExpenseRow>({ $id: id });
    const row = await result.getFirstAsync();
    return row ? rowToExpense(row) : null;
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function deleteExpense(db: SQLiteDatabase, id: number): Promise<void> {
  const stmt = await db.prepareAsync(`DELETE FROM expenses WHERE id = $id`);
  try {
    const result = await stmt.executeAsync({ $id: id });
    if (result.changes === 0) throw new Error(`deleteExpense: no expense with id=${id}`);
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: number,
  input: NewExpense
): Promise<Expense> {
  const stmt = await db.prepareAsync(
    `UPDATE expenses
     SET amount = $amount, category = $category, payment_method = $paymentMethod, note = $note, date = $date
     WHERE id = $id`
  );
  try {
    const result = await stmt.executeAsync({
      $id: id,
      $amount: input.amount,
      $category: input.category,
      $paymentMethod: input.paymentMethod,
      $note: input.note ?? null,
      $date: input.date,
    });
    if (result.changes === 0) throw new Error(`updateExpense: no expense with id=${id}`);
    const updated = await getExpenseById(db, id);
    if (!updated) throw new Error(`updateExpense: cannot retrieve id=${id}`);
    return updated;
  } finally {
    await stmt.finalizeAsync();
  }
}
