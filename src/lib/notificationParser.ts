/**
 * notificationParser.ts
 *
 * Deterministic notification parser for detecting payment transactions.
 * Extracts amount, merchant, payment method, and calculates confidence.
 * No LLM or AI — pure regex and rule-based matching.
 */

import type { ExpenseCategory } from '@/types/expense';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TransactionType = 'expense' | 'credit' | 'refund' | 'cashback' | 'unknown';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ParsedTransaction {
  amount: number | null;
  merchant: string | null;
  paymentMethod: string | null;
  transactionType: TransactionType;
  confidence: number; // 0-100
  confidenceLevel: ConfidenceLevel;
  sourceApp: string;
  rawTitle: string;
  rawText: string;
  detectedAt: number; // Unix ms
  transactionTime: number | null; // Unix ms from notification
  fingerprint: string;
  suggestedCategory: ExpenseCategory;
}

export interface ParserConfig {
  /** Known payment app package names */
  paymentApps: string[];
  /** Keywords that indicate a transaction */
  transactionKeywords: string[];
  /** Keywords that indicate NOT a transaction */
  ignoreKeywords: string[];
  /** Keywords that indicate credit/refund (not expense) */
  creditKeywords: string[];
}

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ParserConfig = {
  paymentApps: [
    // UPI apps
    'com.google.android.apps.nbu.paisa.user',     // Google Pay
    'com.phonepe.app',                             // PhonePe
    'com.whatsapp',                                // WhatsApp Pay
    'com.simbipeasy',                              // Simbi
    'com.freecharge',                              // Freecharge
    'com.paytm',                                   // Paytm
    'in.org.npci.upiapp',                          // BHIM UPI
    'com.mobikwik',                                // MobiKwik
    // Banking apps
    'com.onmobile.truecaller',                     // Truecaller (payments)
    'com.icici.icicibankapp',                      // ICICI
    'com.sbi.sbilite',                             // SBI
    'com.idbi',                                    // IDBI
    'com.hdfcbank.hdfcpay',                        // HDFC
    'com.axis.mobile',                             // Axis Bank
    'com.kotakbank',                               // Kotak
    'com.indus',                                   // IndusInd
    'com.idbibank',                                // IDBI Bank
    'in.bajajfinserv',                             // Bajaj Finserv
    // Wallet/payment apps
    'com.amazon.mShop.android.shopping',           // Amazon
    'com.flipkart.android',                        // Flipkart
    'com.olacabs.customer',                        // Ola
    'com.ubercab',                                 // Uber
    'com.swiggy.android',                          // Swiggy
    'com.zomato',                                  // Zomato
  ],
  transactionKeywords: [
    'paid', 'payment', 'debited', 'spent', 'sent', 'transferred',
    'purchase', 'transaction successful', 'transaction of',
    'paid to', 'paid at', 'sent to', 'transferred to',
    'deducted', 'charged', 'bill paid', 'merchant payment',
    'upi transaction', 'upi payment', 'imps transfer',
    'neft transfer', 'rtgs transfer',
  ],
  ignoreKeywords: [
    'otp', 'otp for', 'your otp', 'verification code',
    'offer', 'cashback', 'reward', 'get flat', 'discount',
    'earn', 'win', 'lucky', 'coupon', 'promo',
    'balance reminder', 'low balance', 'account alert',
    'failed login', 'security alert', 'password change',
    'statement', 'account summary', 'mini statement',
    'due date', 'emi', 'installment',
    'credit card bill', 'payment due',
  ],
  creditKeywords: [
    'received', 'credited', 'refund', 'cashback',
    'reversed', 'reversal', 'returned', 'added to',
    'deposited', 'incoming', 'received from',
    'refund from', 'cashback from',
  ],
};

// ─── Amount Extraction ──────────────────────────────────────────────────────

/**
 * Extracts monetary amount from notification text.
 * Supports: ₹850, Rs 850, Rs. 850, INR 850, 850.00, ₹1,25,000
 */
export function extractAmount(text: string): number | null {
  // Pattern 1: ₹ or Rs or Rs. or INR followed by amount with optional commas/decimals
  const patterns = [
    /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR)/gi,
  ];

  const amounts: number[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1].replace(/,/g, '');
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0 && num < 10000000) { // Max 1 crore
        amounts.push(num);
      }
    }
  }

  // Also try standalone numbers that look like amounts (e.g., "850 paid")
  const standalonePattern = /\b(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)\b/g;
  let match;
  while ((match = standalonePattern.exec(text)) !== null) {
    const raw = match[1].replace(/,/g, '');
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0 && num < 10000000 && num >= 1) {
      amounts.push(num);
    }
  }

  if (amounts.length === 0) return null;

  // Return the most common amount, or the largest if no duplicates
  const amountCounts = new Map<number, number>();
  for (const amt of amounts) {
    amountCounts.set(amt, (amountCounts.get(amt) ?? 0) + 1);
  }

  let bestAmount = amounts[0];
  let bestCount = 0;
  for (const [amt, count] of amountCounts) {
    if (count > bestCount || (count === bestCount && amt > bestAmount)) {
      bestAmount = amt;
      bestCount = count;
    }
  }

  return bestAmount;
}

