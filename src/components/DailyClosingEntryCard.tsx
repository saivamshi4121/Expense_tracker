/**
 * DailyClosingEntryCard.tsx  (src/components/DailyClosingEntryCard.tsx)
 *
 * Compact card shown on the Home screen that lets the user navigate
 * to the Daily Closing screen with one tap.
 * Shows today's status at a glance.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ClosingResolution } from '@/types/dailyClosing';

interface DailyClosingEntryCardProps {
  /** Whether a closing record exists for today */
  hasClosingToday: boolean;
  /** Today's resolution — null if not yet resolved */
  resolution: ClosingResolution | null;
  /** Today's total spending */
  totalSpending: number;
  onPress: () => void;
}

const SURFACE = '#1A1A24';
const ACCENT = '#6C63FF';
const CASH_GREEN = '#22C55E';
const WARNING = '#F59E0B';
const TEXT_PRIMARY = '#F5F5F7';
const TEXT_SECONDARY = '#8A8A9A';

function statusLabel(
  hasClosing: boolean,
  resolution: ClosingResolution | null
): { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] } {
  if (!hasClosing) {
    return { label: 'Not checked yet', color: TEXT_SECONDARY, icon: 'moon-outline' };
  }
  switch (resolution) {
    case 'resolved':
      return { label: 'Everything looks good ✓', color: CASH_GREEN, icon: 'checkmark-circle-outline' };
    case 'forgot':
      return { label: 'Marked as forgotten', color: WARNING, icon: 'help-circle-outline' };
    case 'review_later':
      return { label: 'Review later', color: WARNING, icon: 'time-outline' };
    default:
      return { label: 'In progress…', color: ACCENT, icon: 'sync-outline' };
  }
}

export function DailyClosingEntryCard({
  hasClosingToday,
  resolution,
  totalSpending,
  onPress,
}: DailyClosingEntryCardProps) {
  const status = statusLabel(hasClosingToday, resolution);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel="Open Daily Closing"
      accessibilityRole="button"
    >
      {/* Left icon */}
      <View style={[styles.iconWrap, { backgroundColor: `${ACCENT}22` }]}>
        <Ionicons name="moon-outline" size={20} color={ACCENT} />
      </View>

      {/* Middle info */}
      <View style={styles.info}>
        <Text style={styles.label}>Daily Closing</Text>
        <Text style={styles.total}>
          ₹{totalSpending.toLocaleString('en-IN')} today
        </Text>
        <View style={styles.statusRow}>
          <Ionicons name={status.icon} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
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
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
