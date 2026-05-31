/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Plus, DollarSign, Pen, Check } from 'lucide-react';
import { Trip, Expense } from '../types';
import { calculateBalances } from '../utils/expenseCalculator';
import { getCurrencySymbol, CATEGORIES } from '../data';

interface BudgetSummaryProps {
  currentTrip: Trip;
  expenses: Expense[];
  onUpdateCategoryBudgets: (categoryBudgets: { category: string; limit: number }[]) => void;
  onUpdateTotalBudget: (amount: number) => void;
}

export default function BudgetSummary({
  currentTrip,
  expenses,
  onUpdateCategoryBudgets,
  onUpdateTotalBudget,
}: BudgetSummaryProps) {
  const { totalSpent, categorySpent } = calculateBalances(currentTrip, expenses);
  const currencySymbol = getCurrencySymbol(currentTrip.baseCurrency);

  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [editingTotalVal, setEditingTotalVal] = useState(currentTrip.budget.toString());

  // Dictionary for active category limit inputs
  const [editingCategories, setEditingCategories] = useState<Record<string, string>>({});
  const [activeEditingCat, setActiveEditingCat] = useState<string | null>(null);

  const handleTotalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(editingTotalVal);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateTotalBudget(parsed);
      setIsEditingTotal(false);
    }
  };

  const handleCategoryLimitSubmit = (category: string) => {
    const val = editingCategories[category];
    if (val !== undefined) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0) {
        // Update specific category limit
        const updatedCatBudgets = [...currentTrip.categoryBudgets];
        const existingIdx = updatedCatBudgets.findIndex(b => b.category === category);
        if (existingIdx !== -1) {
          updatedCatBudgets[existingIdx].limit = parsed;
        } else {
          updatedCatBudgets.push({ category, limit: parsed });
        }
        onUpdateCategoryBudgets(updatedCatBudgets);
        setActiveEditingCat(null);
      }
    }
  };

  const alerts = categorySpent
    .filter(cat => cat.limit > 0 && cat.total >= cat.limit * 0.8)
    .map(cat => {
      const isExceeded = cat.total > cat.limit;
      const pctValue = cat.percent;
      const catMeta = CATEGORIES.find(c => c.key === cat.category);
      const categoryName = catMeta ? catMeta.name : cat.category;

      return {
        category: cat.category,
        categoryName,
        isExceeded,
        total: cat.total,
        limit: cat.limit,
        percent: pctValue,
        difference: Number(Math.abs(cat.total - cat.limit).toFixed(2)),
      };
    });

  const overallPercent = currentTrip.budget > 0
    ? Number(((totalSpent / currentTrip.budget) * 100).toFixed(1))
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 2. Left Box: Overall Budget Widget with radial progression and warnings */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
              Overall Trip Budget
            </h4>
            {!isEditingTotal ? (
              <button
                id="edit-total-budget-btn"
                onClick={() => {
                  setEditingTotalVal(currentTrip.budget.toString());
                  setIsEditingTotal(true);
                }}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                title="Edit total budget"
              >
                <Pen className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {isEditingTotal ? (
            <form onSubmit={handleTotalSubmit} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-500 font-bold">
                  {currencySymbol}
                </span>
                <input
                  id="total-budget-input"
                  type="number"
                  placeholder="Budget Amt"
                  value={editingTotalVal}
                  onChange={e => setEditingTotalVal(e.target.value)}
                  className="w-full text-xs pl-6 pr-2 py-2 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:border-blue-600 font-semibold"
                />
              </div>
              <button
                id="save-total-budget-btn"
                type="submit"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-extrabold text-slate-900 font-sans">
                {currencySymbol}
                {currentTrip.budget.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentTrip.baseCurrency} Base
              </span>
            </div>
          )}

          {/* Budget fill tracker bar */}
          <div className="space-y-1.5 mt-5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Expenses Spent ({overallPercent}%)</span>
              <span className={overallPercent > 100 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                {currencySymbol}
                {totalSpent.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallPercent > 100
                    ? 'bg-red-500'
                    : overallPercent > 80
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(overallPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0%</span>
              <span>100% Target Limit</span>
            </div>
          </div>
        </div>

        {/* Dynamic Budget Alert Box */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          {overallPercent > 100 ? (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Over Budget!</strong> You have exceeded the total allocated trip budget by{' '}
                {currencySymbol}
                {(totalSpent - currentTrip.budget).toLocaleString()}.
              </div>
            </div>
          ) : overallPercent > 80 ? (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Nearing Budget Limit!</strong> Trip is at {overallPercent}% of its total
                budget limit. Think about saving.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex gap-2 text-xs text-blue-800">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <strong>Budget Status safe!</strong> {currencySymbol}
                {(currentTrip.budget - totalSpent).toLocaleString()} remaining to spend before limit is hit.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Middle and Right Box: Category Limits with editor */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 lg:col-span-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans mb-4">
          Limit allocations per category
        </h4>

        {/* Warnings list */}
        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`py-2 px-3 rounded-lg flex items-center justify-between text-[11px] font-medium border ${
                  alert.isExceeded
                    ? 'bg-red-50 text-red-800 border-red-100'
                    : 'bg-amber-50 text-amber-800 border-amber-100'
                }`}
              >
                <div className="flex items-center gap-1.5 leading-snug">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      alert.isExceeded ? 'text-red-500' : 'text-amber-500'
                    }`}
                  />
                  <span>
                    <strong>{alert.categoryName} Alert: </strong>
                    {alert.isExceeded ? (
                      <>Exceeded by {currencySymbol}{alert.difference.toLocaleString()}</>
                    ) : (
                      <>Nearing limit ({alert.percent}% filled)</>
                    )}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {currencySymbol}
                  {alert.total.toLocaleString()} / {currencySymbol}
                  {alert.limit.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Interactive limits list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-80 overflow-y-auto pr-1">
          {CATEGORIES.map(cat => {
            const budgetSetting = currentTrip.categoryBudgets.find(b => b.category === cat.key);
            const limit = budgetSetting ? budgetSetting.limit : 0;
            const spentData = categorySpent.find(s => s.category === cat.key);
            const total = spentData ? spentData.total : 0;
            const percent = limit > 0 ? Math.min(Math.round((total / limit) * 100), 150) : 0;

            const isEditing = activeEditingCat === cat.key;
            const tempVal = editingCategories[cat.key] !== undefined ? editingCategories[cat.key] : limit.toString();

            return (
              <div
                key={cat.key}
                className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1 z-10">
                      <div className="relative">
                        <span className="absolute left-1.5 top-1 font-bold text-[9px] text-slate-400">
                          {currencySymbol}
                        </span>
                        <input
                          id={`cat-input-${cat.key}`}
                          type="number"
                          placeholder="Limit"
                          value={tempVal}
                          onChange={e =>
                            setEditingCategories({ ...editingCategories, [cat.key]: e.target.value })
                          }
                          className="w-16 text-[10px] pl-4 pr-1 py-0.5 border border-slate-200 rounded outline-none bg-slate-50 font-semibold"
                        />
                      </div>
                      <button
                        id={`save-cat-${cat.key}`}
                        onClick={() => handleCategoryLimitSubmit(cat.key)}
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`edit-cat-btn-${cat.key}`}
                      onClick={() => {
                        setEditingCategories({ ...editingCategories, [cat.key]: limit.toString() });
                        setActiveEditingCat(cat.key);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                      title="Set limit"
                    >
                      <Pen className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-slate-500 font-mono text-[10px]">
                    Spent: {currencySymbol}
                    {total.toLocaleString()}
                  </span>
                  <span className="font-bold text-slate-700 text-[10px]">
                    Limit: {limit > 0 ? `${currencySymbol}${limit.toLocaleString()}` : 'None'}
                  </span>
                </div>

                {limit > 0 ? (
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          total > limit
                            ? 'bg-red-500'
                            : total > limit * 0.8
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] block text-right text-slate-400 font-mono">
                      {percent}% allocated
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-400 italic block">No limit restriction</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