// ─── Merchant Extraction ────────────────────────────────────────────────────

/**
 * Extracts merchant name from notification text.
 * Looks for patterns like "to Merchant", "at Merchant", "from Merchant"
 */
export function extractMerchant(text: string): string | null {
  const patterns = [
    /(?:paid|payment|sent|transferred|transaction)\s+(?:to|at|from)\s+(.+?)(?:\s+(?:using|via|on|through|for|has|is|was|will|onward|$))/i,
    /(?:to|at|from)\s+([A-Z][A-Za-z\s&'.]+?)(?:\s+(?:using|via|on|through|for|has|is|was|will|onward|$))/,
    /(?:paid|payment|sent|transferred)\s+(?:to|at)\s+(.+?)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let merchant = match[1].trim();
      // Clean up merchant name
      merchant = merchant.replace(/\s+(using|via|on|through|for|has|is|was|will|upi|imps|neft|rtgs).*$/i, '');
      merchant = merchant.replace(/[.,;:!?]+$/, '');
      if (merchant.length >= 2 && merchant.length <= 50) {
        return merchant;
      }
    }
  }

  return null;
}

// ─── Payment Method Detection ───────────────────────────────────────────────

/**
 * Detects payment method from notification text and source app.
 */
export function detectPaymentMethod(text: string, packageName: string): string | null {
  const lowerText = text.toLowerCase();
  const lowerPackage = packageName.toLowerCase();

  // Check explicit mentions
  if (lowerText.includes('upi')) return 'UPI';
  if (lowerText.includes('imps')) return 'Bank Transfer';
  if (lowerText.includes('neft')) return 'Bank Transfer';
  if (lowerText.includes('rtgs')) return 'Bank Transfer';
  if (lowerText.includes('debit card')) return 'Debit Card';
  if (lowerText.includes('credit card')) return 'Credit Card';
  if (lowerText.includes('net banking')) return 'Bank Transfer';

  // Infer from app
  if (lowerPackage.includes('phonepe') || lowerPackage.includes('gpay') ||
      lowerPackage.includes('paytm') || lowerPackage.includes('bhim') ||
      lowerPackage.includes('freecharge') || lowerPackage.includes('mobikwik')) {
    return 'UPI';
  }

  if (lowerPackage.includes('whatsapp')) return 'UPI';

  return null;
}

// ─── Transaction Type Detection ─────────────────────────────────────────────

/**
 * Determines if this is a credit, refund, or expense.
 */
export function detectTransactionType(text: string): TransactionType {
  const lowerText = text.toLowerCase();

  for (const keyword of DEFAULT_CONFIG.creditKeywords) {
    if (lowerText.includes(keyword)) {
      if (lowerText.includes('refund') || lowerText.includes('reversed') || lowerText.includes('returned')) {
        return 'refund';
      }
      if (lowerText.includes('cashback')) return 'cashback';
      return 'credit';
    }
  }

  return 'expense';
}

// ─── Ignore Detection ───────────────────────────────────────────────────────

/**
 * Checks if notification should be ignored entirely.
 */
export function shouldIgnore(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DEFAULT_CONFIG.ignoreKeywords.some(keyword => lowerText.includes(keyword));
}

// ─── Transaction Signal Detection ───────────────────────────────────────────

/**
 * Checks if notification has strong transaction signals.
 */
export function hasTransactionSignal(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DEFAULT_CONFIG.transactionKeywords.some(keyword => lowerText.includes(keyword));
}

// ─── Confidence Calculation ─────────────────────────────────────────────────

/**
 * Calculates confidence score (0-100) for a detected transaction.
 * Deterministic — same inputs always produce same output.
 */
export function calculateConfidence(
  hasAmount: boolean,
  hasMerchant: boolean,
  hasPaymentMethod: boolean,
  hasTransactionSignal: boolean,
  transactionType: TransactionType,
  isPaymentApp: boolean,
): number {
  let score = 0;

  // Amount present (30 points)
  if (hasAmount) score += 30;

  // Merchant present (20 points)
  if (hasMerchant) score += 20;

  // Payment method present (15 points)
  if (hasPaymentMethod) score += 15;

  // Transaction signal keywords (15 points)
  if (hasTransactionSignal) score += 15;

  // Known payment app (10 points)
  if (isPaymentApp) score += 10;

  // Expense type (not credit/refund) (10 points)
  if (transactionType === 'expense') score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Returns confidence level from numeric score.
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  return 'LOW';
}

// ─── Fingerprint Generation ─────────────────────────────────────────────────

/**
 * Creates a stable fingerprint for deduplication.
 * Uses amount + merchant + source app + time window (5 min).
 */
export function generateFingerprint(
  amount: number | null,
  merchant: string | null,
  sourceApp: string,
  timestamp: number,
): string {
  const timeWindow = Math.floor(timestamp / (5 * 60 * 1000)); // 5-minute windows
  const parts = [
    amount?.toString() ?? 'unknown',
    merchant?.toLowerCase().replace(/\s+/g, '') ?? 'unknown',
    sourceApp,
    timeWindow.toString(),
  ];
  return parts.join('|');
}

// ─── Category Suggestion ────────────────────────────────────────────────────

/** Simple keyword → category mapping */
const CATEGORY_RULES: Array<{ keywords: string[]; category: ExpenseCategory }> = [
  { keywords: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'pizza', 'burger', 'dominos', 'kfc', 'mcdonald'], category: 'Food' },
  { keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'flight', 'irctc', 'makeMyTrip', 'redbus'], category: 'Travel' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'mart', 'store', 'Reliance', 'dmart'], category: 'Shopping' },
  { keywords: ['electric', 'electricity', 'water', 'gas', 'internet', 'wifi', 'recharge', 'mobile', 'broadband', 'airtel', 'jio', 'vi', 'bsnl'], category: 'Bills' },
  { keywords: ['medical', 'pharmacy', 'apollo', 'pharmeasy', 'netmeds', 'hospital', 'doctor'], category: 'Other' },
];

