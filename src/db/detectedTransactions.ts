/**
 * detectedTransactions.ts (src/db/detectedTransactions.ts)
 *
 * SQLite CRUD for detected_transactions table.
 * Stores auto-detected payments separate from finalized expenses.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { DetectedStatus, DetectedTransaction, ConfidenceLevel } from '@/types/detectedTransaction';
import type { PaymentMethod } from '@/types/expense';

interface DetectedRow {
  id: number;
  fingerprint: string;
  amount: number;
  merchant: string;
  payment_method: string;
  transaction_type: string;
  source_app: string;
  detected_at: string;
  transaction_time: string;
  confidence: number;
  confidence_level: string;
  status: string;
  raw_text: string | null;
  suggested_category: string | null;
}

function rowToDetected(row: DetectedRow): DetectedTransaction {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    amount: row.amount,
    merchant: row.merchant,
    paymentMethod: (row.payment_method as PaymentMethod) || 'UPI',
    transactionType: (row.transaction_type as any) || 'expense',
    sourceApp: row.source_app,
    detectedAt: row.detected_at,
    transactionTime: row.transaction_time,
    confidence: row.confidence,
    confidenceLevel: (row.confidence_level as ConfidenceLevel) || 'MEDIUM',
    status: (row.status as DetectedStatus) || 'pending',
    rawText: row.raw_text ?? undefined,
    suggestedCategory: row.suggested_category ?? undefined,
  };
}

/**
 * Migration helper for detected_transactions table (Milestone 12).
 * Also creates merchant_categories table for M13 user learning.
 */
export async function migrateDetectedTransactions(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS detected_transactions (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint        TEXT    UNIQUE NOT NULL,
      amount             REAL    NOT NULL,
      merchant           TEXT    NOT NULL,
      payment_method     TEXT    NOT NULL,
      transaction_type   TEXT    NOT NULL DEFAULT 'expense',
      source_app         TEXT    NOT NULL,
      detected_at        TEXT    NOT NULL,
      transaction_time   TEXT    NOT NULL,
      confidence         INTEGER NOT NULL,
      confidence_level   TEXT    NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'pending',
      raw_text           TEXT,
      suggested_category TEXT
    );
  `);

  // M13: Merchant category learning table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS merchant_categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant    TEXT    UNIQUE NOT NULL,
      category    TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );
  `);
}

/**
 * Inserts a detected transaction if the fingerprint is not already present.
 * Returns true if inserted, false if ignored as duplicate.
 */
export async function insertDetectedTransaction(
  db: SQLiteDatabase,
  data: Omit<DetectedTransaction, 'id'>
): Promise<boolean> {
  const stmt = await db.prepareAsync(
    `INSERT OR IGNORE INTO detected_transactions (
      fingerprint, amount, merchant, payment_method, transaction_type,
      source_app, detected_at, transaction_time, confidence, confidence_level,
      status, raw_text, suggested_category
    ) VALUES (
      $fingerprint, $amount, $merchant, $paymentMethod, $transactionType,
      $sourceApp, $detectedAt, $transactionTime, $confidence, $confidenceLevel,
      $status, $rawText, $suggestedCategory
    );`
  );

  try {
    const res = await stmt.executeAsync({
      $fingerprint: data.fingerprint,
      $amount: data.amount,
      $merchant: data.merchant,
      $paymentMethod: data.paymentMethod,
      $transactionType: data.transactionType,
      $sourceApp: data.sourceApp,
      $detectedAt: data.detectedAt,
      $transactionTime: data.transactionTime,
      $confidence: data.confidence,
      $confidenceLevel: data.confidenceLevel,
      $status: data.status,
      $rawText: data.rawText ?? null,
      $suggestedCategory: data.suggestedCategory ?? null,
    });
    return (res.changes ?? 0) > 0;
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Gets pending detected transactions for the review queue.
 */
export async function getPendingDetectedTransactions(
  db: SQLiteDatabase
): Promise<DetectedTransaction[]> {
  const stmt = await db.prepareAsync(
    `SELECT * FROM detected_transactions
     WHERE status = 'pending'
     ORDER BY transaction_time DESC;`
  );
  try {
    const result = await stmt.executeAsync<DetectedRow>({});
    const rows = await result.getAllAsync();
    return rows.map(rowToDetected);
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Updates the status of a detected transaction (e.g. 'accepted' or 'ignored').
 */
export async function updateDetectedStatus(
  db: SQLiteDatabase,
  id: number,
  status: DetectedStatus
): Promise<void> {
  const stmt = await db.prepareAsync(
    `UPDATE detected_transactions SET status = $status WHERE id = $id;`
  );
  try {
    await stmt.executeAsync({ $status: status, $id: id });
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * DEV/TEST ONLY: Deletes all detected transactions with a given source_app prefix.
 */
export async function clearDetectedBySourceApp(
  db: SQLiteDatabase,
  sourceApp: string
): Promise<number> {
  const result = await db.runAsync(
    `DELETE FROM detected_transactions WHERE source_app = $sourceApp;`,
    { $sourceApp: sourceApp }
  );
  return result.changes ?? 0;
}

// ── M13: Merchant Category Learning ───────────────────────────────────────

/**
 * Saves a user's category preference for a merchant.
 * Overwrites any existing preference (upsert).
 */
export async function saveMerchantCategory(
  db: SQLiteDatabase,
  merchant: string,
  category: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO merchant_categories (merchant, category, updated_at)
     VALUES ($merchant, $category, $updated)
     ON CONFLICT(merchant) DO UPDATE SET category = $category, updated_at = $updated;`,
    { $merchant: merchant, $category: category, $updated: now }
  );
}

/**
 * Loads all learned merchant→category preferences as a Map.
 */
export async function getLearnedMerchantCategories(
  db: SQLiteDatabase
): Promise<Map<string, string>> {
  const result = await db.getAllAsync<{ merchant: string; category: string }>(
    `SELECT merchant, category FROM merchant_categories;`
  );
  const map = new Map<string, string>();
  for (const row of result) {
    map.set(row.merchant.toLowerCase(), row.category);
  }
  return map;
}

/**
 * Checks if a merchant category was learned by user (not rule-based).
 */
export async function isMerchantCategoryLearned(
  db: SQLiteDatabase,
  merchant: string
): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM merchant_categories WHERE merchant = $merchant;`,
    { $merchant: merchant }
  );
  return (result?.count ?? 0) > 0;
}
