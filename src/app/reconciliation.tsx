/**
 * reconciliation.tsx — Money Check screen (M14)
 *
 * Combines digital transactions, cash wallet, and expenses to show
 * whether the user's recorded money matches reality.
 *
 * Reuses the same calculation service as Daily Closing.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExpenses } from '@/hooks/useExpenses';
import { useCashWallet } from '@/hooks/useCashWallet';
import { useReconciliation } from '@/hooks/useReconciliation';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';
import type { Anomaly, AnomalyType } from '@/utils/reconciliation';

// ─── Anomaly Config ───────────────────────────────────────────────────────

const ANOMALY_CONFIG: Record<AnomalyType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  pending_detected: {
    icon: 'time-outline',
    color: AppColors.info,
    bg: AppColors.infoLight,
  },
  large_expense: {
    icon: 'alert-circle-outline',
    color: AppColors.warning,
    bg: AppColors.warningLight,
  },
  possible_duplicate: {
    icon: 'copy-outline',
    color: AppColors.error,
    bg: AppColors.errorLight,
  },
};

// ─── Component ────────────────────────────────────────────────────────────

export default function ReconciliationScreen() {
  const router = useRouter();

  const { expenses, loading: expensesLoading, refresh: refreshExpenses } = useExpenses();
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useCashWallet();

  const {
    summary,
    anomalies,
    todaySpending,
    pendingTransactions,
    loading: reconciliationLoading,
    refresh: refreshReconciliation,
  } = useReconciliation({
    allExpenses: expenses,
    wallet,
    loading: expensesLoading || walletLoading,
  });

  useFocusEffect(
    useCallback(() => {
      refreshExpenses();
      refreshWallet();
      refreshReconciliation();
    }, [refreshExpenses, refreshWallet, refreshReconciliation])
  );

  const loading = expensesLoading || walletLoading || reconciliationLoading;

  // ── Navigation Handlers ──────────────────────────────────────────────────

  function handleReviewExpenses() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/daily-closing' as any);
  }

  function handleCheckCash() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/cash-wallet' as any);
  }

  function handleAddExpense() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/add-expense' as any);
  }

  function handleDismiss() {
    router.back();
  }

  function handleDetectedPayments() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/detected-payments' as any);
  }

  // ── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={AppColors.accent} />
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Money Check</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Spending Card ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.dot, { backgroundColor: AppColors.accent }]} />
              <Text style={styles.rowLabel}>Digital spending</Text>
            </View>
            <Text style={styles.rowValue}>{formatCurrency(summary.digitalSpending)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.dot, { backgroundColor: AppColors.success }]} />
              <Text style={styles.rowLabel}>Cash spending</Text>
            </View>
            <Text style={styles.rowValue}>{formatCurrency(summary.cashSpending)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total spending</Text>
            <Text style={styles.totalValue}>{formatCurrency(summary.totalSpending)}</Text>
          </View>
        </View>

        {/* ── Cash Check Card ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cash Check</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Expected cash</Text>
            <Text style={styles.rowValue}>{formatCurrency(summary.expectedCash)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Actual cash</Text>
            <Text style={styles.rowValue}>
              {summary.actualCash !== null
                ? formatCurrency(summary.actualCash)
                : '--'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Status Banner */}
          {summary.status.type === 'balanced' && (
            <View style={[styles.statusBanner, { backgroundColor: AppColors.successLight }]}>
              <Ionicons name="checkmark-circle" size={22} color={AppColors.success} />
              <Text style={[styles.statusText, { color: AppColors.success }]}>
                Everything adds up
              </Text>
            </View>
          )}

          {summary.status.type === 'mismatch' && (
            <View style={[styles.statusBanner, { backgroundColor: AppColors.warningLight }]}>
              <Ionicons name="warning" size={22} color={AppColors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusText, { color: AppColors.warning }]}>
                  {formatCurrency(Math.abs(summary.difference!))} difference found
                </Text>
                <Text style={styles.statusSub}>
                  {summary.difference! > 0
                    ? 'You have less cash than expected.'
                    : 'You have more cash than expected.'}
                </Text>
              </View>
            </View>
          )}

          {summary.status.type === 'no_actual' && (
            <View style={[styles.statusBanner, { backgroundColor: AppColors.infoLight }]}>
              <Ionicons name="finger-print-outline" size={22} color={AppColors.info} />
              <Text style={[styles.statusText, { color: AppColors.info }]}>
                Count your cash to check
              </Text>
            </View>
          )}

          {summary.status.type === 'no_wallet' && (
            <View style={[styles.statusBanner, { backgroundColor: AppColors.surface2 }]}>
              <Ionicons name="wallet-outline" size={22} color={AppColors.textSecondary} />
              <Text style={[styles.statusText, { color: AppColors.textSecondary }]}>
                Set your starting cash first
              </Text>
            </View>
          )}
        </View>

        {/* ── Today's Summary ────────────────────────────────────────────── */}
        {todaySpending.totalSpending > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Cash spent today</Text>
              <Text style={styles.rowValue}>{formatCurrency(todaySpending.cashSpending)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Digital spent today</Text>
              <Text style={styles.rowValue}>{formatCurrency(todaySpending.digitalSpending)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total today</Text>
              <Text style={styles.totalValue}>{formatCurrency(todaySpending.totalSpending)}</Text>
            </View>
          </View>
        )}

        {/* ── Anomalies ──────────────────────────────────────────────────── */}
        {anomalies.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Needs Attention</Text>

            {anomalies.map((anomaly, idx) => {
              const config = ANOMALY_CONFIG[anomaly.type];
              return (
                <TouchableOpacity
                  key={`${anomaly.type}-${idx}`}
                  style={styles.anomalyRow}
                  onPress={() => {
                    if (anomaly.type === 'pending_detected') handleDetectedPayments();
                    else if (anomaly.expenseId) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      router.push({ pathname: '/edit-expense', params: { id: anomaly.expenseId.toString() } } as any);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.anomalyIcon, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={18} color={config.color} />
                  </View>
                  <Text style={styles.anomalyText}>{anomaly.message}</Text>
                  <Ionicons name="chevron-forward" size={14} color={AppColors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        {summary.status.type !== 'balanced' && (
          <View style={styles.actionsCard}>
            {summary.status.type === 'mismatch' && (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleReviewExpenses}
                  activeOpacity={0.85}
                  accessibilityLabel="Review expenses"
                  accessibilityRole="button"
                >
                  <Ionicons name="receipt-outline" size={20} color={AppColors.white} />
                  <Text style={styles.actionBtnText}>Review Expenses</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={handleCheckCash}
                  activeOpacity={0.85}
                  accessibilityLabel="Check cash"
                  accessibilityRole="button"
                >
                  <Ionicons name="cash-outline" size={20} color={AppColors.textPrimary} />
                  <Text style={styles.actionBtnSecondaryText}>Check Cash</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnAccent]}
              onPress={handleAddExpense}
              activeOpacity={0.85}
              accessibilityLabel="Add expense"
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={20} color={AppColors.accent} />
              <Text style={styles.actionBtnAccentText}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
              activeOpacity={0.85}
              accessibilityLabel="Ignore for now"
              accessibilityRole="button"
            >
              <Text style={styles.dismissBtnText}>Ignore for Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: AppSpacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  centred: {
    flex: 1,
    backgroundColor: AppColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  backBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: AppSpacing.xxl,
    gap: AppSpacing.lg,
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xl,
    paddingVertical: AppSpacing.md,
    overflow: 'hidden',
  },
  cardTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
    paddingHorizontal: AppSpacing.xl,
    paddingTop: AppSpacing.lg,
    paddingBottom: AppSpacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
    marginHorizontal: AppSpacing.xl,
  },

  // ── Rows ────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  rowValue: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  totalLabel: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  totalValue: {
    ...AppTypography.cardAmount,
    fontSize: 24,
    color: AppColors.textPrimary,
  },

  // ── Status ──────────────────────────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    margin: AppSpacing.lg,
    borderRadius: AppRadius.md,
    padding: AppSpacing.lg,
  },
  statusText: {
    ...AppTypography.bodyBold,
    flex: 1,
  },
  statusSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    marginTop: AppSpacing.xs,
  },

  // ── Anomalies ───────────────────────────────────────────────────────────
  anomalyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
  },
  anomalyIcon: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anomalyText: {
    ...AppTypography.caption,
    color: AppColors.textPrimary,
    flex: 1,
  },

  // ── Actions ─────────────────────────────────────────────────────────────
  actionsCard: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET + 6,
    backgroundColor: AppColors.accent,
    paddingHorizontal: AppSpacing.xl,
  },
  actionBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  actionBtnSecondary: {
    backgroundColor: AppColors.surface2,
  },
  actionBtnSecondaryText: {
    ...AppTypography.button,
    color: AppColors.textPrimary,
  },
  actionBtnAccent: {
    backgroundColor: AppColors.surface2,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  actionBtnAccentText: {
    ...AppTypography.button,
    color: AppColors.accent,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: MIN_TOUCH_TARGET,
  },
  dismissBtnText: {
    ...AppTypography.button,
    color: AppColors.textSecondary,
  },
});
