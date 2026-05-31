/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExchangeRate, Trip, Friend, Expense, TripNotification } from './types';

// Standard exchange rates relative to USD (1 unit of currency = X USD)
// For example, 1 EUR = 1.08 USD, 1 JPY = 0.0064 USD, 1 INR = 0.012 USD
export const EXCHANGE_RATES: ExchangeRate[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rateToUSD: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUSD: 1.08 },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', rateToUSD: 1.26 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToUSD: 0.0063 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUSD: 0.012 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rateToUSD: 0.73 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rateToUSD: 0.66 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToUSD: 0.74 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rateToUSD: 1.10 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', rateToUSD: 0.027 },
];

export function getCurrencySymbol(code: string): string {
  return EXCHANGE_RATES.find(r => r.code === code)?.symbol || code;
}

/**
 * Convert dynamic amount from original currency to target currency
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string
): { convertedAmount: number; rate: number } {
  const fromRate = EXCHANGE_RATES.find(r => r.code === fromCode)?.rateToUSD || 1.0;
  const toRate = EXCHANGE_RATES.find(r => r.code === toCode)?.rateToUSD || 1.0;

  // Amount in USD
  const amountInUSD = amount * fromRate;
  // Convert to target currency
  const convertedAmount = amountInUSD / toRate;

  // Rate: 1 FromCode = X ToCode
  // e.g. 1 EUR = 1.08 USD. 1 JPY = 0.0063 USD.
  // 1 EUR = 1.08 / 0.0063 = 171.4 JPY.
  const rate = fromRate / toRate;

  return {
    convertedAmount: Number(convertedAmount.toFixed(2)),
    rate: Number(rate.toFixed(6))
  };
}

export const CATEGORIES = [
  { key: 'flights', name: 'Flights', icon: 'Plane', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { key: 'accommodation', name: 'Accommodation', icon: 'Hotel', color: 'bg-purple-500', textColor: 'text-purple-500' },
  { key: 'dining', name: 'Dining', icon: 'Utensils', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { key: 'transport', name: 'Transport', icon: 'Train', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  { key: 'activities', name: 'Activities', icon: 'MapPin', color: 'bg-rose-500', textColor: 'text-rose-500' },
  { key: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: 'bg-pink-500', textColor: 'text-pink-500' },
  { key: 'groceries', name: 'Groceries', icon: 'Carrot', color: 'bg-amber-500', textColor: 'text-amber-500' },
  { key: 'others', name: 'Others', icon: 'DollarSign', color: 'bg-gray-500', textColor: 'text-gray-500' }
];

export const INITIAL_FRIENDS: Friend[] = [
  { id: '1', name: 'Dhananjay (You)', email: 'umraodhananjay@gmail.com', color: '#3B82F6' }, // blue
  { id: '2', name: 'Sarah', email: 'sarah.k@example.com', color: '#10B981' }, // emerald
  { id: '3', name: 'Alex', email: 'alex.m@example.com', color: '#F59E0B' }, // amber
  { id: '4', name: 'Yuki', email: 'yuki.t@example.com', color: '#EC4899' }, // pink
];

export const INITIAL_TRIPS: Trip[] = [
  {
    id: 'tokyo-2026',
    name: 'Tokyo & Kyoto Cherry Blossoms',
    destination: 'Japan',
    startDate: '2026-06-15',
    endDate: '2026-06-25',
    budget: 4500, // USD
    baseCurrency: 'USD',
    friends: INITIAL_FRIENDS,
    categoryBudgets: [
      { category: 'flights', limit: 1200 },
      { category: 'accommodation', limit: 1500 },
      { category: 'dining', limit: 800 },
      { category: 'activities', limit: 600 },
      { category: 'transport', limit: 400 },
    ]
  },
  {
    id: 'euro-trip-2026',
    name: 'Alpine Summer Adventure',
    destination: 'Switzerland & France',
    startDate: '2026-08-01',
    endDate: '2026-08-12',
    budget: 5000, // EUR
    baseCurrency: 'EUR',
    friends: [
      INITIAL_FRIENDS[0], // Dhananjay
      INITIAL_FRIENDS[1], // Sarah
      INITIAL_FRIENDS[2], // Alex
    ],
    categoryBudgets: [
      { category: 'accommodation', limit: 2000 },
      { category: 'activities', limit: 1000 },
      { category: 'dining', limit: 1000 },
    ]
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  // Expense paid in foreign currency JPY, trip base currency USD
  {
    id: 'exp-1',
    tripId: 'tokyo-2026',
    description: 'Ryokan Stay in Kyoto (2 nights)',
    amount: 120000,
    currency: 'JPY',
    convertedAmount: 756.00, // 120000 * 0.0063
    exchangeRate: 0.0063,
    category: 'accommodation',
    date: '2026-05-20',
    payerId: '1', // Dhananjay (You) paid
    splitType: 'equal',
    splitDetails: { '1': 1, '2': 1, '3': 1, '4': 1 } // equal split to everyone
  },
  {
    id: 'exp-2',
    tripId: 'tokyo-2026',
    description: 'Shinkansen Bullet Train Tickets',
    amount: 58000,
    currency: 'JPY',
    convertedAmount: 365.40,
    exchangeRate: 0.0063,
    category: 'transport',
    date: '2026-05-21',
    payerId: '4', // Yuki paid
    splitType: 'equal',
    splitDetails: { '1': 1, '2': 1, '3': 1, '4': 1 }
  },
  {
    id: 'exp-3',
    tripId: 'tokyo-2026',
    description: 'Sushi Dinner in Ginza',
    amount: 40000,
    currency: 'JPY',
    convertedAmount: 252.00,
    exchangeRate: 0.0063,
    category: 'dining',
    date: '2026-05-22',
    payerId: '2', // Sarah paid
    splitType: 'equal',
    splitDetails: { '1': 1, '2': 1, '3': 1, '4': 1 }
  },
  {
    id: 'exp-4',
    tripId: 'tokyo-2026',
    description: 'Tokyo Disneyland Day Pass',
    amount: 32000,
    currency: 'JPY',
    convertedAmount: 201.60,
    exchangeRate: 0.0063,
    category: 'activities',
    date: '2026-05-23',
    payerId: '3', // Alex paid
    splitType: 'percentage',
    // Split: Sarah and Alex want to pay 30% each, Dhananjay and Yuki 20% each
    splitDetails: { '1': 20, '2': 30, '3': 30, '4': 20 }
  },
  {
    id: 'exp-5',
    tripId: 'tokyo-2026',
    description: 'Cherry Blossom Tour Guide',
    amount: 150,
    currency: 'USD',
    convertedAmount: 150.00,
    exchangeRate: 1.0,
    category: 'activities',
    date: '2026-05-24',
    payerId: '1', // Dhananjay paid
    splitType: 'exact',
    // Customized split: only Dhananjay and Sarah did this tour
    // Dhananjay paid $150, but Sarah owes $75, Yuki and Alex owe $0
    splitDetails: { '1': 75, '2': 75, '3': 0, '4': 0 }
  }
];

export const INITIAL_NOTIFICATIONS: TripNotification[] = [
  {
    id: 'notif-1',
    tripId: 'tokyo-2026',
    title: 'Ryokan Stay Split',
    message: 'Dhananjay (You) added "Ryokan Stay in Kyoto" (¥120,000 / $756.00 USD). Everyone owes $189.00.',
    timestamp: '2026-05-20T10:30:00Z',
    isRead: false,
    type: 'expense_added'
  },
  {
    id: 'notif-2',
    tripId: 'tokyo-2026',
    title: 'Bullet Train Tickets Split',
    message: 'Yuki added "Shinkansen Bullet Train Tickets" (¥58,000 / $365.40 USD). Your share is $91.35.',
    timestamp: '2026-05-21T14:15:00Z',
    isRead: false,
    type: 'expense_added'
  },
  {
    id: 'notif-3',
    tripId: 'tokyo-2026',
    title: 'Category Budget Warning',
    message: 'Accommodation budget is at 50.40% ($756.00 / $1,500.00 USD).',
    timestamp: '2026-05-20T10:31:00Z',
    isRead: false,
    type: 'budget_warning'
  }
];

// List of random actions friends might take to trigger "real-time notification simulations"
export const FRIENDS_RANDOM_EXPENSES = [
  {
    description: 'Ramen & Gyoza Dinner',
    amount: 6400,
    currency: 'JPY',
    category: 'dining',
    payerName: 'Sarah',
    payerId: '2'
  },
  {
    description: 'Tokyo Tower Tickets',
    amount: 4800,
    currency: 'JPY',
    category: 'activities',
    payerName: 'Alex',
    payerId: '3'
  },
  {
    description: 'Souvenirs in Akihabara',
    amount: 15000,
    currency: 'JPY',
    category: 'shopping',
    payerName: 'Yuki',
    payerId: '4'
  },
  {
    description: 'Metro 72-Hour Subway Pass',
    amount: 1500,
    currency: 'JPY',
    category: 'transport',
    payerName: 'Sarah',
    payerId: '2'
  },
  {
    description: 'Starbucks Drinks at Shibuya Crossing',
    amount: 2800,
    currency: 'JPY',
    category: 'dining',
    payerName: 'Alex',
    payerId: '3'
  }
];
