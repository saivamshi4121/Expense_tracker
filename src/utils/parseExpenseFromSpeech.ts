/**
 * parseExpenseFromSpeech.ts (src/utils/parseExpenseFromSpeech.ts)
 *
 * Extracts expense details from speech-to-text transcriptions.
 * Supports multi-language input (English, Hindi, Telugu, Tamil, etc.)
 * and code-switched (mixed language) input.
 *
 * Extracts: amount, merchant/description, category, payment method.
 */

import type { ExpenseCategory, PaymentMethod } from '@/types/expense';
import { suggestCategory } from './categorySuggester';
import { normalizeMerchant } from './merchantNormalizer';

export interface ParsedExpense {
  amount: number | null;
  merchant: string | null;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  rawText: string;
}

// ─── Amount Extraction ────────────────────────────────────────────────────

// Currency keywords in multiple Indian languages
const CURRENCY_KEYWORDS = [
  // English
  'rupees', 'ruppee', 'ruppee', 'rs', 'inr',
  // Hindi
  'रुपये', 'रुपय', 'रूपये', 'रूपय', 'rupaye',
  // Telugu
  'రూపాయలు', 'రూపాయి', 'rupayalu',
  // Tamil
  'ரூபாய்', 'ரூபாய்', 'rubai',
  // Kannada
  'ರೂಪಾಯಿ', 'ರೂಪಾಯಿಗಳು', 'rupayi',
  // Malayalam
  'രൂപ', 'രൂപയ', 'rupa',
  // Marathi
  'रुपये', 'रुपयं',
  // Bengali
  'টাকা', 'টাকার',
  // Generic symbol
  '₹',
];

// Number words in multiple languages for natural number expressions
const NUMBER_WORDS: Record<string, number> = {
  // English
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
  // Hindi
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50,
  'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  'सौ': 100, 'हज़ार': 1000, 'हजार': 1000,
  // Telugu
  'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
  'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'ఇరవై': 20, 'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50,
  '�రవై': 60, 'డెబ్బై': 70, 'ఎనభై': 80, 'తొంబై': 90,
  'నూరు': 100, 'వేయి': 1000,
};

/**
 * Extracts a numeric amount from speech text.
 * Handles:
 *   "250 rupees", "₹250", "250 रुपये", "250 రూపాయలు"
 *   "two hundred fifty", "दो सौ पचास"
 *   "250.50", "250 point 5"
 */
export function extractAmount(text: string): number | null {
  if (!text) return null;

  // Normalize the text
  let normalized = text.trim().toLowerCase();

  // Try to find amount with currency symbol/keyword patterns
  // Pattern: number followed by currency keyword
  const currencyPattern = new RegExp(
    `(\\d+(?:[.,]\\d+)?)\\s*(?:${CURRENCY_KEYWORDS.join('|')})`,
    'i'
  );
  let match = normalized.match(currencyPattern);
  if (match) {
    const num = parseNumber(match[1]);
    if (num !== null && num > 0) return num;
  }

  // Pattern: currency keyword followed by number
  const reversePattern = new RegExp(
    `(?:${CURRENCY_KEYWORDS.join('|')})\\s*(\\d+(?:[.,]\\d+)?)`,
    'i'
  );
  match = normalized.match(reversePattern);
  if (match) {
    const num = parseNumber(match[1]);
    if (num !== null && num > 0) return num;
  }

  // Pattern: ₹ symbol directly followed by number
  const rupeePattern = /[₹]\s*(\d+(?:[.,]\d+)?)/;
  match = normalized.match(rupeePattern);
  if (match) {
    const num = parseNumber(match[1]);
    if (num !== null && num > 0) return num;
  }

  // Try to find any standalone number
  const standaloneNumber = normalized.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (standaloneNumber) {
    const num = parseNumber(standaloneNumber[1]);
    if (num !== null && num > 0) return num;
  }

  // Try word-to-number conversion
  const wordAmount = extractAmountFromWords(normalized);
  if (wordAmount !== null && wordAmount > 0) return wordAmount;

  return null;
}

