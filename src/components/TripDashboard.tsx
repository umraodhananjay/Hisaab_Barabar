/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Plane,
  Hotel,
  Utensils,
  Train,
  MapPin,
  ShoppingBag,
  Carrot,
  DollarSign,
  Edit2,
  Trash2,
  PieChartIcon,
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
} from 'lucide-react';
import { Trip, Expense } from '../types';
import { calculateBalances } from '../utils/expenseCalculator';
import { getCurrencySymbol, CATEGORIES } from '../data';

interface TripDashboardProps {
  currentTrip: Trip;
  expenses: Expense[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export default function TripDashboard({
  currentTrip,
  expenses,
  onEditExpense,
  onDeleteExpense,
}: TripDashboardProps) {
  const [activeChartTab, setActiveChartTab] = useState<'category' | 'comparison'>('category');

  const { totalSpent, friendBalances, categorySpent } = calculateBalances(currentTrip, expenses);
  const currencySymbol = getCurrencySymbol(currentTrip.baseCurrency);

  // 1. Data mapping for Category Pie Chart
  const pieData = categorySpent
    .filter(cat => cat.total > 0)
    .map(cat => {
      const catMeta = CATEGORIES.find(c => c.key === cat.category);
      return {
        name: catMeta ? catMeta.name : cat.category,
        value: cat.total,
        color: catMeta ? catMeta.color : 'bg-gray-500',
      };
    });

  // Recharts Pie Colors
  const COLORS = {
    flights: '#3B82F6',       // blue-500
    accommodation: '#8B5CF6', // purple-500
    dining: '#F97316',        // orange-500
    transport: '#10B981',     // emerald-500
    activities: '#F43F5E',    // rose-500
    shopping: '#EC4899',      // pink-500
    groceries: '#F59E0B',     // amber-500
    others: '#64748B',        // slate-500
  };

  const getRechartColor = (name: string): string => {
    const key = CATEGORIES.find(c => c.name === name)?.key || 'others';
    return COLORS[key as keyof typeof COLORS] || '#64748B';
  };

  // 2. Data mapping for Settle/Contribution Bar Chart
  const barData = friendBalances.map(fb => ({
    name: fb.friendName.replace(' (You)', ''),
    Paid: fb.totalPaid,
    Share: fb.totalShare,
  }));

  // Determine top category
  let topCategoryName = 'None';
  let topCategoryAmt = 0;
  categorySpent.forEach(cat => {
    if (cat.total > topCategoryAmt) {
      topCategoryAmt = cat.total;
      const meta = CATEGORIES.find(c => c.key === cat.category);
      topCategoryName = meta ? meta.name : cat.category;
    }
  });

  const tripFriendCount = currentTrip.friends.length;
  const tripExpenses = expenses.filter(e => e.tripId === currentTrip.id);

  // Render correct Lucide Category Icons dynamically
  const renderCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case 'flights':
        return <Plane className="w-4 h-4 text-white" />;
      case 'accommodation':
        return <Hotel className="w-4 h-4 text-white" />;
      case 'dining':
        return <Utensils className="w-4 h-4 text-white" />;
      case 'transport':
        return <Train className="w-4 h-4 text-white" />;
      case 'activities':
        return <MapPin className="w-4 h-4 text-white" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-white" />;
      case 'groceries':
        return <Carrot className="w-4 h-4 text-white" />;
      default:
        return <DollarSign className="w-4 h-4 text-white" />;
    }
  };

  const getCategoryColorClass = (catKey: string) => {
    const cat = CATEGORIES.find(c => c.key === catKey);
    return cat ? cat.color : 'bg-slate-500';
  };

