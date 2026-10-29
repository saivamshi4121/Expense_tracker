import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DateFilter } from '@/components/DateFilter';
import { FilterChips } from '@/components/FilterChips';
import { PaymentMethodFilterChips } from '@/components/PaymentMethodFilterChips';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/constants/theme';
import type { ExpenseCategory, PaymentMethod } from '@/types/expense';
import type { DateFilter as DateFilterType, ExpenseFilters } from '@/utils/expenseFilters';
import { hasActiveFilters } from '@/utils/expenseFilters';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: ExpenseFilters;
  onCategoryChange: (category: ExpenseCategory | 'All') => void;
  onPaymentMethodChange: (paymentMethod: PaymentMethod | 'All') => void;
  onDateChange: (date: DateFilterType) => void;
  onClearFilters: () => void;
  onApply: () => void;
}

export function FilterBottomSheet({
  visible,
  onClose,
  filters,
  onCategoryChange,
  onPaymentMethodChange,
  onDateChange,
  onClearFilters,
  onApply,
}: FilterBottomSheetProps) {
  const isActive = hasActiveFilters(filters);

  function handleApply() {
    onApply();
    onClose();
  }

  function handleClear() {
    onClearFilters();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            {isActive && (
              <TouchableOpacity
                onPress={handleClear}
                activeOpacity={0.7}
                accessibilityLabel="Clear all filters"
              >
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
              <FilterChips selected={filters.category} onSelect={onCategoryChange} />
            </View>

            {/* Paid With */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Paid With</Text>
              <PaymentMethodFilterChips selected={filters.paymentMethod} onSelect={onPaymentMethodChange} />
            </View>

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Date</Text>
              <DateFilter selected={filters.date} onSelect={onDateChange} />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.8}
              accessibilityLabel="Apply filters"
              accessibilityRole="button"
            >
              <Text style={styles.applyBtnText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppColors.bg,
    borderTopLeftRadius: AppRadius.xxl,
    borderTopRightRadius: AppRadius.xxl,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.borderLight,
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
  },
  headerTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  clearAllText: {
    ...AppTypography.captionBold,
    color: AppColors.accent,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingHorizontal: AppSpacing.xl,
    gap: AppSpacing.xxl,
    paddingBottom: AppSpacing.lg,
  },
  section: {
    gap: AppSpacing.sm,
  },
  sectionLabel: {
    ...AppTypography.small,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: AppSpacing.xl,
    paddingTop: AppSpacing.md,
    paddingBottom: AppSpacing.sm,
  },
  applyBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
});
