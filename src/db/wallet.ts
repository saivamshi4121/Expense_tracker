/**
 * wallet.ts  (src/db/wallet.ts)
 *
 * SQLite CRUD for the cash_wallet table.
 * The table is a singleton — there is always exactly one row (id = 1).
 *
 * Called from useCashWallet hook only.
 * No SQL appears in screens or components.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { CashWallet } from '@/types/wallet';

// ─── Internal row type ────────────────────────────────────────────────────────

interface WalletRow {
  id: number;
  initial_balance: number;
  actual_balance: number | null;
  updated_at: string;
}

function rowToWallet(row: WalletRow): CashWallet {
  return {
    id: row.id,
    initialBalance: row.initial_balance,
    actualBalance: row.actual_balance,
    updatedAt: row.updated_at,
  };
}

// ─── Schema migration ─────────────────────────────────────────────────────────

/**
 * Called by runMigrations() in database.ts.
 * Creates the cash_wallet table and seeds the singleton row if absent.
 * Safe to call on existing databases — IF NOT EXISTS and an INSERT OR IGNORE
 * guard prevent data loss.
 */
export async function migrateCashWallet(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cash_wallet (
      id              INTEGER PRIMARY KEY CHECK (id = 1),
      initial_balance REAL    NOT NULL DEFAULT 0,
      actual_balance  REAL,
      updated_at      TEXT    NOT NULL
    );

    -- Ensure the singleton row exists (no-op if already present).
    INSERT OR IGNORE INTO cash_wallet (id, initial_balance, actual_balance, updated_at)
    VALUES (1, 0, NULL, datetime('now'));
  `);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getWallet(db: SQLiteDatabase): Promise<CashWallet> {
  const stmt = await db.prepareAsync(
    `SELECT id, initial_balance, actual_balance, updated_at
     FROM cash_wallet WHERE id = 1`
  );
  try {
    const result = await stmt.executeAsync<WalletRow>({});
    const row = await result.getFirstAsync();
    if (!row) throw new Error('getWallet: singleton row missing');
    return rowToWallet(row);
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Returns the sum of all expenses with paymentMethod = 'Cash'.
 * This is the canonical source for "total cash spent" —
 * it never duplicates existing expense data.
 */
export async function getCashExpensesTotal(db: SQLiteDatabase): Promise<number> {
  const stmt = await db.prepareAsync(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE payment_method = 'Cash'`
  );
  try {
    const result = await stmt.executeAsync<{ total: number }>({});
    const row = await result.getFirstAsync();
    return row?.total ?? 0;
  } finally {
    await stmt.finalizeAsync();
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Sets the user's initial cash balance (e.g. "I have ₹5,000 in my wallet").
 * Resets actual_balance to null so the user re-reconciles against the new start.
 */
export async function setInitialBalance(
  db: SQLiteDatabase,
  amount: number
): Promise<CashWallet> {
  const now = new Date().toISOString();
  const stmt = await db.prepareAsync(
    `UPDATE cash_wallet
     SET initial_balance = $amount,
         actual_balance  = NULL,
         updated_at      = $now
     WHERE id = 1`
  );
  try {
    await stmt.executeAsync({ $amount: amount, $now: now });
    return getWallet(db);
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Records the user's actual physical cash count.
 * Does not touch initial_balance or expense data.
 */
export async function setActualBalance(
  db: SQLiteDatabase,
  amount: number
): Promise<CashWallet> {
  const now = new Date().toISOString();
  const stmt = await db.prepareAsync(
    `UPDATE cash_wallet
     SET actual_balance = $amount,
         updated_at     = $now
     WHERE id = 1`
  );
  try {
    await stmt.executeAsync({ $amount: amount, $now: now });
    return getWallet(db);
  } finally {
    await stmt.finalizeAsync();
  }
}