  // Custom tooltips to make charts look highly polished
  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-2.5 rounded-lg border border-slate-700 shadow-lg text-[11px] font-semibold font-sans">
          <p className="font-bold">{payload[0].name}</p>
          <p className="mt-0.5 font-mono text-blue-300">
            {currencySymbol}
            {payload[0].value.toLocaleString()} ({currentTrip.baseCurrency})
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-2.5 rounded-lg border border-slate-700 shadow-lg text-[11px] font-sans">
          <p className="font-bold text-slate-200 mb-1">{payload[0].payload.name}</p>
          <p className="text-emerald-400 font-semibold font-mono">
            Paid: {currencySymbol}
            {payload[0].value.toLocaleString()}
          </p>
          <p className="text-rose-400 font-semibold font-mono">
            Owes Share: {currencySymbol}
            {payload[1].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent Stat CARD */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition duration-300">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
              Total Trip Spent
            </span>
            <span className="text-xl font-black text-slate-900 font-sans tracking-tight">
              {currencySymbol}
              {totalSpent.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Budget Left STAT CARD */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition duration-300">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
              Remaining Budget
            </span>
            <span
              className={`text-xl font-black font-sans tracking-tight ${
                currentTrip.budget - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {currencySymbol}
              {(currentTrip.budget - totalSpent).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top Spend Category STAT CARD */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition duration-300">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
              Top Expense Class
            </span>
            <span className="text-sm font-extrabold text-slate-900 font-sans">
              {topCategoryName} ({currencySymbol}
              {topCategoryAmt.toLocaleString()})
            </span>
          </div>
        </div>

        {/* Participants STAT CARD */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition duration-300">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
              Companions Tracking
            </span>
            <span className="text-xl font-black text-slate-900 font-sans tracking-tight">
              {tripFriendCount} Splits
            </span>
          </div>
        </div>
      </div>

      {/* 2. Charts Visualization Panel & Recent Transactions list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Analytics Box */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-600" />
                Analytics & Cost Analysis
              </h3>

              {/* Toggles */}
              <div className="flex border border-slate-100 rounded-lg overflow-hidden bg-slate-50 text-[10px] font-bold font-sans">
                <button
                  id="chart-tab-category"
                  onClick={() => setActiveChartTab('category')}
                  className={`px-3 py-1 text-slate-600 font-semibold cursor-pointer uppercase flex items-center gap-1 border-r border-slate-100 ${
                    activeChartTab === 'category' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  <PieChartIcon className="w-3 h-3" />
                  Category
                </button>
                <button
                  id="chart-tab-comparison"
                  onClick={() => setActiveChartTab('comparison')}
                  className={`px-3 py-1 text-slate-600 font-semibold cursor-pointer uppercase flex items-center gap-1 ${
                    activeChartTab === 'comparison'
                      ? 'bg-slate-800 text-white'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Contributions
                </button>
              </div>
            </div>

            {/* Dynamic Recharts Rendering */}
            <div className="h-64 flex items-center justify-center">
              {tripExpenses.length === 0 ? (
                <div className="text-center">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5] mb-2" />
                  <p className="text-xs text-slate-400 font-sans">No transactions available yet to map graph reports.</p>
                </div>
              ) : activeChartTab === 'category' ? (
                pieData.length === 0 ? (
                  <p className="text-xs text-slate-400">Waiting for category metrics...</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={75}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getRechartColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={value => (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded mr-1">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip content={<CustomTooltipBar />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={value => <span className="text-[10px] font-semibold text-slate-600">{value}</span>}
                    />
                    <Bar dataKey="Paid" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Share" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick analysis paragraph */}
          {tripExpenses.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 mt-4 leading-relaxed font-sans">
              {activeChartTab === 'category' ? (
                <span>
                  <strong>Category Log:</strong> Accommodation and Flight typically cost the most. Current top spent category is{' '}
                  <strong className="text-slate-700">{topCategoryName}</strong> sitting at{' '}
                  <strong className="text-blue-700">
                    {currencySymbol}
                    {topCategoryAmt.toLocaleString()}
                  </strong>
                  .
                </span>
              ) : (
                <span>
                  <strong>Cost Equity:</strong> Compare how much everyone has physically spent (green) out of pocket versus their exact split-wise responsibilities (red). High difference means a settle-up owes is needed!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Transaction History Listing */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-slate-600" />
              Shared Ledger Ledger ({tripExpenses.length} Records)
            </h3>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {tripExpenses.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5] mb-2" />
                  <p className="text-xs text-slate-400 font-sans">No expenses stored on this trip.</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-sans">Click "Add Expense Splitting" above to enter a bill!</p>
                </div>
              ) : (
                tripExpenses
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(expense => {
                    const originalSymbol = getCurrencySymbol(expense.currency);
                    const payerFriend = currentTrip.friends.find(f => f.id === expense.payerId);
                    const payerName = payerFriend ? payerFriend.name : 'Unknown';

                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Round Category visual badge */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${getCategoryColorClass(
                              expense.category
                            )}`}
                          >
                            {renderCategoryIcon(expense.category)}
                          </div>

                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate font-sans">
                              {expense.description}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-mono font-semibold">
                              <span>{expense.date}</span>
                              <span>•</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-white text-[8px] font-bold"
                                style={{ backgroundColor: payerFriend ? payerFriend.color : '#64748b' }}
                              >
                                PAID BY: {payerName.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Financial values */}
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-800 block font-sans">
                              {currencySymbol}
                              {expense.convertedAmount.toLocaleString()}
                            </span>
                            {expense.currency !== currentTrip.baseCurrency && (
                              <span className="text-[9px] text-slate-400 font-mono italic block">
                                {originalSymbol}
                                {expense.amount.toLocaleString()} {expense.currency}
                              </span>
                            )}
                          </div>

                          {/* Quick Actions buttons */}
                          <div className="flex gap-1">
                            <button
                              id={`edit-exp-btn-${expense.id}`}
                              onClick={() => onEditExpense(expense)}
                              className="p-1 hover:bg-white text-slate-400 hover:text-slate-600 rounded border border-transparent hover:border-slate-200 transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              id={`del-exp-btn-${expense.id}`}
                              onClick={() => onDeleteExpense(expense.id)}
                              className="p-1 hover:bg-white text-slate-400 hover:text-red-600 rounded border border-transparent hover:border-slate-200 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
