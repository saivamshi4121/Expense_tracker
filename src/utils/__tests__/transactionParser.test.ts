/**
 * transactionParser.test.ts
 *
 * Tests for Milestone 12 Smart Digital Transaction Detection logic.
 */

import {
  extractAmount,
  extractMerchant,
  detectPaymentMethod,
  generateFingerprint,
  parseNotification,
} from '../transactionParser';
import { normalizeMerchant } from '../merchantNormalizer';
import { suggestCategory } from '../categorySuggester';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Test Failed: ${message}`);
  }
}

export function runParserTests() {
  // Test 1: Amount Extraction Formats
  assert(extractAmount('Paid ₹850 to Reliance Fresh') === 850, '₹850 extraction');
  assert(extractAmount('Payment of Rs 850 to Amazon') === 850, 'Rs 850 extraction');
  assert(extractAmount('Debited Rs. 850.00 from VPA') === 850, 'Rs. 850.00 extraction');
  assert(extractAmount('Spent INR 850 via HDFC Bank') === 850, 'INR 850 extraction');
  assert(extractAmount('Paid ₹1,25,000 to Jewellers') === 125000, 'Comma amount extraction');

  // Test 2: Merchant Normalization
  assert(normalizeMerchant('RELIANCE FRESH UPI') === 'Reliance Fresh', 'Reliance Fresh norm');
  assert(normalizeMerchant('Paid to Reliance Fresh') === 'Reliance Fresh', 'Paid to Reliance norm');
  assert(normalizeMerchant('SWIGGY IN') === 'Swiggy', 'Swiggy norm');
  assert(normalizeMerchant('UBER INDIA') === 'Uber', 'Uber norm');

  // Test 3: Category Suggestion Rules
  assert(suggestCategory('Reliance Fresh', 'paid for groceries') === 'Shopping', 'Category Shopping');
  assert(suggestCategory('Swiggy', 'food order') === 'Food', 'Category Food');
  assert(suggestCategory('Uber', 'cab ride') === 'Travel', 'Category Travel');
  assert(suggestCategory('Airtel Bill', 'monthly recharge') === 'Bills', 'Category Bills');

  // Test 4: UPI Payment Detection
  const upiRes = parseNotification(
    'Payment Successful',
    '₹850 paid to Reliance Fresh using UPI ref 123456',
    'com.google.android.apps.nbu.paisa.user',
    1700000000000
  );
  assert(upiRes.isTransaction === true, 'UPI isTransaction');
  assert(upiRes.amount === 850, 'UPI amount');
  assert(upiRes.merchant === 'Reliance Fresh', 'UPI merchant');
  assert(upiRes.paymentMethod === 'UPI', 'UPI paymentMethod');
  assert(upiRes.confidenceLevel === 'HIGH', 'UPI confidence HIGH');

  // Test 5: Bank Payment Detection
  const bankRes = parseNotification(
    'HDFC Bank Alert',
    'Rs. 1,250 debited from a/c **1234 at Amazon on 12-09-26',
    'com.snapwork.hdfc',
    1700000000000
  );
  assert(bankRes.isTransaction === true, 'Bank isTransaction');
  assert(bankRes.amount === 1250, 'Bank amount');
  assert(bankRes.merchant === 'Amazon', 'Bank merchant');

  // Test 6: Card Payment Detection
  const cardRes = parseNotification(
    'ICICI Bank Card Alert',
    'Spent INR 2,500 on Credit Card ending 9876 at PVR Cinemas',
    'com.csam.icici.bank.imobile',
    1700000000000
  );
  assert(cardRes.isTransaction === true, 'Card isTransaction');
  assert(cardRes.amount === 2500, 'Card amount');
  assert(cardRes.paymentMethod === 'Credit Card', 'Card Credit Card method');

  // Test 7: Ignore OTP Notification
  const otpRes = parseNotification(
    'OTP Alert',
    'Your OTP for transaction of Rs 850 is 482910. Do not share with anyone.',
    'com.google.android.apps.messaging',
    1700000000000
  );
  assert(otpRes.isTransaction === false, 'OTP isTransaction false');

  // Test 8: Ignore Promotional Notification
  const promoRes = parseNotification(
    'Special Offer!',
    'Get up to Rs 500 cashback on your next transaction at Dominoes. Order now!',
    'com.phonepe.app',
    1700000000000
  );
  assert(promoRes.isTransaction === false, 'Promo isTransaction false');

  // Test 9: Refund / Credit Excluded
  const creditRes = parseNotification(
    'Refund Credited',
    'Rs. 850 credited to your bank account for returned item',
    'com.snapwork.hdfc',
    1700000000000
  );
  assert(creditRes.isTransaction === false, 'Credit isTransaction false');

  // Test 10: Deduplication Fingerprinting
  const fp1 = generateFingerprint('com.phonepe.app', 850, 'Reliance Fresh', 1700000000000);
  const fp2 = generateFingerprint('com.phonepe.app', 850, 'Reliance Fresh', 1700000001000);
  assert(fp1 === fp2, 'Fingerprint equality for duplicate');
}
