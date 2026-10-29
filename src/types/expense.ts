export type ExpenseCategory =
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Bank Transfer'
  | 'Debit Card'
  | 'Credit Card'
  | 'Other';

export interface Expense {
  id: number;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: string; // ISO 8601 date string e.g. "2026-09-02"
  note?: string;
}

export type NewExpense = Omit<Expense, 'id'>;

export interface ExpenseInput {
  amount: string;
  category: ExpenseCategory | null;
  paymentMethod: PaymentMethod | null;
  date: string;
  note: string;
}
