/**
 * cash-wallet.tsx — "Check Cash" screen
 *
 * Shows expected cash and lets the user count physical cash to reconcile.
 * Uses simple language for young and elderly users.
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

import { useCashWallet } from '@/hooks/useCashWallet';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePositiveAmount(raw: string): number | null {
  const n = parseFloat(raw.trim());
  if (isNaN(n) || n < 0) return null;
  return n;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CashWalletScreen() {
  const router = useRouter();
  const {
    wallet,
    cashExpensesTotal,
    expectedBalance,
    difference,
    loading,
    error,
    updateInitialBalance,
    updateActualBalance,
    refresh,
  } = useCashWallet();

  const [initialInput, setInitialInput] = useState('');
  const [actualInput, setActualInput] = useState('');
  const [savingInitial, setSavingInitial] = useState(false);
  const [savingActual, setSavingActual] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleSetInitialBalance() {
    const amount = parsePositiveAmount(initialInput);
    if (amount === null) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (e.g. 5000).');
      return;
    }
    setSavingInitial(true);
    try {
      await updateInitialBalance(amount);
      setInitialInput('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update wallet.');
    } finally {
      setSavingInitial(false);
    }
  }

  async function handleSetActualBalance() {
    const amount = parsePositiveAmount(actualInput);
    if (amount === null) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (e.g. 4200).');
      return;
    }
    setSavingActual(true);
    try {
      await updateActualBalance(amount);
      setActualInput('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingActual(false);
    }
  }

  if (loading && !wallet) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={AppColors.accent} />
      </View>
    );
  }

  if (error && !wallet) {
    return (
      <View style={styles.centred}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasActual = wallet?.actualBalance != null;
  const isBalanced = difference === 0;
  const hasDiff = hasActual && !isBalanced;

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
        <Text style={styles.headerTitle}>Check Cash</Text>
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
          {/* Expected Cash */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="cash-outline" size={28} color={AppColors.success} />
            </View>
            <Text style={styles.heroLabel}>Expected Cash</Text>
            <Text style={styles.heroAmount}>{formatCurrency(expectedBalance)}</Text>
            {wallet && (
              <Text style={styles.heroSub}>
                You started with {formatCurrency(wallet.initialBalance)}
              </Text>
            )}
          </View>

          {/* Breakdown */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Starting Balance</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(wallet?.initialBalance ?? 0)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Cash Spent</Text>
              <Text style={[styles.breakdownValue, { color: AppColors.error }]}>
                − {formatCurrency(cashExpensesTotal)}
              </Text>
            </View>
          </View>

          {/* Reconciliation Status */}
          {hasActual && (
            <View style={[
              styles.reconcileCard,
              { borderColor: isBalanced ? `${AppColors.success}44` : `${AppColors.warning}44` }
            ]}>
              {isBalanced ? (
                <View style={styles.reconcileRow}>
                  <Ionicons name="checkmark-circle" size={22} color={AppColors.success} />
                  <Text style={[styles.reconcileStatus, { color: AppColors.success }]}>
                    Cash balance matches
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.reconcileRow}>
                    <Ionicons name="warning" size={22} color={AppColors.warning} />
                    <Text style={[styles.reconcileStatus, { color: AppColors.warning }]}>
                      Cash difference
                    </Text>
                  </View>
                  <Text style={styles.reconcileDiff}>
                    {formatCurrency(Math.abs(difference!))}
                  </Text>
                  <View style={styles.reconciledBreakdown}>
                    <View style={styles.reconciledRow}>
                      <Text style={styles.reconciledKey}>We expected</Text>
                      <Text style={styles.reconciledVal}>{formatCurrency(expectedBalance)}</Text>
                    </View>
                    <View style={styles.reconciledRow}>
                      <Text style={styles.reconciledKey}>You counted</Text>
                      <Text style={styles.reconciledVal}>{formatCurrency(wallet!.actualBalance!)}</Text>
                    </View>
                  </View>
                  <Text style={styles.reconcileExplanation}>
                    {difference! > 0
                      ? `${formatCurrency(Math.abs(difference!))} is missing from the record.`
                      : `${formatCurrency(Math.abs(difference!))} extra was found.`}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Set Starting Balance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {wallet && wallet.initialBalance > 0
                ? 'Update Starting Balance'
                : 'Set Starting Balance'}
            </Text>
            <Text style={styles.sectionSub}>
              How much cash did you start with today?
            </Text>
            <View style={styles.inputRow}>
              <View style={styles.amountBox}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={initialInput}
                  onChangeText={setInitialInput}
                  placeholder={wallet?.initialBalance
                    ? wallet.initialBalance.toLocaleString('en-IN')
                    : '5000'}
                  placeholderTextColor={AppColors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={12}
                  editable={!savingInitial}
                  accessibilityLabel="Starting cash balance"
                />
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: AppColors.success }, savingInitial && styles.btnDisabled]}
                onPress={handleSetInitialBalance}
                disabled={savingInitial}
                activeOpacity={0.8}
                accessibilityLabel="Save starting balance"
                accessibilityRole="button"
              >
                {savingInitial
                  ? <ActivityIndicator color={AppColors.white} size="small" />
                  : <Text style={styles.actionBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Count Physical Cash */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Count Physical Cash</Text>
            <Text style={styles.sectionSub}>
              Count the notes and coins in your wallet, then enter the total here.
            </Text>
            <View style={styles.inputRow}>
              <View style={styles.amountBox}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={actualInput}
                  onChangeText={setActualInput}
                  placeholder={wallet?.actualBalance != null
                    ? wallet.actualBalance.toLocaleString('en-IN')
                    : '0'}
                  placeholderTextColor={AppColors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={12}
                  editable={!savingActual}
                  accessibilityLabel="Actual cash in wallet"
                />
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: AppColors.accent }, savingActual && styles.btnDisabled]}
                onPress={handleSetActualBalance}
                disabled={savingActual}
                activeOpacity={0.8}
                accessibilityLabel="Check cash balance"
                accessibilityRole="button"
              >
                {savingActual
                  ? <ActivityIndicator color={AppColors.white} size="small" />
                  : <Text style={styles.actionBtnText}>Check</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Info */}
          <View style={styles.footnote}>
            <Ionicons name="information-circle-outline" size={16} color={AppColors.textSecondary} />
            <Text style={styles.footnoteText}>
              Only expenses paid with Cash reduce your expected balance.
              UPI, Card, and other payment methods are not counted here.
            </Text>
          </View>
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

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingVertical: AppSpacing.xxl,
    gap: AppSpacing.lg,
  },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xxl,
    borderWidth: 1,
    borderColor: `${AppColors.success}44`,
    paddingVertical: AppSpacing.xxxl,
    paddingHorizontal: AppSpacing.xxl,
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: AppRadius.xl,
    backgroundColor: AppColors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  heroLabel: {
    ...AppTypography.small,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
  },
  heroAmount: {
    ...AppTypography.heroAmount,
    color: AppColors.success,
  },
  heroSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    marginTop: AppSpacing.xs,
  },

  // ── Breakdown ─────────────────────────────────────────────────────────────
  breakdownRow: {
    flexDirection: 'row',
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    overflow: 'hidden',
  },
  breakdownItem: {
    flex: 1,
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.lg,
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  breakdownDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
  },
  breakdownLabel: {
    ...AppTypography.small,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
  },
  breakdownValue: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },

  // ── Reconcile card ────────────────────────────────────────────────────────
  reconcileCard: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    paddingVertical: AppSpacing.xl,
    paddingHorizontal: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  reconcileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  reconcileStatus: {
    ...AppTypography.subtitle,
  },
  reconcileDiff: {
    ...AppTypography.heroAmount,
    fontSize: 32,
    color: AppColors.warning,
  },
  reconciledBreakdown: {
    gap: AppSpacing.sm,
    paddingTop: AppSpacing.sm,
  },
  reconciledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reconciledKey: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  reconciledVal: {
    ...AppTypography.captionBold,
    color: AppColors.textPrimary,
  },
  reconcileExplanation: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginHorizontal: AppSpacing.xl,
    backgroundColor: AppColors.surface2,
    borderRadius: AppRadius.lg,
    paddingVertical: AppSpacing.xl,
    paddingHorizontal: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  sectionSub: {
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
  actionBtn: {
    height: 56,
    paddingHorizontal: AppSpacing.xl,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },

  // ── Footnote ──────────────────────────────────────────────────────────────
  footnote: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    marginHorizontal: AppSpacing.xl,
    alignItems: 'flex-start',
    paddingBottom: AppSpacing.lg,
  },
  footnoteText: {
    flex: 1,
    ...AppTypography.small,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
});
