/**
 * detected-payments.tsx (src/app/detected-payments.tsx)
 *
 * Review queue for automatically detected digital payment transactions.
 * Allows user to review, edit category, add to normal expenses, or ignore.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES } from '@/constants/categories';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import { useDetectedTransactions } from '@/hooks/useDetectedTransactions';
import { isMerchantCategoryLearned } from '@/db/detectedTransactions';
import type { DetectedTransaction } from '@/types/detectedTransaction';
import type { ExpenseCategory } from '@/types/expense';
import { formatCurrency } from '@/utils/currency';
import { useSQLiteContext } from 'expo-sqlite';

export default function DetectedPaymentsScreen() {
  const router = useRouter();
  const {
    pendingTransactions,
    loading,
    permissionGranted,
    checkPermission,
    requestPermission,
    acceptTransaction,
    ignoreTransaction,
    refresh,
    triggerTestNotification,
    clearTestData,
  } = useDetectedTransactions();

  const db = useSQLiteContext();
  const [learnedMerchants, setLearnedMerchants] = useState<Set<string>>(new Set());

  // Check learned status for all pending transactions
  useFocusEffect(
    useCallback(() => {
      async function checkLearned() {
        const results = await Promise.all(
          pendingTransactions.map(async (tx) => {
            const learned = await isMerchantCategoryLearned(db, tx.merchant);
            return { merchant: tx.merchant, learned };
          })
        );
        setLearnedMerchants(new Set(results.filter(r => r.learned).map(r => r.merchant)));
      }
      if (pendingTransactions.length > 0) {
        checkLearned();
      }
    }, [db, pendingTransactions])
  );

  // Re-check permission every time this screen gains focus
  useFocusEffect(
    useCallback(() => {
      checkPermission();
    }, [checkPermission])
  );

  // Category Selector Modal State
  const [selectedTx, setSelectedTx] = useState<DetectedTransaction | null>(null);
  const [chosenCategory, setChosenCategory] = useState<ExpenseCategory>('Other');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  function openCategoryPicker(tx: DetectedTransaction) {
    setSelectedTx(tx);
    setChosenCategory((tx.suggestedCategory as ExpenseCategory) || 'Other');
    setCategoryModalVisible(true);
  }

  async function handleConfirmAdd() {
    if (!selectedTx) return;
    await acceptTransaction(selectedTx, chosenCategory);
    setCategoryModalVisible(false);
    setSelectedTx(null);
  }

  async function handleTestDetection() {
    setTestStatus('Sending test notification...');
    try {
      triggerTestNotification();
    } catch (e) {
      setTestStatus('ERROR: ' + String(e));
      return;
    }
    setTimeout(async () => {
      await refresh();
      setTestStatus('Notification sent. Check if it appeared in the queue above.');
      setTimeout(() => setTestStatus(null), 4000);
    }, 2000);
  }

  async function handleClearTestData() {
    const deleted = await clearTestData();
    setTestStatus(`Cleared ${deleted} test record(s).`);
    setTimeout(() => setTestStatus(null), 3000);
  }

  function renderTransactionCard({ item }: { item: DetectedTransaction }) {
    const isHigh = item.confidenceLevel === 'HIGH';
    const isLearned = learnedMerchants.has(item.merchant);

    return (
      <View style={[styles.card, isHigh && styles.cardHigh]}>
        {/* Header Row: Merchant + Amount */}
        <View style={styles.cardHeader}>
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantText}>{item.merchant}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.methodTag}>{item.paymentMethod}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.timeText}>{item.transactionTime.split('T')[0]}</Text>
            </View>
          </View>
          <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
        </View>

        {/* Confidence, Category & Learned Indicator */}
        <View style={styles.detailsRow}>
          <View style={styles.detailsLeft}>
            <View style={[styles.confidenceBadge, isHigh ? styles.badgeHigh : styles.badgeMed]}>
              <Ionicons
                name={(isHigh ? 'shield-checkmark' : 'shield-outline') as any}
                size={12}
                color={isHigh ? AppColors.success : AppColors.warning}
              />
              <Text style={[styles.confidenceText, { color: isHigh ? AppColors.success : AppColors.warning }]}>
                {item.confidence}% Match
              </Text>
            </View>

            {isLearned && (
              <View style={styles.learnedBadge}>
                <Ionicons name="bulb" size={11} color={AppColors.info} />
                <Text style={styles.learnedText}>Based on your previous choice</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.categoryChip}
            onPress={() => openCategoryPicker(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryChipLabel}>Cat: {item.suggestedCategory || 'Other'}</Text>
            <Ionicons name="pencil" size={12} color={AppColors.accent} />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.ignoreBtn}
            onPress={() => ignoreTransaction(item.id)}
            activeOpacity={0.7}
            accessibilityLabel="Ignore payment"
            accessibilityRole="button"
          >
            <Text style={styles.ignoreBtnText}>Ignore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, isHigh && styles.addBtnHigh]}
            onPress={() => openCategoryPicker(item)}
            activeOpacity={0.85}
            accessibilityLabel="Add to expenses"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color={AppColors.white} />
            <Text style={styles.addBtnText}>
              {isHigh ? 'Quick Add' : 'Add to Expenses'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={AppColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Detected Payments</Text>
          {pendingTransactions.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{pendingTransactions.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Status Banner */}
      {permissionGranted ? (
        <View style={styles.statusBannerOn}>
          <Ionicons name="checkmark-circle" size={20} color={AppColors.success} />
          <View style={styles.permTextContainer}>
            <Text style={styles.permTitleOn}>Automatic Detection is ON</Text>
            <Text style={styles.permSubOn}>Listening for payment notifications</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.statusBannerOff}
          onPress={requestPermission}
          activeOpacity={0.85}
          accessibilityLabel="Turn on Automatic Detection"
          accessibilityRole="button"
        >
          <Ionicons name="notifications" size={20} color={AppColors.accent} />
          <View style={styles.permTextContainer}>
            <Text style={styles.permTitleOff}>Turn on Automatic Detection</Text>
            <Text style={styles.permSubOff}>Tap to open notification settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={AppColors.textSecondary} />
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={AppColors.accent} />
        </View>
      ) : (
        <FlatList
          data={pendingTransactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransactionCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={AppColors.success} />
              </View>
              <Text style={styles.emptyTitle}>No pending detected payments</Text>
              <Text style={styles.emptySub}>
                {permissionGranted
                  ? 'New digital transactions detected from app notifications will appear here for your review.'
                  : 'Enable notification access to automatically detect digital payments.'}
              </Text>
            </View>
          }
        />
      )}

      {/* DEV/TEST ONLY Section */}
      <View style={styles.devSection}>
        <Text style={styles.devLabel}>DEV/TEST ONLY</Text>
        <View style={styles.devButtons}>
          <TouchableOpacity
            style={styles.devTestBtn}
            onPress={handleTestDetection}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={16} color={AppColors.white} />
            <Text style={styles.devTestBtnText}>Test Detection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.devClearBtn}
            onPress={handleClearTestData}
            activeOpacity={0.85}
          >
            <Ionicons name="trash" size={16} color={AppColors.warning} />
            <Text style={styles.devClearBtnText}>Clear Test Data</Text>
          </TouchableOpacity>
        </View>
        {testStatus && (
          <Text style={styles.devStatus}>{testStatus}</Text>
        )}
      </View>

      {/* Category Selection Modal */}
      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Expense</Text>
            {selectedTx && (
              <Text style={styles.modalSubtitle}>
                {selectedTx.merchant} • {formatCurrency(selectedTx.amount)}
              </Text>
            )}

            <Text style={styles.modalLabel}>Select Category:</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  style={[
                    styles.catOption,
                    chosenCategory === cat.label && styles.catOptionSelected,
                  ]}
                  onPress={() => setChosenCategory(cat.label as ExpenseCategory)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={18}
                    color={chosenCategory === cat.label ? AppColors.white : AppColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.catOptionText,
                      chosenCategory === cat.label && styles.catOptionTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmAdd}>
                <Text style={styles.modalSaveText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
    gap: AppSpacing.md,
  },
  backBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  headerTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  countBadge: {
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.pill,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  countText: {
    ...AppTypography.small,
    color: AppColors.white,
  },

  // ── Status Banners ──────────────────────────────────────────────────────
  statusBannerOn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.successLight,
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.lg,
    padding: AppSpacing.lg,
    borderRadius: AppRadius.lg,
    gap: AppSpacing.md,
    borderWidth: 1,
    borderColor: `${AppColors.success}33`,
  },
  statusBannerOff: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.accentLight,
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.lg,
    padding: AppSpacing.lg,
    borderRadius: AppRadius.lg,
    gap: AppSpacing.md,
    borderWidth: 1,
    borderColor: `${AppColors.accent}33`,
  },
  permTextContainer: {
    flex: 1,
  },
  permTitleOn: {
    ...AppTypography.bodyBold,
    color: AppColors.success,
  },
  permSubOn: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  permTitleOff: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  permSubOff: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: AppSpacing.xl,
    gap: AppSpacing.lg,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardHigh: {
    borderColor: AppColors.success,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  merchantInfo: {
    flex: 1,
    marginRight: AppSpacing.md,
  },
  merchantText: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    marginTop: 2,
  },
  methodTag: {
    ...AppTypography.captionBold,
    color: AppColors.accent,
  },
  dot: {
    color: AppColors.textMuted,
  },
  timeText: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  amountText: {
    ...AppTypography.cardAmount,
    color: AppColors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  learnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${AppColors.info}18`,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
    borderRadius: AppRadius.sm,
  },
  learnedText: {
    ...AppTypography.small,
    color: AppColors.info,
    fontSize: 10,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
    borderRadius: AppRadius.sm,
  },
  badgeHigh: {
    backgroundColor: AppColors.successLight,
  },
  badgeMed: {
    backgroundColor: AppColors.warningLight,
  },
  confidenceText: {
    ...AppTypography.small,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.surface2,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 4,
    borderRadius: AppRadius.pill,
  },
  categoryChipLabel: {
    ...AppTypography.caption,
    color: AppColors.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    marginTop: AppSpacing.xs,
  },
  ignoreBtn: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ignoreBtnText: {
    ...AppTypography.button,
    color: AppColors.textSecondary,
  },
  addBtn: {
    flex: 2,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  addBtnHigh: {
    backgroundColor: AppColors.success,
  },
  addBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.section * 1.5,
    paddingHorizontal: AppSpacing.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  emptyTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: AppSpacing.sm,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xl,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xxl,
    gap: AppSpacing.md,
  },
  modalTitle: {
    ...AppTypography.title,
    color: AppColors.textPrimary,
  },
  modalSubtitle: {
    ...AppTypography.body,
    color: AppColors.accent,
  },
  modalLabel: {
    ...AppTypography.label,
    color: AppColors.textSecondary,
    marginTop: AppSpacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.surface2,
  },
  catOptionSelected: {
    backgroundColor: AppColors.accent,
  },
  catOptionText: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
  },
  catOptionTextSelected: {
    color: AppColors.white,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    marginTop: AppSpacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    ...AppTypography.button,
    color: AppColors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    ...AppTypography.button,
    color: AppColors.white,
  },

  // ── DEV/TEST Styles ───────────────────────────────────────────────────
  devSection: {
    marginHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.md,
    padding: AppSpacing.md,
    borderRadius: AppRadius.md,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
    gap: AppSpacing.sm,
  },
  devLabel: {
    ...AppTypography.small,
    color: '#856404',
    fontWeight: '700',
    textAlign: 'center',
  },
  devButtons: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  devTestBtn: {
    flex: 1,
    height: MIN_TOUCH_TARGET - 4,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  devTestBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
    fontSize: 12,
  },
  devClearBtn: {
    flex: 1,
    height: MIN_TOUCH_TARGET - 4,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.warning,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  devClearBtnText: {
    ...AppTypography.button,
    color: AppColors.warning,
    fontSize: 12,
  },
  devStatus: {
    ...AppTypography.small,
    color: '#856404',
    textAlign: 'center',
  },
});
