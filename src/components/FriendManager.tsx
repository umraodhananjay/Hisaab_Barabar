/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, User, Mail, ArrowRight, HandCoins, CheckCircle, Smartphone } from 'lucide-react';
import { Friend, Trip, Expense } from '../types';
import { calculateBalances } from '../utils/expenseCalculator';
import { getCurrencySymbol } from '../data';

interface FriendManagerProps {
  currentTrip: Trip;
  expenses: Expense[];
  onAddFriend: (friend: Friend) => void;
  onSettleDebt: (debt: { fromId: string; toId: string; amount: number }) => void;
}

export default function FriendManager({
  currentTrip,
  expenses,
  onAddFriend,
  onSettleDebt,
}: FriendManagerProps) {
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { friendBalances, debts } = calculateBalances(currentTrip, expenses);
  const currencySymbol = getCurrencySymbol(currentTrip.baseCurrency);

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Violet
    '#EF4444', // Red
    '#06B6D4', // Cyan
  ];

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newFriendName.trim()) {
      setErrorMsg('Full name is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newFriendEmail.trim() && !emailRegex.test(newFriendEmail)) {
      setErrorMsg('Invalid email format');
      return;
    }

    // Determine color based on index
    const randomColor = colors[currentTrip.friends.length % colors.length];

    const newObj: Friend = {
      id: `f-${Date.now()}`,
      name: newFriendName.trim(),
      email: newFriendEmail.trim() || `${newFriendName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      color: randomColor,
    };

    onAddFriend(newObj);
    setNewFriendName('');
    setNewFriendEmail('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Add Companion Form & Companion List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-slate-600" />
          Trip Participants ({currentTrip.friends.length})
        </h3>

        {/* Existing Friends list */}
        <div className="space-y-3 max-h-56 overflow-y-auto mb-5 pr-1">
          {currentTrip.friends.map(friend => {
            const initials = friend.name
              .split(' ')
              .slice(0, 2)
              .map(n => n[0])
              .join('')
              .toUpperCase();

            return (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: friend.color }}
                  >
                    {initials}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      {friend.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block">
                      {friend.email}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Companion Form */}
        <form onSubmit={handleAddFriendSubmit} className="border-t border-slate-100 pt-4 space-y-3">
          <span className="text-xs font-semibold text-slate-700 block">Add Travel Friend</span>

          <div>
            <label className="sr-only">Name</label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="friend-name-input"
                type="text"
                placeholder="Full Name (e.g. Robin)"
                value={newFriendName}
                onChange={e => setNewFriendName(e.target.value)}
                className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-600 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="sr-only">Email</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="friend-email-input"
                type="email"
                placeholder="Email Address"
                value={newFriendEmail}
                onChange={e => setNewFriendEmail(e.target.value)}
                className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-600 bg-slate-50/50"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-[11px] text-red-500 font-medium font-sans">{errorMsg}</p>
          )}

          <button
            id="add-friend-btn"
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs cursor-pointer shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Settle Companion
          </button>
        </form>
      </div>

      {/* 2. Detailed Settle and Contribution Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 lg:col-span-2">
        <h3 className="font-semibold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-slate-600" />
          Contribution & Balances Summary
        </h3>

        {/* List the Balance Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {friendBalances.map(friendBal => {
            const initials = friendBal.friendName
              .split(' ')
              .slice(0, 2)
              .map(n => n[0])
              .join('')
              .toUpperCase();

            const isDebtFree = Math.abs(friendBal.netBalance) <= 0.05;
            const isCreditor = friendBal.netBalance > 0.05;

            return (
              <div
                key={friendBal.friendId}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                  isCreditor
                    ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200'
                    : isDebtFree
                      ? 'bg-slate-50 border-slate-100'
                      : 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: friendBal.friendColor }}
                    >
                      {initials}
                    </div>
                    <span className="text-xs font-bold text-slate-800 font-sans">
                      {friendBal.friendName}
                    </span>
                  </div>

                  {isCreditor ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Is Owed
                    </span>
                  ) : isDebtFree ? (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                      Settled Up
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                      Owes
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-mono uppercase">Paid</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {currencySymbol}
                      {friendBal.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-mono uppercase">Share</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {currencySymbol}
                      {friendBal.totalShare.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-mono uppercase">Balance</span>
                    <span
                      className={`text-xs font-bold ${
                        isCreditor
                          ? 'text-emerald-700'
                          : isDebtFree
                            ? 'text-slate-500'
                            : 'text-red-700'
                      }`}
                    >
                      {isCreditor ? '+' : ''}
                      {currencySymbol}
                      {friendBal.netBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Smarter Settlement suggestions (debt minimizer transactions) */}
        <div className="border-t border-slate-100 pt-4 bg-slate-50 rounded-xl p-4">
          <span className="text-xs font-bold text-slate-800 block mb-3 uppercase tracking-wider">
            Optimized Settlement Paths
          </span>

          {debts.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs leading-relaxed">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                <strong>All members are squared!</strong> No transactions needed. Every participant paid matches their split shares perfectly.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map((debt, idx) => (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg bg-white border border-slate-200 gap-3 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 font-sans">{debt.fromName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800 font-sans">{debt.toName}</span>
                    <span className="ml-1 text-slate-400 text-[11px] font-sans">
                      to settle up balances
                    </span>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <span className="text-sm font-extrabold text-blue-700 font-mono">
                      {currencySymbol}
                      {debt.amount.toLocaleString()}
                    </span>

                    <button
                      id={`settle-btn-${idx}`}
                      onClick={() => onSettleDebt(debt)}
                      className="px-2.5 py-1.5 rounded bg-emerald-600 font-semibold text-white hover:bg-emerald-700 transition cursor-pointer text-[10px] flex items-center gap-1 shadow-sm"
                    >
                      Settle Up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
