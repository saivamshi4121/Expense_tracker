/**
 * Formats a numeric amount as an INR currency string.
 *
 * Whole rupees omit the paise (₹250, ₹1,250).
 * Amounts with paise show two decimal places (₹250.50).
 *
 * @example
 * formatCurrency(250)     => "₹250"
 * formatCurrency(1250)    => "₹1,250"
 * formatCurrency(12500)   => "₹12,500"
 * formatCurrency(250.5)   => "₹250.50"
 */
export function formatCurrency(amount: number, currency = '₹'): string {
  const hasDecimals = amount % 1 !== 0;
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parses a user-entered string into a float.
 * Returns 0 for empty or invalid input.
 */
export function parseAmount(value: string): number {
  const parsed = parseFloat(value.trim());
  return isNaN(parsed) ? 0 : parsed;
}
