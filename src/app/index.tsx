import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ExpenseCard } from '@/components/ExpenseCard';
import { FilterBottomSheet } from '@/components/FilterBottomSheet';
import { useExpenses } from '@/hooks/useExpenses';
import { useCashWallet } from '@/hooks/useCashWallet';
import { useDailyClosing } from '@/hooks/useDailyClosing';
import { useAuth } from '@/context/AuthContext';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types/expense';
import { formatCurrency } from '@/utils/currency';
import {
  DEFAULT_FILTERS,
  filterExpenses,
  hasActiveFilters,
  calculateTotal,
} from '@/utils/expenseFilters';
import type { DateFilter as DateFilterType, ExpenseFilters } from '@/utils/expenseFilters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

export default function HomeScreen() {
  const router = useRouter();
  const { expenses, loading, error, refresh } = useExpenses();
  const { signOut } = useAuth();
  const { expectedBalance, difference, refresh: refreshWallet } = useCashWallet();
  const {
    totalSpending: todayTotalSpending,
    cashSpending,
    digitalSpending,
    savedClosing,
    refresh: refreshClosing,
  } = useDailyClosing({ allExpenses: expenses, expectedCash: expectedBalance });

  // Filter state
  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Refresh everything every time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshWallet();
      refreshClosing();
    }, [refresh, refreshWallet, refreshClosing])
  );

  // Apply filters to expenses
  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, filters),
    [expenses, filters]
  );

  // Calculate today's expenses for the home summary
  const todayExpenses = useMemo(
    () => filterExpenses(expenses, { ...DEFAULT_FILTERS, date: 'Today' }),
    [expenses]
  );
  const todayTotal = useMemo(() => calculateTotal(todayExpenses), [todayExpenses]);

  // Cash and digital breakdown for today
  const todayCashSpent = useMemo(
    () => todayExpenses.filter((e) => e.paymentMethod === 'Cash').reduce((s, e) => s + e.amount, 0),
    [todayExpenses]
  );
  const todayDigitalSpent = todayTotal - todayCashSpent;

  // Check if filters are active
  const isFiltered = hasActiveFilters(filters);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'All') count++;
    if (filters.paymentMethod !== 'All') count++;
    if (filters.date !== 'All Time') count++;
    return count;
  }, [filters]);

  // Daily status
  const hasDifference = difference !== null && difference !== 0;
  const isBalanced = difference === 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCategoryChange(category: ExpenseCategory | 'All') {
    setFilters((prev) => ({ ...prev, category }));
  }

  function handlePaymentMethodChange(paymentMethod: PaymentMethod | 'All') {
    setFilters((prev) => ({ ...prev, paymentMethod }));
  }

  function handleDateChange(date: DateFilterType) {
    setFilters((prev) => ({ ...prev, date }));
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleFilterApply() {
    // Filters are already applied via state
  }

  function handleExpensePress(expense: Expense) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/edit-expense', params: { id: expense.id.toString() } } as any);
  }

  function handleWalletPress() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/cash-wallet' as any);
  }

  function handleDailyClosingPress() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/daily-closing' as any);
  }

  function handleDigitalPress() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/detected-payments' as any);
  }

  function handleMoneyCheck() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/reconciliation' as any);
  }

  function handleQuickCash() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/quick-cash' as any);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading && expenses.length === 0) {
    return (
      <View style={styles.centredFeedback}>
        <ActivityIndicator size="large" color={AppColors.accent} />
        <Text style={styles.feedbackText}>Loading...</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error && expenses.length === 0) {
    return (
      <View style={styles.centredFeedback}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
        </View>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.feedbackText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main screen ────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerIconWrap}
            onPress={handleSignOut}
            activeOpacity={0.7}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ExpenseCard expense={item} onPress={handleExpensePress} />
          )}
          contentContainerStyle={[
            styles.list,
            filteredExpenses.length === 0 && styles.listEmpty,
          ]}
          ListHeaderComponent={
            <>
              {/* Money Left */}
              <View style={styles.moneyLeftCard}>
                <Text style={styles.moneyLeftLabel}>Money Left</Text>
                <Text style={styles.moneyLeftAmount}>{formatCurrency(expectedBalance)}</Text>
              </View>

              {/* Spent Today */}
              <View style={styles.spentTodayCard}>
                <View style={styles.spentTodayHeader}>
                  <Text style={styles.spentTodayLabel}>Spent Today</Text>
                  <Text style={styles.spentTodayAmount}>{formatCurrency(todayTotal)}</Text>
                </View>

                {todayTotal > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                      <View style={[styles.dot, { backgroundColor: AppColors.success }]} />
                      <Text style={styles.breakdownLabel}>Cash</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(todayCashSpent)}</Text>
                    </View>
                    <View style={styles.breakdownDivider} />
                    <View style={styles.breakdownItem}>
                      <View style={[styles.dot, { backgroundColor: AppColors.accent }]} />
                      <Text style={styles.breakdownLabel}>Digital</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(todayDigitalSpent)}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Daily Status */}
              {expenses.length > 0 && (
                <View style={styles.statusCard}>
                  {isBalanced ? (
                    <View style={styles.statusRow}>
                      <Ionicons name="checkmark-circle" size={20} color={AppColors.success} />
                      <Text style={[styles.statusText, { color: AppColors.success }]}>
                        Everything looks good
                      </Text>
                    </View>
                  ) : hasDifference ? (
                    <TouchableOpacity
                      style={styles.statusRow}
                      onPress={handleDailyClosingPress}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="warning" size={20} color={AppColors.warning} />
                      <View style={styles.statusInfo}>
                        <Text style={[styles.statusText, { color: AppColors.warning }]}>
                          Check your cash
                        </Text>
                        <Text style={styles.statusSub}>
                          {formatCurrency(Math.abs(difference!))} difference
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={AppColors.textSecondary} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.statusRow}>
                      <Ionicons name="moon-outline" size={20} color={AppColors.textSecondary} />
                      <Text style={[styles.statusText, { color: AppColors.textSecondary }]}>
                        Tap to close your day
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Quick Actions — grid */}
              <View style={styles.quickActions}>
                {/* Row 1: Cash Expense, Check Cash, Detected */}
                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={handleQuickCash}
                    activeOpacity={0.7}
                    accessibilityLabel="Quick cash expense"
                    accessibilityRole="button"
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: AppColors.successLight }]}>
                      <Ionicons name="cash-outline" size={20} color={AppColors.success} />
                    </View>
                    <Text style={styles.quickActionLabel}>+ Cash</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={handleWalletPress}
                    activeOpacity={0.7}
                    accessibilityLabel="Check cash"
                    accessibilityRole="button"
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: AppColors.successLight }]}>
                      <Ionicons name="wallet-outline" size={20} color={AppColors.success} />
                    </View>
                    <Text style={styles.quickActionLabel}>Check Cash</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={handleDigitalPress}
                    activeOpacity={0.7}
                    accessibilityLabel="Detected payments"
                    accessibilityRole="button"
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: AppColors.accentLight }]}>
                      <Ionicons name="phone-portrait-outline" size={20} color={AppColors.accent} />
                    </View>
                    <Text style={styles.quickActionLabel}>Detected</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Money Check, Daily Closing, Filter */}
                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={handleMoneyCheck}
                    activeOpacity={0.7}
                    accessibilityLabel="Money check"
                    accessibilityRole="button"
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: AppColors.infoLight }]}>
                      <Ionicons name="swap-horizontal-outline" size={20} color={AppColors.info} />
                    </View>
                    <Text style={styles.quickActionLabel}>Money Check</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={handleDailyClosingPress}
                    activeOpacity={0.7}
                    accessibilityLabel="Daily closing"
                    accessibilityRole="button"
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: AppColors.accentLight }]}>
                      <Ionicons name="moon-outline" size={20} color={AppColors.accent} />
                    </View>
                    <Text style={styles.quickActionLabel}>Daily Closing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickAction}
                    onPress={() => setFilterSheetVisible(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Filter expenses"
                    accessibilityRole="button"
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: AppColors.warningLight }]}>
                      <Ionicons name="filter-outline" size={20} color={AppColors.warning} />
                    </View>
                    <Text style={styles.quickActionLabel}>Filter</Text>
                    {activeFilterCount > 0 && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Section header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Expenses</Text>
                {loading && expenses.length > 0 ? (
                  <ActivityIndicator size="small" color={AppColors.textSecondary} />
                ) : null}
              </View>
            </>
          }
          ListEmptyComponent={
            <EmptyState
              isFiltered={isFiltered}
              onClearFilters={handleClearFilters}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={filters}
        onCategoryChange={handleCategoryChange}
        onPaymentMethodChange={handlePaymentMethodChange}
        onDateChange={handleDateChange}
        onClearFilters={handleClearFilters}
        onApply={handleFilterApply}
      />

      {/* Active filter chips */}
      {isFiltered && (
        <View style={styles.activeFiltersBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            {filters.category !== 'All' && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={() => handleCategoryChange('All')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeChipText}>{filters.category}</Text>
                <Ionicons name="close" size={14} color={AppColors.accent} />
              </TouchableOpacity>
            )}
            {filters.paymentMethod !== 'All' && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={() => handlePaymentMethodChange('All')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeChipText}>{filters.paymentMethod}</Text>
                <Ionicons name="close" size={14} color={AppColors.accent} />
              </TouchableOpacity>
            )}
            {filters.date !== 'All Time' && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={() => handleDateChange('All Time')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeChipText}>{filters.date}</Text>
                <Ionicons name="close" size={14} color={AppColors.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.activeChip, styles.clearAllChip]}
              onPress={handleClearFilters}
              activeOpacity={0.7}
            >
              <Text style={[styles.activeChipText, { color: AppColors.error }]}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* FAB */}
      <SafeAreaView style={styles.fabArea} edges={['bottom']} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push('/add-expense' as any)}
          activeOpacity={0.85}
          accessibilityLabel="Add expense"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={30} color={AppColors.white} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  safeArea: {
    flex: 1,
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  centredFeedback: {
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
  errorIconWrap: {
    marginBottom: AppSpacing.xs,
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
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + AppSpacing.lg : AppSpacing.lg,
    paddingHorizontal: AppSpacing.xl,
    paddingBottom: AppSpacing.lg,
  },
  greeting: {
    ...AppTypography.heading,
    color: AppColors.textPrimary,
  },
  headerIconWrap: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Money Left Card ──────────────────────────────────────────────────────
  moneyLeftCard: {
    marginHorizontal: AppSpacing.xl,
    marginBottom: AppSpacing.lg,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.xxl,
    paddingVertical: AppSpacing.xxl,
    paddingHorizontal: AppSpacing.xxl,
    alignItems: 'center',
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  moneyLeftLabel: {
    ...AppTypography.small,
    color: AppColors.whiteAlpha60,
    textTransform: 'uppercase',
    marginBottom: AppSpacing.xs,
  },
  moneyLeftAmount: {
    ...AppTypography.heroAmount,
    color: AppColors.white,
  },

  // ── Spent Today Card ────────────────────────────────────────────────────
  spentTodayCard: {
    marginHorizontal: AppSpacing.xl,
    marginBottom: AppSpacing.lg,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.xl,
  },
  spentTodayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spentTodayLabel: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  spentTodayAmount: {
    ...AppTypography.cardAmount,
    color: AppColors.textPrimary,
  },
  breakdownRow: {
    flexDirection: 'row',
    marginTop: AppSpacing.lg,
    backgroundColor: AppColors.surface2,
    borderRadius: AppRadius.md,
    overflow: 'hidden',
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  breakdownDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  breakdownValue: {
    ...AppTypography.captionBold,
    color: AppColors.textPrimary,
    marginLeft: 'auto',
  },

  // ── Status Card ──────────────────────────────────────────────────────────
  statusCard: {
    marginHorizontal: AppSpacing.xl,
    marginBottom: AppSpacing.lg,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    ...AppTypography.bodyBold,
  },
  statusSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    marginTop: 2,
  },

  // ── Quick Actions ────────────────────────────────────────────────────────
  quickActions: {
    flexDirection: 'column',
    paddingHorizontal: AppSpacing.xl,
    gap: AppSpacing.md,
    marginBottom: AppSpacing.xxl,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.lg,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  filterBadge: {
    position: 'absolute',
    top: AppSpacing.sm,
    right: AppSpacing.sm,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.white,
  },

  // ── Section header ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    marginBottom: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },

  // ── Active Filters Bar ───────────────────────────────────────────────────
  activeFiltersBar: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  activeFiltersScroll: {
    paddingHorizontal: AppSpacing.xl,
    gap: AppSpacing.sm,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: AppColors.accentLight,
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs + 2,
  },
  activeChipText: {
    ...AppTypography.caption,
    color: AppColors.accent,
    fontWeight: '600',
  },
  clearAllChip: {
    backgroundColor: AppColors.errorLight,
  },

  // ── List ─────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: AppSpacing.xl,
    paddingBottom: 120,
  },
  listEmpty: {
    flexGrow: 1,
  },

  // ── FAB ──────────────────────────────────────────────────────────────────
  fabArea: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: 'flex-end',
    paddingHorizontal: AppSpacing.xxl,
    pointerEvents: 'box-none',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.xxl,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
});
