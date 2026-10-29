/**
 * CashWalletCard.tsx
 *
 * Compact entry point shown on the Home screen.
 * Tapping it navigates to the full Cash Wallet screen.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatCurrency } from '@/utils/currency';

interface CashWalletCardProps {
  expectedBalance: number;
  /** null = user has never entered actual balance */
  difference: number | null;
  onPress: () => void;
}

const SURFACE = '#1A1A24';
const CASH_GREEN = '#22C55E';
const WARNING = '#F59E0B';
const TEXT_PRIMARY = '#F5F5F7';
const TEXT_SECONDARY = '#8A8A9A';

export function CashWalletCard({ expectedBalance, difference, onPress }: CashWalletCardProps) {
  const hasDifference = difference !== null && difference !== 0;
  const isBalanced = difference === 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel="Open Cash Wallet"
      accessibilityRole="button"
    >
      {/* Left: icon + label */}
      <View style={[styles.iconWrap, { backgroundColor: `${CASH_GREEN}22` }]}>
        <Ionicons name="cash-outline" size={20} color={CASH_GREEN} />
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>Cash Wallet</Text>
        <Text style={styles.balance}>{formatCurrency(expectedBalance)}</Text>

        {hasDifference ? (
          <View style={styles.differenceRow}>
            <Ionicons name="warning-outline" size={12} color={WARNING} />
            <Text style={styles.differenceText}>
              ₹{Math.abs(difference).toLocaleString('en-IN')} difference
            </Text>
          </View>
        ) : isBalanced ? (
          <View style={styles.differenceRow}>
            <Ionicons name="checkmark-circle-outline" size={12} color={CASH_GREEN} />
            <Text style={[styles.differenceText, { color: CASH_GREEN }]}>
              Balance matches
            </Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Tap to reconcile</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={TEXT_SECONDARY} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  balance: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  differenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  differenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: WARNING,
  },
});
