import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseForm } from '@/components/ExpenseForm';
import { useExpenses } from '@/hooks/useExpenses';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import type { ExpenseInput } from '@/types/expense';
import { parseAmount } from '@/utils/currency';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useExpenses();

  async function handleSubmit(input: ExpenseInput) {
    await addExpense({
      amount: parseAmount(input.amount),
      category: input.category!,
      paymentMethod: input.paymentMethod!,
      note: input.note || undefined,
      date: input.date,
    });

    router.back();
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
        <Text style={styles.title}>Add Expense</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Form */}
      <ExpenseForm onSubmit={handleSubmit} />
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
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
  },
});
