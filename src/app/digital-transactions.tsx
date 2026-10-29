/**
 * digital-transactions.tsx  (src/app/digital-transactions.tsx)
 *
 * Digital Transactions screen.
 *
 * Shows UPI, Bank Transfer, Debit Card, Credit Card, and "Other" expenses
 * (i.e. anything that is NOT Cash) in a clean, elderly-friendly list.
 *
 * No new business logic — reuses useExpenses + calcDigitalSummary.
 * No new dependencies.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseCard } from '@/components/ExpenseCard';
import { useExpenses } from '@/hooks/useExpenses';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';
import { calcDigitalSummary } from '@/utils/digitalTransactions';
import type { Expense } from '@/types/expense';

// ─── Payment method accent used across this screen ───────────────────────────
const DIGITAL_COLOR = AppColors.accent; // purple — distinct from Cash green

// ─── Component ────────────────────────────────────────────────────────────────

export default function DigitalTransactionsScreen() {
  const router = useRouter();
  const { expenses, loading, error, refresh } = useExpenses();

  // Reload whenever the screen gains focus (user may have added an expense).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Derive summary from in-memory data — zero extra DB calls.
  const { digitalExpenses, spendingToday, spendingThisMonth, count } = useMemo(
    () => calcDigitalSummary(expenses),
    [expenses]
  );

  function handleExpensePress(expense: Expense) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/edit-expense', params: { id: expense.id.toString() } } as any);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading && expenses.length === 0) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={DIGITAL_COLOR} />
        <Text style={styles.feedbackText}>Loading transactions…</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error && expenses.length === 0) {
    return (
      <View style={styles.centred}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.feedbackText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  const EmptyList = (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: `${DIGITAL_COLOR}18` }]}>
        <Ionicons name="phone-portrait-outline" size={36} color={DIGITAL_COLOR} />
      </View>
      <Text style={styles.emptyTitle}>No digital transactions yet</Text>
      <Text style={styles.emptyBody}>
        Digital transactions detected in the future will appear here.
      </Text>
      <TouchableOpacity
        style={styles.addBtn}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPress={() => router.push('/add-expense' as any)}
        activeOpacity={0.85}
        accessibilityLabel="Add a digital expense"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={AppColors.white} />
        <Text style={styles.addBtnText}>Add Digital Expense</Text>
      </TouchableOpacity>
    </View>
  );

  // ── List header: stats + info banner ─────────────────────────────────────────
  const ListHeader = (
    <>
      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>{formatCurrency(spendingToday)}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statValue}>{formatCurrency(spendingThisMonth)}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={[styles.statValue, { color: DIGITAL_COLOR }]}>
            {count} txn{count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* ── Detected Payments Review Queue banner ──────────────────────────── */}
      <TouchableOpacity
        style={styles.reviewBanner}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPress={() => router.push('/detected-payments' as any)}
        activeOpacity={0.85}
      >
        <View style={styles.reviewBannerLeft}>
          <Ionicons name="sparkles" size={20} color={DIGITAL_COLOR} />
          <View>
            <Text style={styles.reviewBannerTitle}>Review Detected Payments</Text>
            <Text style={styles.reviewBannerSub}>Tap to view auto-detected UPI & card payments</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={AppColors.textSecondary} />
      </TouchableOpacity>

      {/* ── Cash vs Digital callout ───────────────────────────────────────── */}
      <View style={styles.distinctionCard}>
        <View style={styles.distinctionRow}>
          <View style={[styles.distinctionDot, { backgroundColor: AppColors.success }]} />
          <Text style={styles.distinctionLabel}>Cash</Text>
          <Text style={styles.distinctionDesc}>Physical notes and coins</Text>
        </View>
        <View style={styles.distinctionRow}>
          <View style={[styles.distinctionDot, { backgroundColor: DIGITAL_COLOR }]} />
          <Text style={styles.distinctionLabel}>Digital</Text>
          <Text style={styles.distinctionDesc}>UPI, Card, Bank Transfer, Online</Text>
        </View>
      </View>

      {/* ── Informational banner ──────────────────────────────────────────── */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color={DIGITAL_COLOR} />
        <Text style={styles.infoText}>
          Digital payments can be tracked automatically with your permission.{' '}
          <Text style={styles.infoTextMuted}>
            This feature is coming soon.
          </Text>
        </Text>
      </View>

      {/* ── Section label ─────────────────────────────────────────────────── */}
      {count > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Digital Expenses</Text>
          {loading && (
            <ActivityIndicator size="small" color={AppColors.textSecondary} />
          )}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
          <View style={[styles.headerIconBadge, { backgroundColor: `${DIGITAL_COLOR}18` }]}>
            <Ionicons name="phone-portrait-outline" size={16} color={DIGITAL_COLOR} />
          </View>
          <Text style={styles.headerTitle}>Digital Transactions</Text>
        </View>

        {/* "Add expense" shortcut in header */}
        <TouchableOpacity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push('/add-expense' as any)}
          style={styles.addIconBtn}
          accessibilityLabel="Add expense"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={22} color={AppColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <FlatList
        data={digitalExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} onPress={handleExpensePress} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyList}
        contentContainerStyle={[
          styles.list,
          digitalExpenses.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  feedbackText: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  errorTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: AppSpacing.sm,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.xxl,
    paddingVertical: AppSpacing.md,
  },
  retryBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
    gap: AppSpacing.md,
  },
  backBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  headerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: AppRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  addIconBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.xl,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1,
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.md,
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
  },
  statLabel: {
    ...AppTypography.small,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },

  // ── Review Banner ─────────────────────────────────────────────────────────────
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.md,
    backgroundColor: AppColors.accentLight,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  reviewBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  reviewBannerTitle: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  reviewBannerSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },

  // ── Cash vs Digital distinction card ─────────────────────────────────────────
  distinctionCard: {
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  distinctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  distinctionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distinctionLabel: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
    width: 56,
  },
  distinctionDesc: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    flex: 1,
  },

  // ── Info banner ──────────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.md,
    backgroundColor: AppColors.accentLight,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
  },
  infoText: {
    flex: 1,
    ...AppTypography.caption,
    color: DIGITAL_COLOR,
    lineHeight: 18,
  },
  infoTextMuted: {
    color: AppColors.textSecondary,
    fontWeight: '400',
  },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.xxl,
    marginBottom: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: AppSpacing.xl,
    paddingBottom: AppSpacing.section + 20,
  },
  listEmpty: {
    flexGrow: 1,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xxxl,
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.section,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: AppRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  emptyTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.md,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.xxl,
    paddingVertical: AppSpacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  addBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
});
