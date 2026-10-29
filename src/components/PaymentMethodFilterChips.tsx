import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PAYMENT_METHODS } from '@/constants/paymentMethods';
import type { PaymentMethod } from '@/types/expense';

interface PaymentMethodFilterChipsProps {
  selected: PaymentMethod | 'All';
  onSelect: (method: PaymentMethod | 'All') => void;
}

const ACCENT = '#6C63FF';

export function PaymentMethodFilterChips({ selected, onSelect }: PaymentMethodFilterChipsProps) {
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

      {PAYMENT_METHODS.map((method) => {
        const isSelected = selected === method.label;
        return (
          <TouchableOpacity
            key={method.label}
            style={[
              styles.chip,
              isSelected && { backgroundColor: method.color, borderColor: method.color },
            ]}
            onPress={() => onSelect(method.label)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={method.icon as any}
                size={16}
                color={isSelected ? '#FFFFFF' : method.color}
              />
            </View>
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {method.label}
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