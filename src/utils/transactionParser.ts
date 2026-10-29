/**
 * transactionParser.ts (src/utils/transactionParser.ts)
 *
 * Core engine for M13 Smart Transaction Intelligence.
 * Parses raw notification text, evaluates evidence, filters invalid/promo/OTP/credit texts,
 * generates a deduplication fingerprint, calculates deterministic confidence, and suggests category.
 *
 * M13 enhancements over M12:
 * - Improved confidence scoring with weighted evidence signals
 * - Source app trust scoring
 * - Known merchant bonus
 * - User learning integration for category overrides
 */

import type { PaymentMethod } from '@/types/expense';
import type { ConfidenceLevel, TransactionType } from '@/types/detectedTransaction';
import { suggestCategory } from './categorySuggester';
import { normalizeMerchant } from './merchantNormalizer';

export interface ParsedTransactionResult {
  isTransaction: boolean;
  rejectReason?: string;
  fingerprint?: string;
  amount?: number;
  merchant?: string;
  paymentMethod?: PaymentMethod;
  transactionType?: TransactionType;
  confidence?: number;
  confidenceLevel?: ConfidenceLevel;
  suggestedCategory?: string;
  transactionTime?: string;
}

// ── Ignore patterns ──────────────────────────────────────────────────────
const IGNORE_PATTERNS = [
  /\botp\b/i,
  /\bone time password\b/i,
  /\bverification code\b/i,
  /\bsecret code\b/i,
  /\bdo not share\b/i,
  /\boffer\b/i,
  /\bcashback\b/i,
  /\bdiscount\b/i,
  /\bpromo\b/i,
  /\bwin\b/i,
  /\bcongratulations\b/i,
  /\bfailed login\b/i,
  /\balert: login\b/i,
  /\bbalance is\b/i,
  /\bavailable balance\b/i,
  /\bacc bal\b/i,
  /\baccount balance\b/i,
  /\breminder\b/i,
  /\bdue date\b/i,
  /\bcredit score\b/i,
  /\bnew offer\b/i,
  /\bspecial offer\b/i,
];

// ── Credit / Refund / Reversal ───────────────────────────────────────────
const CREDIT_PATTERNS = [
  /\bcredited\b/i,
  /\breceived\b/i,
  /\brefund\b/i,
  /\breversed\b/i,
  /\breversal\b/i,
  /\bcashback received\b/i,
  /\badded to account\b/i,
  /\badded to wallet\b/i,
  /\bincoming\b/i,
  /\bdeposited\b/i,
];

// ── Debit / Expense evidence ─────────────────────────────────────────────
const DEBIT_EVIDENCE_PATTERNS = [
  /\bpaid\b/i,
  /\bpayment\b/i,
  /\bdebited\b/i,
  /\bspent\b/i,
  /\bsent\b/i,
  /\btransferred\b/i,
  /\bpurchase\b/i,
  /\btransaction successful\b/i,
  /\bsuccessfully paid\b/i,
  /\bauto-debited\b/i,
  /\bcharged\b/i,
];

// ── Known source apps (UPI/payment apps that send real transaction notifs) ─
const KNOWN_SOURCE_APPS = new Set([
  'com.google.android.apps.nbu.paisa.user',   // Google Pay
  'com.phonepe.app',                           // PhonePe
  'com.paytm.umobile',                         // Paytm
  'com.whatsapp',                              // WhatsApp Pay
  'com.amazon.mShop.android.shopping',          // Amazon
  'com.flipkart.android',                       // Flipkart
]);

// ── Known merchants (boosts confidence) ──────────────────────────────────
const KNOWN_MERCHANTS = new Set([
  'swiggy', 'zomato', 'uber', 'ola', 'amazon', 'flipkart',
  'airtel', 'jio', 'netflix', 'spotify', 'apollo',
  'phonepe', 'paytm', 'google pay',
]);

/** Trusted source apps with recognizable payment notification format */
const TRUSTED_APPS = new Set([
  'com.google.android.apps.nbu.paisa.user',
  'com.phonepe.app',
  'com.paytm.umobile',
]);

/**
 * Extracts numeric amount supporting ₹, Rs, Rs., INR.
 */
export function extractAmount(text: string): number | null {
  const match = text.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (match?.[1]) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }

  const fallback = text.match(
    /(?:paid|debited|spent|of|rs\.?|inr|₹)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (fallback?.[1]) {
    const val = parseFloat(fallback[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

/**
 * Detects PaymentMethod from combined text and source app.
 */
export function detectPaymentMethod(text: string, packageName: string): PaymentMethod {
  const combined = `${packageName} ${text}`.toLowerCase();

  if (combined.includes('upi') || combined.includes('gpay') || combined.includes('phonepe') || combined.includes('paytm') || combined.includes('bhim')) return 'UPI';
  if (combined.includes('credit card') || combined.includes('card ending') || combined.includes('cc')) return 'Credit Card';
  if (combined.includes('debit card') || combined.includes('dc')) return 'Debit Card';
  if (combined.includes('netbanking') || combined.includes('bank transfer') || combined.includes('neft') || combined.includes('rtgs') || combined.includes('imps')) return 'Bank Transfer';

  return 'UPI';
}

/**
 * Extracts candidate merchant/payee name from notification text.
 */
export function extractMerchant(text: string, title: string): string {
  const patterns = [
    /(?:paid to|sent to|transfer to|payment to|at|towards)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:using|via|on|ref|vpa|val|date|for|rs|inr|₹|\.|$))/i,
    /(?:to)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:using|via|on|ref|vpa|val|date|for|rs|inr|₹|\.|$))/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1] && m[1].trim().length >= 2) {
      return normalizeMerchant(m[1].trim());
    }
  }

  // Fallback to title if it looks like a merchant name
  if (title && !/bank|alert|notification|update/i.test(title)) {
    return normalizeMerchant(title);
  }

  return 'Digital Merchant';
}

