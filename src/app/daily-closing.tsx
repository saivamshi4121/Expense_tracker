/**
 * daily-closing.tsx — Daily Closing screen
 *
 * Extremely simple screen that shows today's spending and cash check.
 * Uses plain language for all users.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDailyClosing } from '@/hooks/useDailyClosing';
import { useExpenses } from '@/hooks/useExpenses';
import { useCashWallet } from '@/hooks/useCashWallet';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';
import type { ClosingResolution } from '@/types/dailyClosing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNonNegativeAmount(raw: string): number | null {
  const n = parseFloat(raw.trim());
  if (isNaN(n) || n < 0) return null;
  return n;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DailyClosingScreen() {
  const router = useRouter();

  const { expenses, refresh: refreshExpenses } = useExpenses();
  const { expectedBalance, refresh: refreshWallet } = useCashWallet();

  const {
    todayDate,
    cashSpending,
    digitalSpending,
    totalSpending,
    actualCash,
    difference,
    savedClosing,
    loading,
    error,
    submitActualCash,
    submitResolution,
    refresh: refreshClosing,
  } = useDailyClosing({ allExpenses: expenses, expectedCash: expectedBalance });

  const [actualInput, setActualInput] = useState('');
  const [savingActual, setSavingActual] = useState(false);
  const [savingResolution, setSavingResolution] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshExpenses();
      refreshWallet();
      refreshClosing();
    }, [refreshExpenses, refreshWallet, refreshClosing])
  );

  async function handleSubmitActualCash() {
    const amount = parseNonNegativeAmount(actualInput);
    if (amount === null) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (e.g. 4500).');
      return;
    }
    setSavingActual(true);
    try {
      await submitActualCash(amount);
      setActualInput('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingActual(false);
    }
  }

  async function handleResolution(resolution: Exclude<ClosingResolution, 'resolved'>) {
    setSavingResolution(true);
    try {
      await submitResolution(resolution);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingResolution(false);
    }
  }

  function handleAddExpense() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/add-expense' as any);
  }

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={AppColors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centred}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refreshClosing}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isResolved = savedClosing?.resolution === 'resolved';
  const hasFinalResolution = savedClosing?.resolution != null;
  const absDiff = difference !== null ? Math.abs(difference) : null;
  const showDiffActions = actualCash !== null && difference !== null && difference !== 0 && !hasFinalResolution;

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Daily Closing</Text>
          <Text style={styles.headerDate}>{todayDate}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Today's Spending */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Spending</Text>

            <View style={styles.spendRow}>
              <View style={styles.spendLeft}>
                <View style={[styles.dot, { backgroundColor: AppColors.success }]} />
                <Text style={styles.spendLabel}>Cash spent</Text>
              </View>
              <Text style={styles.spendValue}>{formatCurrency(cashSpending)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.spendRow}>
              <View style={styles.spendLeft}>
                <View style={[styles.dot, { backgroundColor: AppColors.accent }]} />
                <Text style={styles.spendLabel}>Digital spent</Text>
              </View>
              <Text style={styles.spendValue}>{formatCurrency(digitalSpending)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.spendRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalSpending)}</Text>
            </View>
          </View>

          {/* Cash Check */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cash Check</Text>

            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Expected cash</Text>
              <Text style={styles.checkValue}>{formatCurrency(expectedBalance)}</Text>
            </View>

            {actualCash !== null && (
              <>
                <View style={styles.divider} />
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Actual cash (counted)</Text>
                  <Text style={styles.checkValue}>{formatCurrency(actualCash)}</Text>
                </View>
              </>
            )}

            {actualCash !== null && (
              <>
                <View style={styles.divider} />
                {difference === 0 ? (
                  <View style={[styles.resultBanner, { backgroundColor: AppColors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={22} color={AppColors.success} />
                    <Text style={[styles.resultText, { color: AppColors.success }]}>
                      Everything looks good
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.resultBanner, { backgroundColor: AppColors.warningLight }]}>
                    <Ionicons name="warning" size={22} color={AppColors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultText, { color: AppColors.warning }]}>
                        {formatCurrency(absDiff!)} cash difference
                      </Text>
                      <Text style={styles.resultSub}>
                        {difference! > 0
                          ? `We expected ${formatCurrency(expectedBalance)}. You counted ${formatCurrency(actualCash!)}.`
                          : `You counted more than expected.`}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Enter Actual Cash */}
          {!hasFinalResolution && (
            <View style={styles.inputCard}>
              <Text style={styles.inputCardTitle}>
                {actualCash !== null ? 'Update Actual Cash' : 'Count Physical Cash'}
              </Text>
              <Text style={styles.inputCardSub}>
                Count notes and coins in your wallet and enter the total.
              </Text>
              <View style={styles.inputRow}>
                <View style={styles.amountBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={actualInput}
                    onChangeText={setActualInput}
                    placeholder={
                      actualCash != null
                        ? actualCash.toLocaleString('en-IN')
                        : expectedBalance.toFixed(0)
                    }
                    placeholderTextColor={AppColors.textMuted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    maxLength={12}
                    editable={!savingActual}
                    accessibilityLabel="Actual cash in wallet"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.checkBtn, savingActual && styles.btnDisabled]}
                  onPress={handleSubmitActualCash}
                  disabled={savingActual}
                  activeOpacity={0.8}
                  accessibilityLabel="Check cash balance"
                  accessibilityRole="button"
                >
                  {savingActual
                    ? <ActivityIndicator color={AppColors.white} size="small" />
                    : <Text style={styles.btnText}>Check</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Difference Resolution */}
          {showDiffActions && (
            <View style={styles.resolveCard}>
              <Text style={styles.resolveQuestion}>
                Did you make a cash payment that wasn't recorded?
              </Text>

              <TouchableOpacity
                style={[styles.resolveBtn, { backgroundColor: AppColors.accent }]}
                onPress={handleAddExpense}
                activeOpacity={0.85}
                accessibilityLabel="Add a missing expense"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color={AppColors.white} />
                <Text style={styles.resolveBtnText}>Add Expense</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resolveBtn, styles.resolveBtnSecondary, savingResolution && styles.btnDisabled]}
                onPress={() => handleResolution('forgot')}
                disabled={savingResolution}
                activeOpacity={0.8}
                accessibilityLabel="I don't remember"
                accessibilityRole="button"
              >
                {savingResolution
                  ? <ActivityIndicator color={AppColors.textSecondary} size="small" />
                  : (
                    <>
                      <Ionicons name="help-circle-outline" size={20} color={AppColors.textSecondary} />
                      <Text style={styles.resolveBtnSecondaryText}>I Don't Remember</Text>
                    </>
                  )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resolveBtn, styles.resolveBtnSecondary, savingResolution && styles.btnDisabled]}
                onPress={() => handleResolution('review_later')}
                disabled={savingResolution}
                activeOpacity={0.8}
                accessibilityLabel="Review later"
                accessibilityRole="button"
              >
                <Ionicons name="time-outline" size={20} color={AppColors.textSecondary} />
                <Text style={styles.resolveBtnSecondaryText}>Review Later</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Final Resolution Badge */}
          {hasFinalResolution && !isResolved && (
            <View style={styles.resolutionBadge}>
              <Ionicons
                name={savedClosing?.resolution === 'forgot' ? 'help-circle-outline' : 'time-outline'}
                size={16}
                color={AppColors.warning}
              />
              <Text style={styles.resolutionBadgeText}>
                {savedClosing?.resolution === 'forgot'
                  ? "Marked as: I Don't Remember"
                  : 'Marked as: Review Later'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (actualCash !== null) {
                    submitActualCash(actualCash);
                  }
                }}
                style={styles.changeResolutionBtn}
                accessibilityLabel="Change resolution"
              >
                <Text style={styles.changeResolutionText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: AppSpacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    gap: AppSpacing.md,
    paddingHorizontal: AppSpacing.xxxl,
  },
  errorText: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: AppSpacing.sm,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.xxl,
    paddingVertical: AppSpacing.lg,
  },
  retryBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  headerDate: {
    ...AppTypography.small,
    color: AppColors.textSecondary,
    marginTop: 2,
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

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: AppSpacing.xxl,
    gap: AppSpacing.lg,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
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

  // ── Spending rows ─────────────────────────────────────────────────────────
  spendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
  },
  spendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spendLabel: {
    ...AppTypography.body,
    color: AppColors.textPrimary,
  },
  spendValue: {
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

  // ── Cash check rows ───────────────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
  },
  checkLabel: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  checkValue: {
    ...AppTypography.cardAmount,
    color: AppColors.textPrimary,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.md,
    margin: AppSpacing.lg,
    borderRadius: AppRadius.md,
    padding: AppSpacing.lg,
  },
  resultText: {
    ...AppTypography.bodyBold,
    lineHeight: 22,
  },
  resultSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    marginTop: AppSpacing.xs,
  },

  // ── Input card ────────────────────────────────────────────────────────────
  inputCard: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface2,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  inputCardTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  inputCardSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    alignItems: 'center',
  },
  amountBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    height: 56,
    gap: AppSpacing.sm,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  checkBtn: {
    height: 56,
    paddingHorizontal: AppSpacing.xl,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },

  // ── Resolve card ──────────────────────────────────────────────────────────
  resolveCard: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  resolveQuestion: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
    lineHeight: 24,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET + 6,
    paddingHorizontal: AppSpacing.xl,
  },
  resolveBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  resolveBtnSecondary: {
    backgroundColor: AppColors.surface2,
  },
  resolveBtnSecondaryText: {
    ...AppTypography.button,
    color: AppColors.textSecondary,
  },

  // ── Resolution badge ──────────────────────────────────────────────────────
  resolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.warningLight,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  resolutionBadgeText: {
    ...AppTypography.caption,
    color: AppColors.warning,
    flex: 1,
  },
  changeResolutionBtn: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  changeResolutionText: {
    ...AppTypography.captionBold,
    color: AppColors.warning,
  },
});
