import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

import { CategorySelector } from '@/components/CategorySelector';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { ExpenseCategory, ExpenseInput, PaymentMethod } from '@/types/expense';

interface ExpenseFormProps {
  /** Called when validation passes. Must return a promise — throw to surface an error banner. */
  onSubmit: (expense: ExpenseInput) => Promise<void>;
  /** Initial values for editing an existing expense */
  initialValues?: {
    amount: number;
    category: ExpenseCategory;
    paymentMethod: PaymentMethod;
    note?: string;
    date: string;
  };
}

interface FormErrors {
  amount?: string;
  category?: string;
  paymentMethod?: string;
}

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ExpenseForm({ onSubmit, initialValues }: ExpenseFormProps) {
  const [amount, setAmount] = useState(initialValues?.amount.toString() || '');
  const [note, setNote] = useState(initialValues?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(initialValues?.paymentMethod || null);
  const [category, setCategory] = useState<ExpenseCategory | null>(initialValues?.category || null);
  const [date] = useState(initialValues?.date || getTodayDate());

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: FormErrors = {};

    if (!amount.trim()) {
      errors.amount = 'Amount is required';
    } else {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) {
        errors.amount = 'Amount must be greater than 0';
      }
    }

    if (!category) {
      errors.category = 'Please select a category';
    }

    if (!paymentMethod) {
      errors.paymentMethod = 'Please select how you paid';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitError(null);
    if (!validate()) return;

    const expense: ExpenseInput = {
      amount: amount.trim(),
      category,
      paymentMethod,
      date,
      note: note.trim(),
    };

    setSubmitting(true);
    try {
      await onSubmit(expense);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save expense. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Field handlers ────────────────────────────────────────────────────────
  function handleAmountChange(text: string) {
    setAmount(text);
    if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }));
    if (submitError) setSubmitError(null);
  }

  function handleCategorySelect(cat: ExpenseCategory) {
    setCategory(cat);
    if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: undefined }));
    if (submitError) setSubmitError(null);
  }

  function handlePaymentMethodSelect(method: PaymentMethod) {
    setPaymentMethod(method);
    if (fieldErrors.paymentMethod) setFieldErrors((p) => ({ ...p, paymentMethod: undefined }));
    if (submitError) setSubmitError(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* DB error banner */}
      {submitError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{submitError}</Text>
        </View>
      ) : null}

      {/* Amount — Priority 1 */}
      <View style={styles.field}>
        <Text style={styles.label}>Amount</Text>
        <View style={[styles.amountRow, fieldErrors.amount && styles.inputErrorBorder]}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0"
            placeholderTextColor={AppColors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="next"
            maxLength={10}
            editable={!submitting}
          />
        </View>
        {fieldErrors.amount ? <Text style={styles.fieldError}>{fieldErrors.amount}</Text> : null}
      </View>

      {/* Note — Priority 2: "What was it?" */}
      <View style={styles.field}>
        <Text style={styles.label}>What was it?</Text>
        <TextInput
          style={[styles.textInput, styles.noteInput]}
          value={note}
          onChangeText={(text) => {
            setNote(text);
            if (submitError) setSubmitError(null);
          }}
          placeholder="e.g. Lunch, Bus fare, Groceries"
          placeholderTextColor={AppColors.textMuted}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          returnKeyType="next"
          maxLength={200}
          editable={!submitting}
        />
      </View>

      {/* Payment Method — Priority 3 */}
      <View style={styles.field}>
        <Text style={styles.label}>Paid With</Text>
        <PaymentMethodSelector selected={paymentMethod} onSelect={handlePaymentMethodSelect} />
        {fieldErrors.paymentMethod ? (
          <Text style={styles.fieldError}>{fieldErrors.paymentMethod}</Text>
        ) : null}
      </View>

      {/* Category — Priority 4 */}
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <CategorySelector selected={category} onSelect={handleCategorySelect} />
        {fieldErrors.category ? (
          <Text style={styles.fieldError}>{fieldErrors.category}</Text>
        ) : null}
      </View>

      {/* Date (read-only) */}
      <View style={styles.field}>
        <Text style={styles.label}>Date</Text>
        <View style={styles.dateBox}>
          <Ionicons name="calendar-outline" size={18} color={AppColors.textSecondary} />
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={submitting}
        accessibilityLabel="Save expense"
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color={AppColors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save Expense</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: AppSpacing.xl,
    paddingTop: AppSpacing.lg,
    paddingBottom: AppSpacing.xxxl,
    gap: AppSpacing.xl,
  },

  // ── Error banner ──────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: AppColors.errorLight,
    borderWidth: 1,
    borderColor: AppColors.error,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  errorBannerText: {
    ...AppTypography.caption,
    color: AppColors.error,
    lineHeight: 18,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  field: {
    gap: AppSpacing.sm,
  },
  label: {
    ...AppTypography.label,
    color: AppColors.textPrimary,
  },
  fieldError: {
    ...AppTypography.small,
    color: AppColors.error,
  },

  // ── Amount ────────────────────────────────────────────────────────────────
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    height: 60,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputErrorBorder: {
    borderColor: AppColors.error,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.accent,
    marginRight: AppSpacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },

  // ── Text inputs ───────────────────────────────────────────────────────────
  textInput: {
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.lg,
    fontSize: 15,
    color: AppColors.textPrimary,
  },
  noteInput: {
    height: 72,
    paddingTop: AppSpacing.lg,
  },

  // ── Date ──────────────────────────────────────────────────────────────────
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.lg,
  },
  dateText: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET + 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: AppSpacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
});