function parseNumber(str: string): number | null {
  // Handle Indian number format (commas as thousand separators)
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractAmountFromWords(text: string): number | null {
  const words = text.split(/\s+/);
  let total = 0;
  let current = 0;
  let foundNumber = false;

  for (const word of words) {
    const value = NUMBER_WORDS[word];
    if (value !== undefined) {
      foundNumber = true;
      if (value === 100) {
        current = current === 0 ? 100 : current * 100;
      } else if (value === 1000) {
        current = current === 0 ? 1000 : current * 1000;
        total += current;
        current = 0;
      } else if (value >= 10) {
        current += value;
      } else {
        current += value;
      }
    }
  }

  total += current;
  return foundNumber && total > 0 ? total : null;
}

// ─── Merchant / Description Extraction ────────────────────────────────────

// Common prepositions and connectors in multiple languages
const CONNECTORS = [
  // English
  'on', 'at', 'for', 'to', 'from', 'of', 'in', 'with',
  // Hindi
  'पर', 'में', 'से', 'को', 'के', 'लिए', 'pe', 'mein', 'se',
  // Telugu
  'లో', 'కి', 'నుండి', 'కోసం', 'తో',
  // Tamil
  'இல்', 'க்கு', 'இருந்து', 'க்காக',
  // Kannada
  'ನಲ್ಲಿ', 'ಗೆ', 'ಇಂದ', 'ಗಾಗಿ',
  // Malayalam
  'ഇൽ', 'ന്', 'ൽ നിന്ന്',
  // Marathi
  'ला', 'मध्ये', 'पासून',
  // Bengali
  'তে', 'র', 'থেকে',
  // Code-switch connectors
  'ki', 'lo', 'ka', 'ke', 'ko',
];

// Common expense-related words in multiple languages (to be excluded from merchant)
const EXPENSE_WORDS = [
  // English
  'spent', 'pay', 'paid', 'expense', 'cost', 'bill', 'purchase', 'bought',
  'lunch', 'dinner', 'breakfast', 'food', 'tea', 'coffee', 'snack',
  'ride', 'trip', 'travel', 'fuel', 'petrol', 'gas',
  'shop', 'store', 'market', 'grocery',
  'recharge', 'bill', 'payment',
  // Hindi
  'खर्च', 'दिया', 'किया', 'लिया', 'खाना', 'चाय',
  // Telugu
  'ఖర్చు', 'చేశాను', 'కొన్నాను', 'తిన్నాను', 'చేసా',
  // Tamil
  'செலவு', 'கொடுத்தேன்', 'வாங்கினேன்',
  // Kannada
  'ಖರ್ಚು', 'ಕೊಟ್ಟೆ', 'ತಿಂದೆ',
];

/**
 * Extracts merchant or description from speech text.
 * Removes amount, currency words, connectors, and expense words.
 * Applies merchant normalization for known brands.
 */
export function extractMerchant(text: string, amount: number | null): string | null {
  if (!text) return null;

  let cleaned = text.trim().toLowerCase();

  // Remove amount patterns
  cleaned = cleaned.replace(/\d+(?:[.,]\d+)?/g, '');
  cleaned = cleaned.replace(/[₹]/g, '');

  // Remove currency keywords
  for (const kw of CURRENCY_KEYWORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '');
  }

  // Remove expense-related words
  for (const w of EXPENSE_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
  }

  // Remove connectors
  for (const c of CONNECTORS) {
    cleaned = cleaned.replace(new RegExp(`\\b${c}\\b`, 'gi'), '');
  }

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If nothing meaningful left, return null
  if (cleaned.length < 2) return null;

  // Try to normalize as a known merchant
  const normalized = normalizeMerchant(cleaned);
  if (normalized && normalized !== 'Unknown Merchant') {
    return normalized;
  }

  // Return cleaned text as description (title-case)
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Payment Method Detection ─────────────────────────────────────────────

const CASH_KEYWORDS = [
  // English
  'cash', 'cash paid', 'paid cash', 'in cash',
  // Hindi
  'नकद', 'नगद', 'cash diya',
  // Telugu
  'క్యాష్', 'నగదు',
  // Tamil
  'பணம்', 'கேஷ்',
  // Kannada
  'ನಗದು', 'ಕ್ಯಾಶ್',
  // Malayalam
  'പണം', 'ക്യാഷ്',
  // Marathi
  'रोख', 'नगद',
  // Bengali
  'নগদ',
];

const UPI_KEYWORDS = [
  // English
  'upi', 'gpay', 'google pay', 'phonepe', 'phone pe', 'paytm',
  'bhim', 'qr code', 'scan',
  // Hindi
  'यूपीआई',
  // Telugu
  'యూపీఐ',
];

/**
 * Detects payment method from speech text.
 * Defaults to 'Cash' for quick-cash screen context.
 */
export function detectPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase();

  // Check for UPI keywords
  for (const kw of UPI_KEYWORDS) {
    if (lower.includes(kw)) return 'UPI';
  }

  // Check for card keywords
  if (/\b(card|credit|debit)\b/i.test(lower)) {
    if (/credit/i.test(lower)) return 'Credit Card';
    if (/debit/i.test(lower)) return 'Debit Card';
    return 'Debit Card';
  }

  // Check for bank transfer
  if (/\b(bank|transfer|neft|rtgs|imps)\b/i.test(lower)) {
    return 'Bank Transfer';
  }

  // Default to Cash (for quick-cash context)
  return 'Cash';
}

// ─── Category Suggestion ──────────────────────────────────────────────────

/**
 * Suggests category based on extracted merchant and raw text.
 * Uses the existing categorySuggester with its keyword rules.
 */
function suggestCategoryForSpeech(
  merchant: string | null,
  rawText: string
): ExpenseCategory {
  return suggestCategory(merchant || '', rawText);
}

// ─── Main Parser ──────────────────────────────────────────────────────────

/**
 * Parses speech text into a structured expense object.
 *
 * @param text - Raw speech-to-text transcription
 * @returns ParsedExpense with extracted fields (amount may be null)
 */
export function parseExpenseFromSpeech(text: string): ParsedExpense {
  const TAG = '[VOICE-PARSER]';
  console.log(`${TAG} Input received: "${text}"`);

  const amount = extractAmount(text);
  console.log(`${TAG} Amount = ${amount}`);

  const merchant = extractMerchant(text, amount);
  console.log(`${TAG} Merchant = ${merchant}`);

  const category = suggestCategoryForSpeech(merchant, text);
  console.log(`${TAG} Category = ${category}`);

  const paymentMethod = detectPaymentMethod(text);
  console.log(`${TAG} Payment method = ${paymentMethod}`);

  if (amount === null && !merchant) {
    console.log(`${TAG} Could not extract expense — no amount or merchant found`);
  }

  return {
    amount,
    merchant,
    category,
    paymentMethod,
    rawText: text,
  };
}
