/**
 * detectedTransaction.ts (src/types/detectedTransaction.ts)
 *
 * Types for Milestone 12 Smart Digital Transaction Detection.
 */

import type { PaymentMethod } from './expense';

export type TransactionType = 'expense' | 'credit' | 'transfer' | 'other';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type DetectedStatus = 'pending' | 'accepted' | 'ignored';

export interface DetectedTransaction {
  id: number;
  fingerprint: string;
  amount: number;
  merchant: string;
  paymentMethod: PaymentMethod;
  transactionType: TransactionType;
  sourceApp: string;
  detectedAt: string; // ISO string
  transactionTime: string; // ISO string or human formatted string
  confidence: number; // 0 - 100 percentage score
  confidenceLevel: ConfidenceLevel;
  status: DetectedStatus;
  rawText?: string;
  suggestedCategory?: string;
}
