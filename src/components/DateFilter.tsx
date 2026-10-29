import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DateFilter as DateFilterType } from '@/utils/expenseFilters';

interface DateFilterProps {
  selected: DateFilterType;
  onSelect: (filter: DateFilterType) => void;
}

const DATE_FILTERS: { label: DateFilterType; icon: string }[] = [
  { label: 'All Time',   icon: 'calendar-outline' },
  { label: 'Today',      icon: 'today-outline' },
  { label: 'This Week',  icon: 'calendar-clear-outline' },
  { label: 'This Month', icon: 'calendar-number-outline' },
];

const ACCENT = '#6C63FF';

export function DateFilter({ selected, onSelect }: DateFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {DATE_FILTERS.map((filter) => {
        const isSelected = selected === filter.label;
        return (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.chip,
              isSelected && { backgroundColor: ACCENT, borderColor: ACCENT },
            ]}
            onPress={() => onSelect(filter.label)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={isSelected ? '#FFFFFF' : '#8A8A9A'}
              />
            </View>
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1A1A24',
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: '#8A8A9A',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});