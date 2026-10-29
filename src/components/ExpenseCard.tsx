import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { PAYMENT_METHODS } from '@/constants/paymentMethods';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { Expense } from '@/types/expense';
import { formatCurrency } from '@/utils/currency';

interface ExpenseCardProps {
  expense: Expense;
  onPress?: (expense: Expense) => void;
}

/** Formats "2026-09-02" → "2 Sep 2026" */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ExpenseCard({ expense, onPress }: ExpenseCardProps) {
  const meta = CATEGORIES.find((c) => c.label === expense.category);
  const paymentMeta = PAYMENT_METHODS.find((m) => m.label === expense.paymentMethod);
  const iconName = (meta?.icon ?? 'ellipsis-horizontal-outline') as React.ComponentProps<
    typeof Ionicons
  >['name'];
  const paymentIconName = (paymentMeta?.icon ?? 'ellipsis-horizontal-outline') as React.ComponentProps<
    typeof Ionicons
  >['name'];
  const accentColor = meta?.color ?? AppColors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(expense)}
      activeOpacity={0.7}
      accessibilityLabel={`${expense.category} expense of ${formatCurrency(expense.amount)} paid with ${expense.paymentMethod}`}
      accessibilityRole="button"
    >
      {/* Category icon pill */}
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        <Ionicons name={iconName} size={20} color={accentColor} />
      </View>

      {/* Middle: category + payment method + note + date */}
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>
          {expense.category}
        </Text>
        <View style={styles.paymentMethodRow}>
          <Ionicons name={paymentIconName} size={12} color={paymentMeta?.color ?? AppColors.textSecondary} />
          <Text style={[styles.paymentMethod, { color: paymentMeta?.color ?? AppColors.textSecondary }]} numberOfLines={1}>
            {expense.paymentMethod}
          </Text>
        </View>
        {expense.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {expense.note}
          </Text>
        ) : null}
        <Text style={styles.date}>{formatDate(expense.date)}</Text>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: accentColor }]}>
        {formatCurrency(expense.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.lg,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    marginBottom: AppSpacing.sm,
    gap: AppSpacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  category: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  paymentMethod: {
    ...AppTypography.small,
    fontWeight: '500',
  },
  note: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  date: {
    ...AppTypography.small,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  amount: {
    ...AppTypography.bodyBold,
  },
});
