/**
 * notificationParser.test.ts
 *
 * Tests for the notification parser system.
 */

import {
  extractAmount,
  extractMerchant,
  detectPaymentMethod,
  detectTransactionType,
  shouldIgnore,
  hasTransactionSignal,
  calculateConfidence,
  getConfidenceLevel,
  generateFingerprint,
  suggestCategory,
  normalizeMerchant,
  parseNotification,
} from '@/lib/notificationParser';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`NotificationParser Test Failed: ${msg}`);
}

export function runNotificationParserTests() {
  assert(extractAmount('₹850 paid to Reliance Fresh') === 850, '₹850');
  assert(extractAmount('Rs 850 paid to Reliance Fresh') === 850, 'Rs 850');
  assert(extractAmount('Rs. 850 paid to Reliance Fresh') === 850, 'Rs. 850');
  assert(extractAmount('INR 850 paid to Reliance Fresh') === 850, 'INR 850');
  assert(extractAmount('Payment of ₹850.00') === 850, '850.00');
  assert(extractAmount('₹1,25,000 paid to vendor') === 125000, '1,25,000');
  assert(extractAmount('Payment of Rs. 1,250 to Amazon') === 1250, '1,250');
  assert(extractAmount('No amount here') === null, 'No amount null');

  assert(extractMerchant('₹850 paid to Reliance Fresh using UPI') === 'Reliance Fresh', 'Merchant Reliance');
  assert(extractMerchant('Payment of Rs. 1,250 to Amazon') === 'Amazon', 'Merchant Amazon');

  assert(detectPaymentMethod('UPI payment of ₹850', 'com.example') === 'UPI', 'UPI text');
  assert(detectPaymentMethod('IMPS transfer of ₹5000', 'com.example') === 'Bank Transfer', 'IMPS transfer');

  assert(detectTransactionType('₹850 paid to Reliance Fresh') === 'expense', 'Expense type');
  assert(detectTransactionType('₹5000 credited to your account') === 'credit', 'Credit type');
  assert(detectTransactionType('Refund of ₹200 from Amazon') === 'refund', 'Refund type');

  assert(shouldIgnore('Your OTP is 123456') === true, 'OTP ignore');
  assert(shouldIgnore('Get flat 50% off on your next order') === true, 'Offer ignore');
  assert(shouldIgnore('₹850 paid to Reliance Fresh') === false, 'Do not ignore payment');

  assert(hasTransactionSignal('₹850 paid to Reliance Fresh') === true, 'Signal paid');
  assert(hasTransactionSignal('₹850 debited from your account') === true, 'Signal debited');

  const highConf = calculateConfidence(true, true, true, true, 'expense', true);
  assert(highConf >= 80, 'High confidence score');

  assert(getConfidenceLevel(70) === 'HIGH', 'Score 70 HIGH');
  assert(getConfidenceLevel(45) === 'MEDIUM', 'Score 45 MEDIUM');
  assert(getConfidenceLevel(40) === 'LOW', 'Score 40 LOW');

  const fp1 = generateFingerprint(850, 'Reliance Fresh', 'com.phonepe.app', 1725000000000);
  const fp2 = generateFingerprint(850, 'Reliance Fresh', 'com.phonepe.app', 1725000000000);
  assert(fp1 === fp2, 'Fingerprint match');

  assert(suggestCategory('Swiggy', '') === 'Food', 'Category Swiggy Food');
  assert(suggestCategory('Uber', '') === 'Travel', 'Category Uber Travel');

  assert(normalizeMerchant('paid to Reliance Fresh') === 'Reliance Fresh', 'Normalize paid to');

  const parsedRes = parseNotification({
    packageName: 'com.phonepe.app',
    postTime: Date.now(),
    title: 'Payment Successful',
    text: '₹850 paid to Reliance Fresh using UPI',
  });
  assert(parsedRes !== null, 'Parsed not null');
  assert(parsedRes?.amount === 850, 'Parsed amount 850');
  assert(parsedRes?.merchant === 'Reliance Fresh', 'Parsed merchant');

  const otpParsed = parseNotification({
    packageName: 'com.example',
    postTime: Date.now(),
    title: 'Your OTP',
    text: 'Your OTP is 123456 for login',
  });
  assert(otpParsed === null, 'OTP parse null');
}
