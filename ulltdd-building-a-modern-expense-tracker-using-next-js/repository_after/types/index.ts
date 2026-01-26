export interface Expense {
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string; // ISO date string YYYY-MM-DD
}

export type ExpenseCategory = 'Food' | 'Transport' | 'Entertainment' | 'Utilities' | 'Other';

export const CATEGORIES: ExpenseCategory[] = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