/**
 * Generates a stable deduplication fingerprint.
 */
export function generateFingerprint(
  sourceApp: string,
  amount: number,
  merchant: string,
  postTime: number
): string {
  const roundedTimeSlot = Math.floor(postTime / (1000 * 60 * 2));
  const normMerchant = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${sourceApp}:${amount}:${normMerchant}:${roundedTimeSlot}`;
}

/**
 * Calculates deterministic confidence score (0-100).
 *
 * Evidence signals and weights:
 *   Amount extracted:              +15
 *   Currency symbol present:       +10
 *   Debit keyword(s):             +5 per keyword (max +15)
 *   2+ debit keywords:            +5 bonus
 *   Merchant extracted (non-default): +10
 *   Known merchant:               +5
 *   Known source app:             +5
 *   Trusted payment app:          +5
 *   Success/debit confirmation:   +5
 *   Payment method detected:      +5
 *
 * Caps at 98. Transactions below 60 are rejected.
 */
function calculateConfidence(
  combinedText: string,
  amount: number | null,
  merchant: string,
  paymentMethod: string,
  sourceApp: string,
  debitMatches: number
): number {
  let confidence = 0;

  // Amount extracted
  if (amount) confidence += 15;

  // Currency symbol present
  if (/₹|Rs|INR/i.test(combinedText)) confidence += 10;

  // Debit evidence keywords
  confidence += Math.min(debitMatches * 5, 15);
  if (debitMatches >= 2) confidence += 5;

  // Merchant extracted
  if (merchant && merchant !== 'Digital Merchant') confidence += 10;

  // Known merchant bonus
  const merchantLower = merchant.toLowerCase();
  if (KNOWN_MERCHANTS.has(merchantLower)) confidence += 5;

  // Known source app
  if (KNOWN_SOURCE_APPS.has(sourceApp)) confidence += 5;

  // Trusted payment app (Google Pay, PhonePe, Paytm)
  if (TRUSTED_APPS.has(sourceApp)) confidence += 5;

  // Success / debit confirmation keywords
  if (/successful|debited|charged/i.test(combinedText)) confidence += 5;

  // Payment method detected (not default)
  if (paymentMethod && paymentMethod !== 'Other') confidence += 5;

  return Math.min(98, confidence);
}

/**
 * Parses raw notification data and returns a result.
 *
 * @param title - Notification title
 * @param text - Notification body text
 * @param sourceApp - Android package name
 * @param postTime - Timestamp in milliseconds
 * @param learnedOverrides - Optional Map of merchant→category from user learning
 */
export function parseNotification(
  title: string,
  text: string,
  sourceApp: string,
  postTime: number,
  learnedOverrides?: Map<string, import('@/types/expense').ExpenseCategory>
): ParsedTransactionResult {
  const combinedText = `${title} ${text}`.trim();

  // 1. Check ignore rules
  for (const pat of IGNORE_PATTERNS) {
    if (pat.test(combinedText)) {
      return { isTransaction: false, rejectReason: 'Ignored keyword (OTP/Promo/Offer/Balance/Alert)' };
    }
  }

  // 2. Check for credit / refund
  for (const pat of CREDIT_PATTERNS) {
    if (pat.test(combinedText)) {
      return { isTransaction: false, rejectReason: 'Transaction is credit/refund/reversal, not an expense' };
    }
  }

  // 3. Extract amount
  const amount = extractAmount(combinedText);
  if (!amount) {
    return { isTransaction: false, rejectReason: 'No valid monetary amount detected' };
  }

  // 4. Check debit evidence
  let debitMatches = 0;
  for (const pat of DEBIT_EVIDENCE_PATTERNS) {
    if (pat.test(combinedText)) debitMatches++;
  }

  if (debitMatches === 0) {
    return { isTransaction: false, rejectReason: 'Insufficient transaction evidence keywords' };
  }

  // 5. Extract merchant & payment method
  const merchant = extractMerchant(combinedText, title);
  const paymentMethod = detectPaymentMethod(combinedText, sourceApp);

  // 6. Suggest category (with user learning override)
  const suggestedCategory = suggestCategory(merchant, combinedText, learnedOverrides);

  // 7. Calculate confidence
  const confidence = calculateConfidence(
    combinedText, amount, merchant, paymentMethod, sourceApp, debitMatches
  );

  let confidenceLevel: ConfidenceLevel = 'LOW';
  if (confidence >= 80) confidenceLevel = 'HIGH';
  else if (confidence >= 60) confidenceLevel = 'MEDIUM';

  // Reject LOW confidence
  if (confidence < 60) {
    return { isTransaction: false, rejectReason: 'Confidence score too low (<60%)' };
  }

  const fingerprint = generateFingerprint(sourceApp, amount, merchant, postTime);
  const transactionTime = new Date(postTime).toISOString();

  return {
    isTransaction: true,
    fingerprint,
    amount,
    merchant,
    paymentMethod,
    transactionType: 'expense',
    confidence,
    confidenceLevel,
    suggestedCategory,
    transactionTime,
  };
}
