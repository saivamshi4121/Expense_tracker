/**
 * categorySuggester.ts (src/utils/categorySuggester.ts)
 *
 * Deterministically suggests an ExpenseCategory based on merchant name and notification text.
 * Returns one of: Food, Travel, Shopping, Bills, Other.
 *
 * Health → Other, Entertainment → Other (only 5 categories exist in the type system).
 */

import type { ExpenseCategory } from '@/types/expense';

interface CategoryRule {
  category: ExpenseCategory;
  keywords: string[];
}

/**
 * Ordered rules — first match wins. More specific rules come first.
 * Each keyword is tested against `merchant + text` (lowercased).
 */
const CATEGORY_RULES: CategoryRule[] = [
  // Food & Dining
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'dominos', 'pizza hut', 'mcdonald', 'kfc', 'subway',
      'barista', 'starbucks', 'chai point', 'food', 'restaurant', 'cafe',
      'bakery', 'tea', 'coffee', 'meal', 'lunch', 'dinner', 'breakfast',
      'sagar ratan', 'haldiram', 'bikaner', 'pizza', 'burger', 'biryani',
      'instamart', 'swiggy instamart',
    ],
  },

  // Travel / Transport
  {
    category: 'Travel',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'irctc', 'redbus', 'makemytrip',
      'goibibo', 'blablacar', 'petrol', 'fuel', 'cab', 'auto', 'flight',
      'bus', 'train', 'parking', 'toll', 'fastag',
    ],
  },

  // Shopping / Groceries / E-commerce
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'nykaa',
      'blinkit', 'zepto', 'bigbasket', 'dunzo', 'reliance fresh', 'dmart',
      'more supermarket', 'jiomart', 'mart', 'supermarket', 'grocery',
      'retail', 'store', 'shopping', 'mall',
    ],
  },

  // Bills / Utilities / Telecom
  {
    category: 'Bills',
    keywords: [
      'airtel', 'jio', 'vi ', 'bsnl', 'bescom', 'electricity', 'bill',
      'recharge', 'wifi', 'broadband', 'gas', 'rent', 'water',
      'tata power', 'adani electric', 'insurance', 'emi',
    ],
  },

  // Health → Other (no separate Health category in type system)
  {
    category: 'Other',
    keywords: [
      'apollo', 'pharmacy', 'pharmeasy', '1mg', 'practo', 'medplus',
      'netmeds', 'hospital', 'medical', 'doctor', 'clinic', 'diagnostic',
      'lab', 'health', 'medicine',
    ],
  },

  // Entertainment → Other
  {
    category: 'Other',
    keywords: [
      'netflix', 'prime video', 'hotstar', 'disney', 'spotify', 'pvr',
      'inox', 'bookmyshow', 'sonyliv', 'jio cinema', 'youtube',
      'cinema', 'movie', 'music', 'gaming', 'steam',
    ],
  },
];

/**
 * Suggests an ExpenseCategory from merchant name and notification text.
 * Accepts an optional learned override map (merchant → category) for user learning.
 */
export function suggestCategory(
  merchant: string,
  text: string,
  learnedOverrides?: Map<string, ExpenseCategory>
): ExpenseCategory {
  // Check learned overrides first
  if (learnedOverrides && merchant) {
    const learned = learnedOverrides.get(merchant.toLowerCase());
    if (learned) return learned;
  }

  const query = `${merchant} ${text}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (query.includes(kw)) {
        return rule.category;
      }
    }
  }

  return 'Other';
}
