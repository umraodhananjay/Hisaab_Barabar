/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Layers,
  Users,
  AlertCircle,
  Coins,
  CheckCircle,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import { Friend, Trip, Expense, SplitType } from '../types';
import { CATEGORIES, EXCHANGE_RATES, convertCurrency, getCurrencySymbol } from '../data';

interface ExpenseFormProps {
  currentTrip: Trip;
  initExpense?: Expense | null; // Pass down for editing
  onSubmit: (expense: Omit<Expense, 'id' | 'convertedAmount' | 'exchangeRate'>) => void;
  onCancel: () => void;
}

export default function ExpenseForm({
  currentTrip,
  initExpense,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amountVal, setAmountVal] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('dining');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerId, setPayerId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');

  // Multi-friend detailed weights/percentages/ratios/exact bounds
  const [splitChecked, setSplitChecked] = useState<Record<string, boolean>>({});
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  const [validationError, setValidationError] = useState('');

  // Dynamic automatic calculation of converted amounts in base currency
  const [convertedPreview, setConvertedPreview] = useState(0);
  const [ratePreview, setRatePreview] = useState(1);

  // Synchronize on load and when editing
  useEffect(() => {
    // Check if trip base currency exists and set default currency
    if (currentTrip) {
      setCurrency(currentTrip.baseCurrency);
      if (currentTrip.friends.length > 0) {
        setPayerId(currentTrip.friends[0].id); // Default to first person (e.g. Dhananjay)
      }

      // Initialize all friend checkboxes as TRUE by default for splits
      const initialChecked: Record<string, boolean> = {};
      const initialValues: Record<string, string> = {};
      currentTrip.friends.forEach(f => {
        initialChecked[f.id] = true;
        initialValues[f.id] = '';
      });
      setSplitChecked(initialChecked);
      setSplitValues(initialValues);
    }

    if (initExpense) {
      setDescription(initExpense.description);
      setAmountVal(initExpense.amount.toString());
      setCurrency(initExpense.currency);
      setCategory(initExpense.category);
      setDate(initExpense.date);
      setPayerId(initExpense.payerId);
      setSplitType(initExpense.splitType);

      const edChecked: Record<string, boolean> = {};
      const edValues: Record<string, string> = {};
      currentTrip.friends.forEach(f => {
        const val = initExpense.splitDetails[f.id];
        // If splitDetails has a value for this friend (> 0 or exists)
        if (val !== undefined && val > 0) {
          edChecked[f.id] = true;
          edValues[f.id] = val.toString();
        } else {
          edChecked[f.id] = false;
          edValues[f.id] = '';
        }
      });
      setSplitChecked(edChecked);
      setSplitValues(edValues);
    }
  }, [initExpense, currentTrip]);

  // Recalculate converted price instantly as user type
  useEffect(() => {
    const amt = parseFloat(amountVal);
    if (!isNaN(amt) && amt > 0) {
      const res = convertCurrency(amt, currency, currentTrip.baseCurrency);
      setConvertedPreview(res.convertedAmount);
      setRatePreview(res.rate);
    } else {
      setConvertedPreview(0);
      setRatePreview(1);
    }
  }, [amountVal, currency, currentTrip.baseCurrency]);

  const toggleChecked = (friendId: string) => {
    setSplitChecked({ ...splitChecked, [friendId]: !splitChecked[friendId] });
  };

  const handleValChange = (friendId: string, val: string) => {
    setSplitValues({ ...splitValues, [friendId]: val });
  };

  const handleHeaderSplitTypeChange = (type: SplitType) => {
    setSplitType(type);
    setValidationError('');

    // Pre-load sensible input placeholders inside detailed split grid
    const cleanVals: Record<string, string> = {};
    const tripFriendIds = currentTrip.friends.map(f => f.id);

    if (type === 'percentage') {
      const activeCount = Object.keys(splitChecked).filter(id => splitChecked[id]).length;
      const individualPct = activeCount > 0 ? Math.floor(100 / activeCount) : 0;
      tripFriendIds.forEach(id => {
        cleanVals[id] = splitChecked[id] ? individualPct.toString() : '';
      });
    } else if (type === 'shares') {
      tripFriendIds.forEach(id => {
        cleanVals[id] = splitChecked[id] ? "1" : '';
      });
    } else if (type === 'exact') {
      const activeCount = Object.keys(splitChecked).filter(id => splitChecked[id]).length;
      const individualExact = activeCount > 0 ? (convertedPreview / activeCount) : 0;
      tripFriendIds.forEach(id => {
        cleanVals[id] = splitChecked[id] ? individualExact.toFixed(2) : '';
      });
    } else {
      tripFriendIds.forEach(id => {
        cleanVals[id] = '';
      });
    }
    setSplitValues(cleanVals);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const parsedAmount = parseFloat(amountVal);
    if (!description.trim()) {
      setValidationError('Description is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Amount must be a positive number');
      return;
    }

    // Identify participants in split
    const activeFriendIds = currentTrip.friends
      .map(f => f.id)
      .filter(id => splitChecked[id]);

    if (activeFriendIds.length === 0) {
      setValidationError('Please select at least one friend to split cost with');
      return;
    }

    // Build the splitDetails map
    const finalSplitDetails: Record<string, number> = {};
    // Ensure all friends have a slot (set 0 if not checked)
    currentTrip.friends.forEach(f => {
      finalSplitDetails[f.id] = 0;
    });

    if (splitType === 'equal') {
      // Split evenly among checked participants. If a participant is checked, their weight is 1
      activeFriendIds.forEach(id => {
        finalSplitDetails[id] = 1;
      });
    } else if (splitType === 'percentage') {
      // Validate percentages sum to 100%
      let totalPct = 0;
      for (const id of activeFriendIds) {
        const val = parseFloat(splitValues[id]);
        if (isNaN(val) || val < 0) {
          setValidationError(`Please enter a valid split percentage for all selected participants`);
          return;
        }
        finalSplitDetails[id] = val;
        totalPct += val;
      }

      // Check sum constraint
      if (Math.abs(totalPct - 100) > 0.1) {
        setValidationError(`Percentages split must sum to exactly 100%. Currently: ${totalPct}%`);
        return;
      }
    } else if (splitType === 'exact') {
      // Validate exact amounts sum to total converted amount in base currency
      let totalExact = 0;
      for (const id of activeFriendIds) {
        const val = parseFloat(splitValues[id]);
        if (isNaN(val) || val < 0) {
          setValidationError(`Please enter a valid amount inside exact splits`);
          return;
        }
        finalSplitDetails[id] = val;
        totalExact += val;
      }

      // Check amount matching sum
      const diff = Math.abs(totalExact - convertedPreview);
      if (diff > 0.05) {
        setValidationError(
          `Individual amounts sum to ${totalExact.toFixed(2)} ${
            currentTrip.baseCurrency
          } instead of target converted amount ${convertedPreview.toFixed(2)} ${
            currentTrip.baseCurrency
          }`
        );
        return;
      }
    } else if (splitType === 'shares') {
      // Validate share ratios
      for (const id of activeFriendIds) {
        const val = parseInt(splitValues[id], 10);
        if (isNaN(val) || val <= 0) {
          setValidationError(`Shares ratio weight must be positive Integers`);
          return;
        }
        finalSplitDetails[id] = val;
      }
    }

    // Call submit
    onSubmit({
      tripId: currentTrip.id,
      description: description.trim(),
      amount: parsedAmount,
      currency,
      category,
      date,
      payerId,
      splitType,
      splitDetails: finalSplitDetails,
    });
  };

  const tripCurrencySymbol = getCurrencySymbol(currentTrip.baseCurrency);
  const origCurrencySymbol = getCurrencySymbol(currency);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 md:p-6">
      <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
        <Coins className="w-4 h-4 text-blue-600" />
        {initExpense ? 'Edit Expense details' : 'Record Trip Expense'}
      </h3>

      <form onSubmit={handleSubmitExpense} className="space-y-4">
        {/* Row 1: Description & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Item Description
            </label>
            <input
              id="expense-desc-input"
              type="text"
              placeholder="e.g. Sushi Dinner, Subway Ticket, Hotel Stay"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Category Group
            </label>
            <select
              id="expense-category-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50/50 focus:border-blue-600"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Amount, Original Currency, Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-xs text-slate-400 font-semibold font-mono">
                {origCurrencySymbol}
              </span>
              <input
                id="expense-amount-input"
                type="number"
                step="any"
                placeholder="0.00"
                value={amountVal}
                onChange={e => setAmountVal(e.target.value)}
                className="w-full text-xs pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 bg-slate-50/50 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Original Currency</label>
            <select
              id="expense-currency-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50/50 focus:border-blue-600 outline-none"
            >
              {EXCHANGE_RATES.map(rate => (
                <option key={rate.code} value={rate.code}>
                  {rate.code} - {rate.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Transaction Date</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                id="expense-date-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-lg outline-none bg-slate-50/50 focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Conversions preview row if original currency is different from base */}
        {currency !== currentTrip.baseCurrency && conversionsPreviewActive() && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between text-xs text-blue-800">
            <div className="flex items-center gap-1.5 font-mono">
              <Calculator className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>
                Foreign Currency Conversion: {origCurrencySymbol}
                {(parseFloat(amountVal) || 0).toLocaleString()} {currency} converts to{' '}
                <strong>
                  {tripCurrencySymbol}
                  {convertedPreview.toLocaleString()} {currentTrip.baseCurrency}
                </strong>
              </span>
            </div>
            <span className="text-[10px] font-bold font-mono">
              Rate: 1 {currency} = {ratePreview.toFixed(4)} {currentTrip.baseCurrency}
            </span>
          </div>
        )}

        {/* Row 3: Paid by whom? */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Who Paid?</label>
          <div className="flex gap-2 flex-wrap">
            {currentTrip.friends.map(friend => {
              const selected = payerId === friend.id;
              const initials = friend.name
                .split(' ')
                .slice(0, 2)
                .map(n => n[0])
                .join('')
                .toUpperCase();

              return (
                <button
                  id={`payer-${friend.id}`}
                  key={friend.id}
                  type="button"
                  onClick={() => setPayerId(friend.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                    selected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white`}
                    style={{ backgroundColor: selected ? 'rgba(255,255,255,0.2)' : friend.color }}
                  >
                    {initials}
                  </div>
                  <span>{friend.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4: Splits & weight calculations grids */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Splitting Configuration
            </label>

            {/* Split selectors tabs */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 text-[10px] font-bold font-sans">
              {(['equal', 'percentage', 'shares', 'exact'] as SplitType[]).map(type => (
                <button
                  id={`split-tab-${type}`}
                  key={type}
                  type="button"
                  onClick={() => handleHeaderSplitTypeChange(type)}
                  className={`px-3 py-1.5 border-r last:border-r-0 border-slate-200 transition cursor-pointer font-semibold uppercase ${
                    splitType === type
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Staggered selector items list of friends in the split details */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {currentTrip.friends.map(friend => {
              const checked = splitChecked[friend.id] === true;
              const value = splitValues[friend.id] || '';
              const initials = friend.name
                .split(' ')
                .slice(0, 2)
                .map(n => n[0])
                .join('')
                .toUpperCase();

              // Calculate individual split preview inline to help user
              let previewText = '';
              const amt = convertedPreview || 0;
              if (checked && amt > 0) {
                if (splitType === 'equal') {
                  const checkCount = Object.keys(splitChecked).filter(id => splitChecked[id]).length;
                  previewText = `${tripCurrencySymbol}${(amt / Math.max(1, checkCount)).toFixed(2)}`;
                } else if (splitType === 'percentage') {
                  const pct = parseFloat(value) || 0;
                  previewText = `${tripCurrencySymbol}${((amt * pct) / 100).toFixed(2)}`;
                } else if (splitType === 'shares') {
                  const sh = parseInt(value, 10) || 0;
                  const totalShares = Object.keys(splitValues)
                    .filter(id => splitChecked[id])
                    .reduce((sum, id) => sum + (parseInt(splitValues[id], 10) || 0), 0);
                  previewText = totalShares > 0 ? `${tripCurrencySymbol}${((amt * sh) / totalShares).toFixed(2)}` : `${tripCurrencySymbol}0.00`;
                } else if (splitType === 'exact') {
                  const num = parseFloat(value) || 0;
                  // values entered are in trip base currency
                  previewText = `${tripCurrencySymbol}${num.toFixed(2)}`;
                }
              }

              return (
                <div
                  key={friend.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                    checked
                      ? 'bg-indigo-50/30 border-indigo-100 hover:border-indigo-200'
                      : 'bg-slate-50/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      id={`split-check-${friend.id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecked(friend.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 h-3.5 w-3.5 cursor-pointer"
                    />
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                      style={{ backgroundColor: friend.color }}
                    >
                      {initials}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 font-sans">
                      {friend.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Inline Split Preview indicator */}
                    {checked && previewText && (
                      <span className="text-[10px] font-bold text-indigo-700 font-mono">
                        Share: {previewText}
                      </span>
                    )}

                    {/* Show weight bounds if type is not equal */}
                    {checked && splitType !== 'equal' && (
                      <div className="relative">
                        <input
                          id={`split-val-input-${friend.id}`}
                          type="number"
                          step="any"
                          placeholder={
                            splitType === 'percentage'
                              ? '%'
                              : splitType === 'shares'
                                ? 'Shares'
                                : tripCurrencySymbol
                          }
                          value={value}
                          onChange={e => handleValChange(friend.id, e.target.value)}
                          className="w-20 text-right text-xs px-2 py-1 border border-slate-200 rounded outline-none bg-white font-semibold focus:border-indigo-600"
                        />
                        <span className="absolute right-1 text-[9px] text-slate-400 font-bold pointer-events-none">
                          {splitType === 'percentage' ? '%' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Errors panel */}
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>{validationError}</div>
          </div>
        )}

        {/* Buttons submission panel */}
        <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 text-xs font-bold font-sans">
          <button
            id="cancel-expense-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition font-semibold"
          >
            Cancel
          </button>
          <button
            id="submit-expense-btn"
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg cursor-pointer transition flex items-center gap-1.5 font-semibold shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {initExpense ? 'Update Split Record' : 'Record Split Splitwise'}
          </button>
        </div>
      </form>
    </div>
  );

  function conversionsPreviewActive() {
    const parsed = parseFloat(amountVal);
    return !isNaN(parsed) && parsed > 0;
  }
}
