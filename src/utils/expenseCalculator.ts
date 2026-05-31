/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trip, Expense, Friend, SplitType } from '../types';

export interface FriendBalance {
  friendId: string;
  friendName: string;
  friendColor: string;
  totalPaid: number; // how much they paid
  totalShare: number; // how much they should pay
  netBalance: number; // paid - share (positive means owed money, negative means owes money)
}

export interface Debt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number; // converted to trip base currency
}

/**
 * Calculates how much each person in the split owes or is owed.
 */
export function calculateBalances(trip: Trip, expenses: Expense[]): {
  totalSpent: number;
  friendBalances: FriendBalance[];
  categorySpent: { category: string; total: number; limit: number; percent: number }[];
  debts: Debt[];
} {
  const expenseList = expenses.filter(e => e.tripId === trip.id);
  const totalSpent = expenseList.reduce((sum, e) => sum + e.convertedAmount, 0);

  // Initialize balances
  const balancesMap: Record<string, { paid: number; share: number }> = {};
  trip.friends.forEach(f => {
    balancesMap[f.id] = { paid: 0, share: 0 };
  });

  // Accumulate paid and split shares
  expenseList.forEach(expense => {
    const payerId = expense.payerId;
    const amount = expense.convertedAmount;

    // 1. Accumulate paid
    if (balancesMap[payerId] !== undefined) {
      balancesMap[payerId].paid += amount;
    }

    // 2. Accumulate share based on split structure
    const splitDetails = expense.splitDetails;
    const splitType = expense.splitType;

    // Filter to only count friends that exist in current trip
    const tripFriendIds = trip.friends.map(tf => tf.id);
    const validSplitIds = Object.keys(splitDetails).filter(id => tripFriendIds.includes(id));

    if (splitType === 'equal') {
      // split equally among all non-zero weight participants (or all friends if none specified)
      // Usually SplitDetails for equal are weight mapping. Let's find how many have weight > 0
      const activeIds = validSplitIds.filter(id => splitDetails[id] > 0);
      const participantCount = activeIds.length > 0 ? activeIds.length : trip.friends.length;
      const sharePerPerson = amount / participantCount;

      if (activeIds.length > 0) {
        activeIds.forEach(id => {
          balancesMap[id].share += sharePerPerson;
        });
      } else {
        trip.friends.forEach(f => {
          balancesMap[f.id].share += sharePerPerson;
        });
      }
    } else if (splitType === 'percentage') {
      // splitDetails are percentages out of 100
      validSplitIds.forEach(id => {
        const pct = splitDetails[id] || 0;
        const share = (amount * pct) / 100;
        balancesMap[id].share += share;
      });
    } else if (splitType === 'exact') {
      // splitDetails are exact amounts in base currency
      validSplitIds.forEach(id => {
        const exactAmt = splitDetails[id] || 0;
        balancesMap[id].share += exactAmt;
      });
    } else if (splitType === 'shares') {
      // splitDetails are shares, e.g. 1 share, 2 shares, etc.
      const totalShares = validSplitIds.reduce((sum, id) => sum + (splitDetails[id] || 0), 0);
      validSplitIds.forEach(id => {
        const sh = splitDetails[id] || 0;
        const share = totalShares > 0 ? (amount * sh) / totalShares : 0;
        balancesMap[id].share += share;
      });
    }
  });

  // Calculate FriendBalance list
  const friendBalances: FriendBalance[] = trip.friends.map(friend => {
    const bal = balancesMap[friend.id] || { paid: 0, share: 0 };
    return {
      friendId: friend.id,
      friendName: friend.name,
      friendColor: friend.color,
      totalPaid: Number(bal.paid.toFixed(2)),
      totalShare: Number(bal.share.toFixed(2)),
      netBalance: Number((bal.paid - bal.share).toFixed(2))
    };
  });

  // Category spent
  const categorySpentMap: Record<string, number> = {};
  expenseList.forEach(e => {
    categorySpentMap[e.category] = (categorySpentMap[e.category] || 0) + e.convertedAmount;
  });

  const categorySpent = trip.categoryBudgets.map(cb => {
    const total = categorySpentMap[cb.category] || 0;
    return {
      category: cb.category,
      total: Number(total.toFixed(2)),
      limit: cb.limit,
      percent: cb.limit > 0 ? Number(((total / cb.limit) * 100).toFixed(1)) : 0
    };
  });

  // Check if there are other unbudgeted categories that had expenses
  const budgetedCats = trip.categoryBudgets.map(cb => cb.category);
  Object.keys(categorySpentMap).forEach(cat => {
    if (!budgetedCats.includes(cat)) {
      const total = categorySpentMap[cat];
      categorySpent.push({
        category: cat,
        total: Number(total.toFixed(2)),
        limit: 0,
        percent: 0
      });
    }
  });

  // Calculate debt settlements (simplified transaction optimizer)
  const debtors = friendBalances
    .filter(b => b.netBalance < -0.01)
    .map(b => ({ ...b, netBalance: -b.netBalance })) // work with positive owe amount
    .sort((a, b) => b.netBalance - a.netBalance);

  const creditors = friendBalances
    .filter(b => b.netBalance > 0.01)
    .map(b => ({ ...b }))
    .sort((a, b) => b.netBalance - a.netBalance);

  const debts: Debt[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const payAmount = Math.min(debtor.netBalance, creditor.netBalance);

    if (payAmount > 0.01) {
      debts.push({
        fromId: debtor.friendId,
        fromName: debtor.friendName,
        toId: creditor.friendId,
        toName: creditor.friendName,
        amount: Number(payAmount.toFixed(2))
      });
    }

    debtor.netBalance -= payAmount;
    creditor.netBalance -= payAmount;

    if (debtor.netBalance <= 0.01) dIdx++;
    if (creditor.netBalance <= 0.01) cIdx++;
  }

  return {
    totalSpent: Number(totalSpent.toFixed(2)),
    friendBalances,
    categorySpent,
    debts
  };
}
