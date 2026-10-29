import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DateFilter } from '@/components/DateFilter';
import { FilterChips } from '@/components/FilterChips';
import { PaymentMethodFilterChips } from '@/components/PaymentMethodFilterChips';
import type { ExpenseCategory, PaymentMethod } from '@/types/expense';
import type { DateFilter as DateFilterType, ExpenseFilters } from '@/utils/expenseFilters';
import { hasActiveFilters } from '@/utils/expenseFilters';

interface FilterBarProps {
  filters: ExpenseFilters;
  onCategoryChange: (category: ExpenseCategory | 'All') => void;
  onPaymentMethodChange: (paymentMethod: PaymentMethod | 'All') => void;
  onDateChange: (date: DateFilterType) => void;
  onClearFilters: () => void;
}

const ACCENT = '#6C63FF';
const TEXT_SECONDARY = '#8A8A9A';

export function FilterBar({
  filters,
  onCategoryChange,
  onPaymentMethodChange,
  onDateChange,
  onClearFilters,
}: FilterBarProps) {
  const isActive = hasActiveFilters(filters);

  return (
    <View style={styles.container}>
      {/* Category filters */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <FilterChips selected={filters.category} onSelect={onCategoryChange} />
      </View>

      {/* Payment Method filters */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <PaymentMethodFilterChips selected={filters.paymentMethod} onSelect={onPaymentMethodChange} />
      </View>

      {/* Date filters */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Date</Text>
        <DateFilter selected={filters.date} onSelect={onDateChange} />
      </View>

      {/* Clear filters button */}
      {isActive && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClearFilters}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={16} color={ACCENT} />
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
});