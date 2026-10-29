/**
 * wallet.ts
 *
 * TypeScript types for the Cash Wallet feature.
 * All SQL lives in src/db/wallet.ts — never in components or screens.
 */

export interface CashWallet {
  /** Singleton row id — always 1 */
  id: number;

  /**
   * The starting cash amount set by the user.
   * Expected Cash = initialBalance - (sum of Cash expenses)
   */
  initialBalance: number;

  /**
   * The last actual cash amount the user physically counted.
   * null means the user has never entered an actual balance.
   */
  actualBalance: number | null;

  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}
