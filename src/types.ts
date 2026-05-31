/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Friend {
  id: string;
  name: string;
  email: string;
  color: string; // Tailwind bg-class or hex code
}

export type SplitType = 'equal' | 'percentage' | 'exact' | 'shares';

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  currency: string; // original currency code, e.g., JPY, EUR, INR, USD
  convertedAmount: number; // in trip's base currency
  exchangeRate: number; // rate used: 1 Original Currency = X Base Currency
  category: string;
  date: string;
  payerId: string; // Friend ID who paid
  splitType: SplitType;
  splitDetails: Record<string, number>; // Friend ID -> share value (percentage, exact amt, shares, or equal split weight)
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number; // total overall budget
  baseCurrency: string; // e.g. USD, EUR, INR
  friends: Friend[]; // list of participants
  categoryBudgets: CategoryBudget[]; // budget per category
}

export interface TripNotification {
  id: string;
  tripId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'expense_added' | 'budget_warning' | 'settlement' | 'offline_sync';
}

export interface ExchangeRate {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number; // 1 unit of this currency = X USD
}
