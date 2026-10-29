import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import type { ExpenseCategory } from '@/types/expense';

interface FilterChipsProps {
  selected: ExpenseCategory | 'All';
  onSelect: (category: ExpenseCategory | 'All') => void;
}

const ACCENT = '#6C63FF';

export function FilterChips({ selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* All chip */}
      <TouchableOpacity
        style={[
          styles.chip,
          selected === 'All' && { backgroundColor: ACCENT, borderColor: ACCENT },
        ]}
        onPress={() => onSelect('All')}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="layers-outline"
            size={16}
            color={selected === 'All' ? '#FFFFFF' : ACCENT}
          />
        </View>
        <Text style={[styles.chipText, selected === 'All' && styles.chipTextSelected]}>
          All
        </Text>
      </TouchableOpacity>

      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.label;
        return (
          <TouchableOpacity
            key={cat.label}
            style={[
              styles.chip,
              isSelected && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
            onPress={() => onSelect(cat.label)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={isSelected ? '#FFFFFF' : cat.color}
              />
            </View>
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {cat.label}
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