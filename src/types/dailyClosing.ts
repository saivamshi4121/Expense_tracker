/**
 * dailyClosing.ts  (src/types/dailyClosing.ts)
 *
 * TypeScript types for the Daily Closing feature.
 * All SQL lives in src/db/dailyClosing.ts.
 */

/**
 * What the user chose to do when a cash difference was found.
 * null  = difference has not been resolved yet (or there was no difference).
 */
export type ClosingResolution =
  | 'resolved'       // difference was 0 — everything matched
  | 'forgot'         // user pressed "I Don't Remember"
  | 'review_later';  // user pressed "Review Later"

export interface DailyClosing {
  /** date string  "YYYY-MM-DD" — primary key */
  date: string;

  /** Total of today's Cash expenses */
  cashSpending: number;

  /** Total of today's non-Cash (digital) expenses */
  digitalSpending: number;

  /** Expected cash balance at close of day */
  expectedCash: number;

  /**
   * Actual cash the user counted.
   * null = user hasn't entered it yet.
   */
  actualCash: number | null;

  /**
   * expectedCash - actualCash.
   * null if actualCash is null.
   */
  difference: number | null;

  /** How the user resolved the difference (or null if not yet resolved). */
  resolution: ClosingResolution | null;

  /** ISO timestamp of last save */
  savedAt: string;
}
