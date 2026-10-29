/**
 * database.ts
 *
 * Exports the migration function used by SQLiteProvider in _layout.tsx.
 * The SQLiteProvider pattern (recommended by expo-sqlite SDK 57+) guarantees
 * the database is fully open and migrated before any screen renders —
 * eliminating the NullPointerException race condition that occurs when
 * openDatabaseAsync is called concurrently from multiple React effects.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateCashWallet } from '@/db/wallet';
import { migrateDailyClosing } from '@/db/dailyClosing';
import { migrateDetectedTransactions } from '@/db/detectedTransactions';

/**
 * Runs all schema migrations.
 * Called once by <SQLiteProvider onInit={runMigrations}> before children render.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS expenses (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      amount          REAL    NOT NULL,
      category        TEXT    NOT NULL,
      payment_method  TEXT    NOT NULL DEFAULT 'Other',
      note            TEXT,
      date            TEXT    NOT NULL,
      created_at      TEXT    NOT NULL
    );
  `);

  // ── Migration: add payment_method column to existing databases ────────────
  // SQLite does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
  // so we attempt the ALTER and silently ignore "duplicate column" errors.
  // Existing rows will receive the DEFAULT value 'Other'.
  try {
    await db.execAsync(
      `ALTER TABLE expenses ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Other';`
    );
  } catch {
    // Column already exists — safe to ignore.
  }
  // ── Migration: cash_wallet table (Milestone 9) ────────────────────────────
  await migrateCashWallet(db);

  // ── Migration: daily_closing table (Milestone 10) ────────────────────────
  await migrateDailyClosing(db);

  // ── Migration: detected_transactions table (Milestone 12) ────────────────
  await migrateDetectedTransactions(db);
}
