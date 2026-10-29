import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { ExpenseForm } from '@/components/ExpenseForm';
import { useExpenses } from '@/hooks/useExpenses';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { Expense, ExpenseInput } from '@/types/expense';
import { getExpenseById } from '@/db/expenses';
import { parseAmount } from '@/utils/currency';

export default function EditExpenseScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateExpenseById, removeExpense } = useExpenses();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExpense() {
      try {
        const found = await getExpenseById(db, Number(id));
        if (found) {
          setExpense(found);
        } else {
          setError('Expense not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expense');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadExpense();
    }
  }, [id]);

  async function handleSubmit(input: ExpenseInput) {
    if (!expense) return;

    await updateExpenseById(expense.id, {
      amount: parseAmount(input.amount),
      category: input.category!,
      paymentMethod: input.paymentMethod!,
      note: input.note || undefined,
      date: input.date,
    });

    router.back();
  }

  function handleDelete() {
    if (!expense) return;

    Alert.alert(
      'Delete Expense',
      'Delete this expense?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExpense(expense.id);
              router.back();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete expense');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  if (loading) {
    return (
      <View style={styles.centredFeedback}>
        <ActivityIndicator size="large" color={AppColors.accent} />
        <Text style={styles.feedbackText}>Loading...</Text>
      </View>
    );
  }

  if (error || !expense) {
    return (
      <View style={styles.centredFeedback}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
        </View>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.feedbackText}>{error || 'Expense not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        <Text style={styles.title}>Edit Expense</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteBtn}
          accessibilityLabel="Delete expense"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={AppColors.error} />
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ExpenseForm
        onSubmit={handleSubmit}
        initialValues={{
          amount: expense.amount,
          category: expense.category,
          paymentMethod: expense.paymentMethod,
          note: expense.note,
          date: expense.date,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  backBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
  },
  deleteBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  centredFeedback: {
    flex: 1,
    backgroundColor: AppColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingHorizontal: AppSpacing.xxxl,
  },
  feedbackText: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  errorIconWrap: {
    marginBottom: AppSpacing.xs,
  },
  errorTitle: {
    ...AppTypography.subtitle,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: AppSpacing.sm,
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.xxl,
    paddingVertical: AppSpacing.lg,
  },
  retryBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
});
