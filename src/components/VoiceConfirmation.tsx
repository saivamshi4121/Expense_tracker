/**
 * VoiceConfirmation.tsx (src/components/VoiceConfirmation.tsx)
 *
 * Confirmation UI shown after speech recognition parses an expense.
 * Shows the parsed details and lets the user confirm, edit, or retry.
 */

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { ParsedExpense } from '@/utils/parseExpenseFromSpeech';
import { formatCurrency } from '@/utils/currency';

interface VoiceConfirmationProps {
  /** The parsed expense from speech */
  parsed: ParsedExpense;
  /** Whether saving is in progress */
  saving: boolean;
  /** Called when user confirms the expense */
  onConfirm: () => void;
  /** Called when user wants to edit manually */
  onEdit: () => void;
  /** Called when user wants to try speaking again */
  onRetry: () => void;
}

export function VoiceConfirmation({
  parsed,
  saving,
  onConfirm,
  onEdit,
  onRetry,
}: VoiceConfirmationProps) {
  const categoryMeta = CATEGORIES.find((c) => c.label === parsed.category);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={28} color={AppColors.success} />
        <Text style={styles.headerText}>Is this correct?</Text>
      </View>

      {/* Parsed Details Card */}
      <View style={styles.card}>
        {/* Amount */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailAmount}>
            {parsed.amount !== null ? formatCurrency(parsed.amount) : '—'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Merchant / Description */}
        {parsed.merchant && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{parsed.merchant}</Text>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Category */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <View style={styles.categoryChip}>
            {categoryMeta && (
              <Ionicons
                name={categoryMeta.icon as any}
                size={14}
                color={categoryMeta.color}
              />
            )}
            <Text style={[styles.categoryText, { color: categoryMeta?.color || AppColors.textSecondary }]}>
              {parsed.category}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Payment Method */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment</Text>
          <Text style={styles.detailValue}>{parsed.paymentMethod}</Text>
        </View>
      </View>

      {/* Raw text hint */}
      <View style={styles.rawRow}>
        <Ionicons name="mic-outline" size={14} color={AppColors.textMuted} />
        <Text style={styles.rawText} numberOfLines={1}>
          "{parsed.rawText}"
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.confirmBtn, saving && styles.btnDisabled]}
          onPress={onConfirm}
          activeOpacity={0.85}
          disabled={saving}
          accessibilityLabel="Save expense"
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={AppColors.white} size="small" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color={AppColors.white} />
          )}
          <Text style={styles.confirmBtnText}>
            {saving ? 'Saving...' : 'Save Expense'}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onEdit}
            activeOpacity={0.7}
            disabled={saving}
            accessibilityLabel="Edit expense"
            accessibilityRole="button"
          >
            <Ionicons name="pencil-outline" size={18} color={AppColors.textPrimary} />
            <Text style={styles.secondaryBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onRetry}
            activeOpacity={0.7}
            disabled={saving}
            accessibilityLabel="Try speaking again"
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={18} color={AppColors.textPrimary} />
            <Text style={styles.secondaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Error Display ────────────────────────────────────────────────────────

interface VoiceErrorProps {
  message: string;
  onRetry: () => void;
  onManualEntry: () => void;
}

export function VoiceError({ message, onRetry, onManualEntry }: VoiceErrorProps) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconWrap}>
        <Ionicons name="mic-off-outline" size={32} color={AppColors.error} />
      </View>
      <Text style={styles.errorTitle}>{message}</Text>

      <View style={styles.errorActions}>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          activeOpacity={0.85}
          accessibilityLabel="Try speaking again"
          accessibilityRole="button"
        >
          <Ionicons name="mic-outline" size={20} color={AppColors.white} />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualBtn}
          onPress={onManualEntry}
          activeOpacity={0.85}
          accessibilityLabel="Enter manually"
          accessibilityRole="button"
        >
          <Text style={styles.manualBtnText}>Enter Manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Listening Indicator ──────────────────────────────────────────────────

interface ListeningIndicatorProps {
  partialText?: string;
  onCancel: () => void;
}

export function ListeningIndicator({ partialText, onCancel }: ListeningIndicatorProps) {
  return (
    <View style={styles.listeningContainer}>
      <View style={styles.pulseRing}>
        <View style={styles.pulseDot} />
      </View>
      <Text style={styles.listeningTitle}>Listening...</Text>
      {partialText ? (
        <Text style={styles.partialText} numberOfLines={2}>
          {partialText}
        </Text>
      ) : (
        <Text style={styles.listeningHint}>
          Speak your expense in any language
        </Text>
      )}

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={onCancel}
        activeOpacity={0.7}
        accessibilityLabel="Cancel listening"
        accessibilityRole="button"
      >
        <Ionicons name="close-circle" size={40} color={AppColors.error} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Confirmation ──────────────────────────────────────────────────────
  container: {
    gap: AppSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    justifyContent: 'center',
  },
  headerText: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },

  // ── Card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
  },
  detailLabel: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailAmount: {
    ...AppTypography.heroAmount,
    fontSize: 28,
    color: AppColors.success,
  },
  detailValue: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
    textTransform: 'capitalize',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: AppColors.surface2,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.sm,
  },
  categoryText: {
    ...AppTypography.captionBold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
  },

  // ── Raw text ──────────────────────────────────────────────────────────
  rawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    justifyContent: 'center',
  },
  rawText: {
    ...AppTypography.small,
    color: AppColors.textMuted,
    fontStyle: 'italic',
    maxWidth: '80%',
  },

  // ── Actions ───────────────────────────────────────────────────────────
  actions: {
    gap: AppSpacing.md,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.success,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET + 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  secondaryBtnText: {
    ...AppTypography.button,
    color: AppColors.textPrimary,
  },

  // ── Error ─────────────────────────────────────────────────────────────
  errorContainer: {
    alignItems: 'center',
    gap: AppSpacing.lg,
    paddingVertical: AppSpacing.xxl,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET,
  },
  retryBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  manualBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  manualBtnText: {
    ...AppTypography.button,
    color: AppColors.textPrimary,
  },

  // ── Listening ─────────────────────────────────────────────────────────
  listeningContainer: {
    alignItems: 'center',
    gap: AppSpacing.lg,
    paddingVertical: AppSpacing.xxxl,
  },
  pulseRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.error,
  },
  listeningTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  partialText: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: AppSpacing.xl,
  },
  listeningHint: {
    ...AppTypography.caption,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: AppSpacing.md,
  },
});
