/**
 * merchantNormalizer.ts (src/utils/merchantNormalizer.ts)
 *
 * Normalizes raw merchant/payee strings from payment notifications
 * into clean, consistent merchant names.
 *
 * Handles:
 *   "SWIGGY*ORDER" → "Swiggy"
 *   "UPI-SWIGGY" → "Swiggy"
 *   "Paid to SWIGGY" → "Swiggy"
 *   "AMAZON PAY" → "Amazon"
 *   "RELIANCE FRESH LIMITED" → "Reliance Fresh"
 *   " uber  " → "Uber"
 *   UPI IDs, transaction IDs, bank text stripped
 */

/** Known brand aliases → canonical name */
const BRAND_MAP: [RegExp, string][] = [
  // Food & Dining
  [/swiggy/i, 'Swiggy'],
  [/zomato/i, 'Zomato'],
  [/dominos/i, "Domino's"],
  [/pizza\s*hut/i, 'Pizza Hut'],
  [/mcdonald/i, "McDonald's"],
  [/\bkfc\b/i, 'KFC'],
  [/subway/i, 'Subway'],
  [/barista/i, 'Barista'],
  [/starbucks/i, 'Starbucks'],
  [/chai\s*point/i, 'Chai Point'],
  [/sagar\s*ratan/i, 'Sagar Ratan'],

  // Shopping / E-commerce
  [/amazon/i, 'Amazon'],
  [/flipkart/i, 'Flipkart'],
  [/myntra/i, 'Myntra'],
  [/meesho/i, 'Meesho'],
  [/ajio/i, 'AJIO'],
  [/nykaa/i, 'Nykaa'],

  // Grocery / Quick Commerce
  [/blinkit/i, 'Blinkit'],
  [/zepto/i, 'Zepto'],
  [/bigbasket/i, 'BigBasket'],
  [/dunzo/i, 'Dunzo'],
  [/reliance\s*fresh/i, 'Reliance Fresh'],
  [/dmart/i, 'DMart'],
  [/more\s*supermarket/i, 'More Supermarket'],
  [/jiomart/i, 'JioMart'],
  [/swiggy\s*instamart/i, 'Instamart'],

  // Travel / Transport
  [/uber/i, 'Uber'],
  [/\bola\b/i, 'Ola'],
  [/rapido/i, 'Rapido'],
  [/irctc/i, 'IRCTC'],
  [/redbus/i, 'RedBus'],
  [/makemytrip/i, 'MakeMyTrip'],
  [/goibibo/i, 'Goibibo'],
  [/blablacar/i, 'BlaBlaCar'],

  // Bills / Telecom
  [/airtel/i, 'Airtel'],
  [/\bjio\b/i, 'Jio'],
  [/\bvi\b/i, 'Vi'],
  [/bsnl/i, 'BSNL'],
  [/bescom/i, 'BESCOM'],
  [/tata\s*power/i, 'Tata Power'],
  [/adani\s*electric/i, 'Adani Electric'],

  // Health
  [/apollo/i, 'Apollo'],
  [/pharmeasy/i, 'PharmEasy'],
  [/1mg/i, '1mg'],
  [/practo/i, 'Practo'],
  [/medplus/i, 'MedPlus'],
  [/netmeds/i, 'NetMeds'],
  [/pharmacie/i, 'Pharmacy'],

  // Entertainment
  [/netflix/i, 'Netflix'],
  [/prime\s*video/i, 'Prime Video'],
  [/hotstar/i, 'Hotstar'],
  [/disney/i, 'Disney+ Hotstar'],
  [/spotify/i, 'Spotify'],
  [/\bpvr\b/i, 'PVR'],
  [/inox/i, 'INOX'],
  [/bookmyshow/i, 'BookMyShow'],
  [/sonyliv/i, 'SonyLIV'],
  [/jio\s*cinema/i, 'Jio Cinema'],

  // Payments / Wallets
  [/paytm/i, 'Paytm'],
  [/phonepe/i, 'PhonePe'],
  [/gpay/i, 'Google Pay'],
  [/google\s*pay/i, 'Google Pay'],
  [/mobikwik/i, 'MobiKwik'],
  [/freecharge/i, 'Freecharge'],

  // Food Delivery / Cloud Kitchens
  [/swiggy\s*foods/i, 'Swiggy'],
  [/zomato\s*order/i, 'Zomato'],
];

/** Stripped noise tokens before brand matching */
const NOISE_PREFIXES = [
  /^(paid to|payment to|vpa|to|sent to|transfer to|txn|transaction|order)\s+/i,
  /^(upi[-\s]|bhim[-\s]|gpay[-\s]|phonepe[-\s]|paytm[-\s])/i,
];

const NOISE_SUFFIXES = [
  /\s+(via|using|on|upi|netbanking|pvt ltd|ltd|inc|in|india)$/i,
  /\s+upi$/i,
  /\s+@\s*\S+$/i,                         // VPA handle "@okaxis"
  /\s+\d{8,}$/i,                           // trailing transaction IDs
  /\s+ref[:\s]*\S+$/i,                     // "Ref: ABC123"
  /\s+ref\s*no[:\s]*\S+$/i,               // "Ref No: 123456"
  /\s+order\s*#?\s*\S+$/i,               // "Order #12345"
  /\s+txn\s*id[:\s]*\S+$/i,              // "Txn Id: ..."
  /\s+utr[:\s]*\S+$/i,                    // "UTR: ..."
];

export function normalizeMerchant(rawMerchant: string): string {
  if (!rawMerchant) return 'Unknown Merchant';

  let cleaned = rawMerchant.trim();
  if (!cleaned) return 'Unknown Merchant';

  // 1. Strip noise prefixes
  for (const pat of NOISE_PREFIXES) {
    cleaned = cleaned.replace(pat, '');
  }

  // 2. Strip noise suffixes
  for (const pat of NOISE_SUFFIXES) {
    cleaned = cleaned.replace(pat, '');
  }

  // 3. Strip remaining UPI-specific noise
  cleaned = cleaned
    .replace(/[-_]+/g, ' ')            // dashes/underscores → spaces
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim();

  // 4. Try exact brand matching first
  for (const [pattern, canonical] of BRAND_MAP) {
    if (pattern.test(cleaned)) {
      return canonical;
    }
  }

  // 5. Fallback: Title Case if ALL CAPS or all lowercase
  if (cleaned === cleaned.toUpperCase() || cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // 6. Strip trailing corporate suffixes
  cleaned = cleaned.replace(/\s+(pvt\.?\s*ltd|ltd|inc|llc|co\.?|corp\.?)$/i, '');

  return cleaned.trim() || 'Unknown Merchant';
}
