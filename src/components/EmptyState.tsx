import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';

interface EmptyStateProps {
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ isFiltered = false, onClearFilters }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={isFiltered ? 'search-outline' : 'receipt-outline'}
          size={48}
          color={AppColors.accent}
        />
      </View>
      <Text style={styles.title}>
        {isFiltered ? 'No expenses found' : 'No expenses yet'}
      </Text>
      <Text style={styles.subtitle}>
        {isFiltered
          ? 'Try adjusting your filters to see more results.'
          : (
            <>
              Tap the{' '}
              <Text style={styles.highlight}>+</Text>
              {' '}button below to record your first expense.
            </>
          )}
      </Text>
      {isFiltered && onClearFilters && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClearFilters}
          activeOpacity={0.8}
        >
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xxxl + AppSpacing.xxl,
    paddingBottom: AppSpacing.xxxl,
    gap: AppSpacing.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: AppRadius.xxl,
    backgroundColor: AppColors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.xs,
  },
  title: {
    ...AppTypography.title,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  highlight: {
    color: AppColors.accent,
    fontWeight: '700',
  },
  clearButton: {
    marginTop: AppSpacing.sm,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.xxl,
    paddingVertical: AppSpacing.lg,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  clearButtonText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
});