/**
 * Suggests a category based on merchant name and notification text.
 */
export function suggestCategory(merchant: string | null, text: string): ExpenseCategory {
  const combined = `${merchant ?? ''} ${text}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }

  return 'Other';
}

// ─── Merchant Normalization ─────────────────────────────────────────────────

/** Common merchant name normalizations */
const MERCHANT_NORMALIZATIONS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /^(?:paid to|payment to|sent to|transferred to)\s+/i, replacement: '' },
  { pattern: /\s+(?:upi|imps|neft|rtgs|via|using|through)$/i, replacement: '' },
  { pattern: /\s+indi$/i, replacement: '' },
  { pattern: /\s+\d+$/i, replacement: '' }, // Remove trailing numbers
];

/**
 * Normalizes merchant name to a clean form.
 */
export function normalizeMerchant(merchant: string): string {
  let normalized = merchant.trim();

  for (const { pattern, replacement } of MERCHANT_NORMALIZATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Capitalize first letter of each word
  normalized = normalized
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return normalized.trim();
}

// ─── Main Parser ────────────────────────────────────────────────────────────

export interface ParseOptions {
  packageName: string;
  postTime: number;
  title: string;
  text: string;
}

/**
 * Main parse function — processes a raw notification and returns a ParsedTransaction or null.
 */
export function parseNotification(options: ParseOptions): ParsedTransaction | null {
  const { packageName, postTime, title, text } = options;
  const combinedText = `${title} ${text}`;

  // Step 1: Check if should ignore
  if (shouldIgnore(combinedText)) return null;

  // Step 2: Check if it's a credit/refund/cashback (not expense)
  const transactionType = detectTransactionType(combinedText);

  // Step 3: Extract data
  const amount = extractAmount(combinedText);
  const rawMerchant = extractMerchant(combinedText);
  const merchant = rawMerchant ? normalizeMerchant(rawMerchant) : null;
  const paymentMethod = detectPaymentMethod(combinedText, packageName);

  // Step 4: Check for transaction signals
  const hasSignal = hasTransactionSignal(combinedText);
  const isPaymentApp = DEFAULT_CONFIG.paymentApps.includes(packageName);

  // Step 5: Need either amount or signal to proceed
  if (amount === null && !hasSignal && !isPaymentApp) return null;

  // Step 6: Calculate confidence
  const confidence = calculateConfidence(
    amount !== null,
    merchant !== null,
    paymentMethod !== null,
    hasSignal,
    transactionType,
    isPaymentApp,
  );

  const confidenceLevel = getConfidenceLevel(confidence);

  // Step 7: Filter out LOW confidence unless it's from a known payment app
  if (confidenceLevel === 'LOW' && !isPaymentApp) return null;

  // Step 8: Generate fingerprint
  const fingerprint = generateFingerprint(amount, merchant, packageName, postTime);

  // Step 9: Suggest category
  const suggestedCategory = suggestCategory(merchant, combinedText);

  return {
    amount,
    merchant,
    paymentMethod,
    transactionType,
    confidence,
    confidenceLevel,
    sourceApp: packageName,
    rawTitle: title,
    rawText: text,
    detectedAt: Date.now(),
    transactionTime: postTime,
    fingerprint,
    suggestedCategory,
  };
}

// ─── Utility Exports ────────────────────────────────────────────────────────

export { DEFAULT_CONFIG };
