/**
 * quick-cash.tsx — Quick Cash Expense screen (M15 + M16)
 *
 * Minimal UI for recording a cash expense fast.
 * Supports voice input (multi-language) or manual entry.
 * Amount + Category + Save. Payment method is always Cash.
 * Remembers last used category via AsyncStorage.
 */

import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATEGORIES } from '@/constants/categories';
import { useExpenses } from '@/hooks/useExpenses';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { ExpenseCategory } from '@/types/expense';
import { parseExpenseFromSpeech, type ParsedExpense } from '@/utils/parseExpenseFromSpeech';
import { VoiceConfirmation, VoiceError, ListeningIndicator } from '@/components/VoiceConfirmation';

const SCREEN_TAG = '[VOICE-UI]';

const LAST_CATEGORY_KEY = 'quick_cash_last_category';

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function QuickCashScreen() {
  const router = useRouter();
  const { addExpense } = useExpenses();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastCategory, setLastCategory] = useState<ExpenseCategory | null>(null);

  // ── Voice Input State ──────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState(false);
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const {
    status: voiceStatus,
    transcript,
    partialTranscript,
    errorMessage: voiceError,
    startListening,
    cancel: cancelVoice,
    reset: resetVoice,
  } = useSpeechRecognition();

  // ── Debug: Voice screen opened ────────────────────────────────────
  useEffect(() => {
    console.log(`${SCREEN_TAG} Voice screen opened`);
    return () => {
      console.log(`${SCREEN_TAG} Voice screen closing — cleaning up`);
    };
  }, []);

  // ── Lifecycle: App background/foreground ───────────────────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      console.log(`${SCREEN_TAG} [LIFECYCLE] App state → ${nextState}`);
      if (nextState === 'background' && voiceMode) {
        console.log(`${SCREEN_TAG} [LIFECYCLE] App entering background — stopping recognition`);
        cancelVoice();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [voiceMode, cancelVoice]);

  // Load last used category on mount
  useEffect(() => {
    AsyncStorage.getItem(LAST_CATEGORY_KEY).then((val) => {
      if (val && CATEGORIES.some((c) => c.label === val)) {
        setCategory(val as ExpenseCategory);
        setLastCategory(val as ExpenseCategory);
      }
    }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reload last category each time screen is focused
      AsyncStorage.getItem(LAST_CATEGORY_KEY).then((val) => {
        if (val && CATEGORIES.some((c) => c.label === val)) {
          if (!category) setCategory(val as ExpenseCategory);
          setLastCategory(val as ExpenseCategory);
        }
      }).catch(() => {});
    }, [])
  );

  // ── Voice: Parse transcript when final result arrives ──────────────
  useEffect(() => {
    console.log(`${SCREEN_TAG} voiceStatus=${voiceStatus} transcript="${transcript}"`);
    if (voiceStatus === 'processing' && transcript) {
      console.log(`${SCREEN_TAG} Parsing transcript: "${transcript}"`);
      const parsed = parseExpenseFromSpeech(transcript);
      setParsedExpense(parsed);
      console.log(`${SCREEN_TAG} Parsed result: amount=${parsed.amount} merchant=${parsed.merchant} category=${parsed.category} paymentMethod=${parsed.paymentMethod}`);
      // Auto-fill amount and category from parsed result
      if (parsed.amount !== null) {
        setAmount(String(parsed.amount));
      }
      if (parsed.category) {
        setCategory(parsed.category);
      }
    }
  }, [voiceStatus, transcript]);

  // ── Voice: Enter voice mode ───────────────────────────────────────
  function handleVoiceStart() {
    console.log(`${SCREEN_TAG} Start listening pressed`);
    setVoiceMode(true);
    setParsedExpense(null);
    resetVoice();
    startListening();
  }

  // ── Voice: Cancel voice input ─────────────────────────────────────
  function handleVoiceCancel() {
    console.log(`${SCREEN_TAG} Stop listening pressed`);
    cancelVoice();
    setVoiceMode(false);
    setParsedExpense(null);
  }

  // ── Voice: Retry speaking ─────────────────────────────────────────
  function handleVoiceRetry() {
    console.log(`${SCREEN_TAG} Retry pressed`);
    setParsedExpense(null);
    resetVoice();
    startListening();
  }

  // ── Voice: Confirm parsed expense ─────────────────────────────────
  async function handleVoiceConfirm() {
    if (!parsedExpense) return;

    const num = parsedExpense.amount;
    const cat = category || parsedExpense.category;

    if (!num || num <= 0) {
      Alert.alert('No Amount Detected', 'Could not detect the amount. Please try again or enter manually.');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        amount: num,
        category: cat,
        paymentMethod: 'Cash',
        date: getTodayDate(),
      });
      await AsyncStorage.setItem(LAST_CATEGORY_KEY, cat);
      cancelVoice();
      setVoiceMode(false);
      setParsedExpense(null);
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Voice: Switch to manual entry ─────────────────────────────────
  function handleManualEntry() {
    cancelVoice();
    setVoiceMode(false);
    setParsedExpense(null);
    // Keep any parsed amount/category
  }

  // ── Manual Save ───────────────────────────────────────────────────
  async function handleSave() {
    const trimmed = amount.trim();
    if (!trimmed) {
      Alert.alert('Enter Amount', 'Please type the amount you spent.');
      return;
    }

    const num = parseFloat(trimmed);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Amount must be greater than 0.');
      return;
    }

    if (!category) {
      Alert.alert('Select Category', 'Please tap a category button.');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        amount: num,
        category,
        paymentMethod: 'Cash',
        date: getTodayDate(),
      });

      await AsyncStorage.setItem(LAST_CATEGORY_KEY, category);
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleAmountChange(text: string) {
    setAmount(text);
  }

  // ── Voice Mode UI ─────────────────────────────────────────────────
  if (voiceMode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleVoiceCancel}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Expense</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.voiceContent}>
          {/* Listening state */}
          {voiceStatus === 'listening' && (
            <ListeningIndicator
              partialText={partialTranscript}
              onCancel={handleVoiceCancel}
            />
          )}

          {/* Processing state */}
          {voiceStatus === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={AppColors.accent} />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}

          {/* Confirmation after parsing */}
          {voiceStatus === 'processing' && parsedExpense && (
            <VoiceConfirmation
              parsed={parsedExpense}
              saving={submitting}
              onConfirm={handleVoiceConfirm}
              onEdit={handleManualEntry}
              onRetry={handleVoiceRetry}
            />
          )}

          {/* Error state */}
          {voiceStatus === 'error' && voiceError && (
            <VoiceError
              message={voiceError}
              onRetry={handleVoiceRetry}
              onManualEntry={handleManualEntry}
            />
          )}

          {/* Unavailable / no permission */}
          {(voiceStatus === 'unavailable' || voiceStatus === 'no_permission') && (
            <VoiceError
              message={
                voiceStatus === 'unavailable'
                  ? 'Speech recognition is not available on this device.'
                  : 'Microphone permission is required for voice input.'
              }
              onRetry={handleVoiceRetry}
              onManualEntry={handleManualEntry}
            />
          )}

          {/* Idle — waiting to start */}
          {voiceStatus === 'idle' && (
            <View style={styles.idleContainer}>
              <TouchableOpacity
                style={styles.micBigBtn}
                onPress={startListening}
                activeOpacity={0.8}
                accessibilityLabel="Start listening"
                accessibilityRole="button"
              >
                <Ionicons name="mic" size={48} color={AppColors.white} />
              </TouchableOpacity>
              <Text style={styles.idleHint}>
                Tap the mic and speak your expense in your language
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Manual Entry UI (default) ─────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cash Expense</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Voice input prompt */}
          <TouchableOpacity
            style={styles.voicePromptBtn}
            onPress={handleVoiceStart}
            activeOpacity={0.8}
            accessibilityLabel="Speak expense instead"
            accessibilityRole="button"
          >
            <Ionicons name="mic-outline" size={22} color={AppColors.accent} />
            <Text style={styles.voicePromptText}>Speak expense instead</Text>
          </TouchableOpacity>

          {/* Last used hint */}
          {lastCategory && (
            <View style={styles.hintRow}>
              <Ionicons name="time-outline" size={14} color={AppColors.textMuted} />
              <Text style={styles.hintText}>Last used: {lastCategory}</Text>
            </View>
          )}

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountBox}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={AppColors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                maxLength={10}
                autoFocus
                editable={!submitting}
                accessibilityLabel="Expense amount"
              />
              <TouchableOpacity
                style={styles.micSmallBtn}
                onPress={handleVoiceStart}
                activeOpacity={0.7}
                disabled={submitting}
                accessibilityLabel="Speak amount"
                accessibilityRole="button"
              >
                <Ionicons name="mic" size={20} color={AppColors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <View style={styles.categorySection}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[
                      styles.categoryBtn,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => setCategory(cat.label)}
                    activeOpacity={0.7}
                    disabled={submitting}
                    accessibilityLabel={cat.label}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={22}
                      color={isSelected ? '#FFFFFF' : cat.color}
                    />
                    <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={submitting}
            accessibilityLabel="Save cash expense"
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color={AppColors.white} size="small" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={22} color={AppColors.white} />
            )}
            <Text style={styles.saveBtnText}>
              {submitting ? 'Saving...' : 'Save Cash Expense'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.borderLight,
    marginTop: AppSpacing.sm + 2,
    marginBottom: AppSpacing.xs,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  backBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: AppSpacing.xl,
    paddingTop: AppSpacing.xxl,
    paddingBottom: AppSpacing.xxxl,
    gap: AppSpacing.xxl,
  },

  // ── Voice Prompt ────────────────────────────────────────────────────────
  voicePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.accentLight,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.accent,
    borderStyle: 'dashed',
  },
  voicePromptText: {
    ...AppTypography.button,
    color: AppColors.accent,
  },

  // ── Hint ────────────────────────────────────────────────────────────────
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    alignSelf: 'center',
  },
  hintText: {
    ...AppTypography.small,
    color: AppColors.textMuted,
  },

  // ── Amount ──────────────────────────────────────────────────────────────
  amountSection: {
    gap: AppSpacing.md,
  },
  label: {
    ...AppTypography.label,
    color: AppColors.textPrimary,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.lg,
    paddingHorizontal: AppSpacing.xl,
    height: 72,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.accent,
    marginRight: AppSpacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  micSmallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Category ────────────────────────────────────────────────────────────
  categorySection: {
    gap: AppSpacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.md,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.lg,
    backgroundColor: AppColors.surface,
    minWidth: (AppSpacing.xl * 2 + 120 * 2 - AppSpacing.md) / 2,
  },
  categoryBtnText: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  categoryBtnTextSelected: {
    color: '#FFFFFF',
  },

  // ── Save ────────────────────────────────────────────────────────────────
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.success,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET + 12,
    marginTop: AppSpacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },

  // ── Voice Mode ──────────────────────────────────────────────────────────
  voiceContent: {
    flex: 1,
    paddingHorizontal: AppSpacing.xl,
    paddingTop: AppSpacing.xxxl,
  },
  processingContainer: {
    alignItems: 'center',
    gap: AppSpacing.lg,
    paddingVertical: AppSpacing.xxxl,
  },
  processingText: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  idleContainer: {
    alignItems: 'center',
    gap: AppSpacing.xxl,
    paddingTop: AppSpacing.section,
  },
  micBigBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: AppColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleHint: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
