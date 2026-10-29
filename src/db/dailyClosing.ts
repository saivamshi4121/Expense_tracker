/**
 * dailyClosing.ts  (src/db/dailyClosing.ts)
 *
 * SQLite CRUD for the daily_closing table.
 * Each row represents one day's closing record (primary key = date string).
 *
 * Called ONLY from useDailyClosing hook.
 * No SQL appears in screens or components.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { ClosingResolution, DailyClosing } from '@/types/dailyClosing';

// ─── Internal row type ────────────────────────────────────────────────────────

interface ClosingRow {
  date: string;
  cash_spending: number;
  digital_spending: number;
  expected_cash: number;
  actual_cash: number | null;
  difference: number | null;
  resolution: string | null;
  saved_at: string;
}

function rowToClosing(row: ClosingRow): DailyClosing {
  return {
    date: row.date,
    cashSpending: row.cash_spending,
    digitalSpending: row.digital_spending,
    expectedCash: row.expected_cash,
    actualCash: row.actual_cash,
    difference: row.difference,
    resolution: (row.resolution as ClosingResolution) ?? null,
    savedAt: row.saved_at,
  };
}

// ─── Schema migration ─────────────────────────────────────────────────────────

/**
 * Called by runMigrations() in database.ts.
 * Safe to call on existing databases — IF NOT EXISTS prevents data loss.
 */
export async function migrateDailyClosing(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_closing (
      date             TEXT    PRIMARY KEY,
      cash_spending    REAL    NOT NULL DEFAULT 0,
      digital_spending REAL    NOT NULL DEFAULT 0,
      expected_cash    REAL    NOT NULL DEFAULT 0,
      actual_cash      REAL,
      difference       REAL,
      resolution       TEXT,
      saved_at         TEXT    NOT NULL
    );
  `);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Returns the closing record for a given date, or null if none exists yet. */
export async function getClosingByDate(
  db: SQLiteDatabase,
  date: string
): Promise<DailyClosing | null> {
  const stmt = await db.prepareAsync(
    `SELECT date, cash_spending, digital_spending, expected_cash,
            actual_cash, difference, resolution, saved_at
     FROM daily_closing WHERE date = $date`
  );
  try {
    const result = await stmt.executeAsync<ClosingRow>({ $date: date });
    const row = await result.getFirstAsync();
    return row ? rowToClosing(row) : null;
  } finally {
    await stmt.finalizeAsync();
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface UpsertClosingInput {
  date: string;
  cashSpending: number;
  digitalSpending: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  resolution: ClosingResolution | null;
}

/**
 * Insert-or-replace a daily closing record.
 * Using INSERT OR REPLACE means we overwrite on the same date
 * (e.g. user updates actual cash, or changes resolution).
 */
export async function upsertClosing(
  db: SQLiteDatabase,
  input: UpsertClosingInput
): Promise<DailyClosing> {
  const now = new Date().toISOString();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO daily_closing
       (date, cash_spending, digital_spending, expected_cash,
        actual_cash, difference, resolution, saved_at)
     VALUES
       ($date, $cashSpending, $digitalSpending, $expectedCash,
        $actualCash, $difference, $resolution, $savedAt)`
  );
  try {
    await stmt.executeAsync({
      $date: input.date,
      $cashSpending: input.cashSpending,
      $digitalSpending: input.digitalSpending,
      $expectedCash: input.expectedCash,
      $actualCash: input.actualCash,
      $difference: input.difference,
      $resolution: input.resolution,
      $savedAt: now,
    });
    const saved = await getClosingByDate(db, input.date);
    if (!saved) throw new Error('upsertClosing: failed to read back saved row');
    return saved;
  } finally {
    await stmt.finalizeAsync();
  }
}
