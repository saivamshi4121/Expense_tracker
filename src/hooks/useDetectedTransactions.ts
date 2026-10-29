/**
 * useDetectedTransactions.ts (src/hooks/useDetectedTransactions.ts)
 *
 * Custom hook to manage notification listening, detected transactions queue,
 * accepting/ignoring transactions, and permission state.
 *
 * M13 enhancement: loads learned merchant→category preferences,
 * passes them to the parser, and saves user category overrides on accept.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createExpense } from '@/db/expenses';
import {
  getPendingDetectedTransactions,
  insertDetectedTransaction,
  updateDetectedStatus,
  clearDetectedBySourceApp,
  getLearnedMerchantCategories,
  saveMerchantCategory,
} from '@/db/detectedTransactions';
import {
  addNotificationListener,
  isPermissionGranted,
  openPermissionSettings,
  sendTestNotification,
  type RawNotificationPayload,
} from '../../modules/notification-listener/src/index';
import type { DetectedTransaction } from '@/types/detectedTransaction';
import type { ExpenseCategory } from '@/types/expense';
import { parseNotification } from '@/utils/transactionParser';

const PERMISSION_CACHE_KEY = 'nl_permission_cached';

export function useDetectedTransactions() {
  const db = useSQLiteContext();
  const [pendingTransactions, setPendingTransactions] = useState<DetectedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [learnedCategories, setLearnedCategories] = useState<Map<string, string>>(new Map());

  // Load cached permission + learned categories on mount
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    AsyncStorage.getItem(PERMISSION_CACHE_KEY).then((cached) => {
      if (cached === 'true') setPermissionGranted(true);
    }).catch(() => {});

    getLearnedMerchantCategories(db).then(setLearnedCategories).catch(() => {});
  }, [db]);

  const checkPermission = useCallback(() => {
    if (Platform.OS !== 'android') {
      setPermissionGranted(false);
      return false;
    }
    try {
      const granted = isPermissionGranted();
      setPermissionGranted(granted);
      AsyncStorage.setItem(PERMISSION_CACHE_KEY, granted ? 'true' : 'false').catch(() => {});
      return granted;
    } catch {
      AsyncStorage.getItem(PERMISSION_CACHE_KEY).then((cached) => {
        setPermissionGranted(cached === 'true');
      }).catch(() => {});
      return false;
    }
  }, []);

  // Fetch pending queue from DB
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      checkPermission();
      const pending = await getPendingDetectedTransactions(db);
      setPendingTransactions(pending);
    } catch (e) {
      console.error('Error fetching detected transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [db, checkPermission]);

  // Re-check permission every time this hook's consumer screen gains focus.
  useFocusEffect(
    useCallback(() => {
      checkPermission();
      refresh();
    }, [checkPermission, refresh])
  );

  // Subscribe to native Android notification events
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const unsubscribe = addNotificationListener(async (payload: RawNotificationPayload) => {
      const learnedOverrides = new Map(
        Array.from(learnedCategories.entries()).map(([k, v]) => [k, v as ExpenseCategory])
      );

      const parsed = parseNotification(
        payload.title,
        payload.text,
        payload.packageName,
        payload.postTime,
        learnedOverrides
      );

      if (parsed.isTransaction && parsed.fingerprint && parsed.amount) {
        const dateStr = new Date(payload.postTime).toISOString().split('T')[0];

        const inserted = await insertDetectedTransaction(db, {
          fingerprint: parsed.fingerprint,
          amount: parsed.amount,
          merchant: parsed.merchant || 'Digital Merchant',
          paymentMethod: parsed.paymentMethod || 'UPI',
          transactionType: parsed.transactionType || 'expense',
          sourceApp: payload.packageName,
          detectedAt: new Date().toISOString(),
          transactionTime: dateStr,
          confidence: parsed.confidence || 75,
          confidenceLevel: parsed.confidenceLevel || 'MEDIUM',
          status: 'pending',
          rawText: `${payload.title}: ${payload.text}`,
          suggestedCategory: parsed.suggestedCategory || 'Other',
        });

        if (inserted) await refresh();
      }
    });

    return () => unsubscribe();
  }, [db, refresh, learnedCategories]);

  // User Action: Accept transaction into actual expenses
  const acceptTransaction = useCallback(
    async (
      transaction: DetectedTransaction,
      category: ExpenseCategory,
      note?: string
    ) => {
      // 1. Create real expense
      await createExpense(db, {
        amount: transaction.amount,
        category,
        paymentMethod: transaction.paymentMethod,
        note: note || `Paid to ${transaction.merchant}`,
        date: transaction.transactionTime.split('T')[0],
      });

      // 2. Mark detected transaction as accepted
      await updateDetectedStatus(db, transaction.id, 'accepted');

      // 3. M13: Save learned category for future suggestions
      if (transaction.merchant && transaction.merchant !== 'Digital Merchant') {
        await saveMerchantCategory(db, transaction.merchant, category);
        setLearnedCategories((prev) => {
          const next = new Map(prev);
          next.set(transaction.merchant.toLowerCase(), category);
          return next;
        });
      }

      // 4. Refresh queue
      await refresh();
    },
    [db, refresh]
  );

  // User Action: Ignore transaction
  const ignoreTransaction = useCallback(
    async (id: number) => {
      await updateDetectedStatus(db, id, 'ignored');
      await refresh();
    },
    [db, refresh]
  );

  // Open Android Notification Listener Settings
  const requestPermission = useCallback(() => {
    if (Platform.OS === 'android') {
      openPermissionSettings();
    }
  }, []);

  // DEV/TEST ONLY: Send a fake payment notification to test the M12 pipeline
  const triggerTestNotification = useCallback(() => {
    if (Platform.OS === 'android') sendTestNotification();
  }, []);

  // DEV/TEST ONLY: Clear test data from detected_transactions
  const clearTestData = useCallback(async () => {
    const appPackageName = 'com.anonymous.expensetracker';
    const deleted = await clearDetectedBySourceApp(db, appPackageName);
    if (deleted > 0) {
      await refresh();
    }
    return deleted;
  }, [db, refresh]);

  return {
    pendingTransactions,
    loading,
    permissionGranted,
    checkPermission,
    requestPermission,
    acceptTransaction,
    ignoreTransaction,
    refresh,
    triggerTestNotification,
    clearTestData,
  };
}
