/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Plus,
  Users,
  TrendingUp,
  FileDown,
  ChevronRight,
  Sparkles,
  FolderPlus,
  Coins,
  Globe,
  WifiOff,
  Check,
  Briefcase,
  Calendar,
  AlertTriangle,
  ArrowRight,
  X,
  PlusCircle,
  PiggyBank,
} from 'lucide-react';

import { Friend, Trip, Expense, TripNotification, SplitType } from './types';
import {
  INITIAL_TRIPS,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  FRIENDS_RANDOM_EXPENSES,
  convertCurrency,
  getCurrencySymbol,
  EXCHANGE_RATES,
} from './data';

import TripDashboard from './components/TripDashboard';
import ExpenseForm from './components/ExpenseForm';
import FriendManager from './components/FriendManager';
import BudgetSummary from './components/BudgetSummary';
import NotificationCenter from './components/NotificationCenter';

import { generateTripReportPDF } from './utils/pdfGenerator';
import { calculateBalances } from './utils/expenseCalculator';

export default function App() {
  // --- Persistent Local Storage Core State Engine ---
  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('splitter_trips');
    return saved ? JSON.parse(saved) : INITIAL_TRIPS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('splitter_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [notifications, setNotifications] = useState<TripNotification[]>(() => {
    const saved = localStorage.getItem('splitter_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [activeTripId, setActiveTripId] = useState<string>(() => {
    const savedActive = localStorage.getItem('splitter_active_trip_id');
    return savedActive || 'tokyo-2026';
  });

  const [isOffline, setIsOffline] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'friends' | 'budgets'>('dashboard');

  // Popup panel flags
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [selectedEditExpense, setSelectedEditExpense] = useState<Expense | null>(null);

  // New Trip setup fields
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripBudget, setNewTripBudget] = useState('2500');
  const [newTripCurrency, setNewTripCurrency] = useState('USD');
  const [newTripStart, setNewTripStart] = useState('2026-06-01');
  const [newTripEnd, setNewTripEnd] = useState('2026-06-10');

  // Toast flyouts for simulated active connection pushes
  const [toast, setToast] = useState<{ id: string; title: string; message: string } | null>(null);

  // Synchronize state changes with localStorage
  useEffect(() => {
    localStorage.setItem('splitter_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('splitter_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('splitter_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('splitter_active_trip_id', activeTripId);
  }, [activeTripId]);

  // Active Trip Object computed
  const currentTrip = trips.find(t => t.id === activeTripId) || trips[0] || INITIAL_TRIPS[0];

  // --- Real-time Activity Simulation Engine ---
  useEffect(() => {
    if (!simulating || isOffline) return;

    // Trigger an action from a friend every 24 seconds
    const interval = setInterval(() => {
      // Find a friend on the current trip who is NOT the primary user (id === '1')
      const targetFriends = currentTrip.friends.filter(f => f.id !== '1');
      if (targetFriends.length === 0) return;

      const randomFriend = targetFriends[Math.floor(Math.random() * targetFriends.length)];
      const randomBaseAction =
        FRIENDS_RANDOM_EXPENSES[Math.floor(Math.random() * FRIENDS_RANDOM_EXPENSES.length)];

      // Construct a realistic action
      const origAmt = randomBaseAction.amount;
      const origCur = randomBaseAction.currency;

      // Convert
      const conv = convertCurrency(origAmt, origCur, currentTrip.baseCurrency);

      const newExpenseId = `exp-sim-${Date.now()}`;

      // Build Equal Split Record Details
      const splitDetails: Record<string, number> = {};
      currentTrip.friends.forEach(f => {
        splitDetails[f.id] = 1; // equal split
      });

      const newExpense: Expense = {
        id: newExpenseId,
        tripId: currentTrip.id,
        description: randomBaseAction.description,
        amount: origAmt,
        currency: origCur,
        convertedAmount: conv.convertedAmount,
        exchangeRate: conv.rate,
        category: randomBaseAction.category,
        date: new Date().toISOString().split('T')[0],
        payerId: randomFriend.id,
        splitType: 'equal',
        splitDetails,
      };

      // Add to Ledger
      setExpenses(prev => [...prev, newExpense]);

      // Trigger flyout Notification and Alert Log
      const cleanAmtFormatted = `${getCurrencySymbol(origCur)}${origAmt} ${origCur}`;
      const baseAmtFormatted = `${getCurrencySymbol(currentTrip.baseCurrency)}${conv.convertedAmount} ${
        currentTrip.baseCurrency
      }`;

      const notifTitle = `New Split added by ${randomFriend.name}`;
      const notifMsg = `${randomFriend.name} paid for "${newExpense.description}" (${cleanAmtFormatted} / ${baseAmtFormatted}). Split equally.`;

      const newNotif: TripNotification = {
        id: `notif-sim-${Date.now()}`,
        tripId: currentTrip.id,
        title: notifTitle,
        message: notifMsg,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'expense_added',
      };

      setNotifications(prev => [newNotif, ...prev]);

      // Pop active dynamic in-app Toast alert
      setToast({
        id: `toast-${Date.now()}`,
        title: notifTitle,
        message: notifMsg,
      });

      // Automatically check category limits and raise warnings
      setTimeout(() => {
        const afterExpenses = [...expenses, newExpense];
        const { categorySpent } = calculateBalances(currentTrip, afterExpenses);
        const catSpentObj = categorySpent.find(c => c.category === newExpense.category);

        if (catSpentObj && catSpentObj.limit > 0 && catSpentObj.total >= catSpentObj.limit) {
          const limitMsg = `${
            newExpense.category.charAt(0).toUpperCase() + newExpense.category.slice(1)
          } budget exceeded! Spending is ${getCurrencySymbol(currentTrip.baseCurrency)}${
            catSpentObj.total
          } / limit ${getCurrencySymbol(currentTrip.baseCurrency)}${catSpentObj.limit}`;

          const limitNotif: TripNotification = {
            id: `notif-limit-${Date.now()}`,
            tripId: currentTrip.id,
            title: `Exceeded Category Budget Alert!`,
            message: limitMsg,
            timestamp: new Date().toISOString(),
            isRead: false,
            type: 'budget_warning',
          };
          setNotifications(prev => [limitNotif, ...prev]);
        }
      }, 100);
    }, 24000);

    return () => clearInterval(interval);
  }, [simulating, isOffline, currentTrip, expenses]);

  // Handle toast timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Handlers ---
  const handleToggleOffline = () => {
    const nextOffline = !isOffline;
    setIsOffline(nextOffline);

    // Prompt user with a notice
    const message = nextOffline
      ? 'Access locked locally! All updates cached offline until connection is toggled.'
      : 'Synced to Travel Cloud! Fetched latest companion ledger entries.';

    const newNotif: TripNotification = {
      id: `notif-state-${Date.now()}`,
      tripId: currentTrip.id,
      title: nextOffline ? 'Offline Mode Activated ✈️' : 'Sync Resolved Online 🌐',
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: nextOffline ? 'offline_sync' : 'offline_sync',
    };

    setNotifications(prev => [newNotif, ...prev]);
    setToast({
      id: `toast-${Date.now()}`,
      title: nextOffline ? 'Offline Mode Active' : 'Synced Online',
      message,
    });
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim() || !newTripDestination.trim()) return;

    const newId = `trip-${Date.now()}`;
    const budgetNum = parseFloat(newTripBudget) || 2000;

    const newTripObj: Trip = {
      id: newId,
      name: newTripName.trim(),
      destination: newTripDestination.trim(),
      startDate: newTripStart,
      endDate: newTripEnd,
      budget: budgetNum,
      baseCurrency: newTripCurrency,
      friends: [
        { id: '1', name: 'Dhananjay (You)', email: 'umraodhananjay@gmail.com', color: '#3B82F6' },
      ], // starts with yourself, can add companions
      categoryBudgets: [
        { category: 'dining', limit: Math.round(budgetNum * 0.25) },
        { category: 'accommodation', limit: Math.round(budgetNum * 0.4) },
      ],
    };

    setTrips(prev => [...prev, newTripObj]);
    setActiveTripId(newId);
    setIsAddingTrip(false);

    // Reset Form Fields
    setNewTripName('');
    setNewTripDestination('');
    setNewTripBudget('2500');

    // Notification logs
    const newNotif: TripNotification = {
      id: `notif-trip-${Date.now()}`,
      tripId: newId,
      title: 'New Trip Registered!',
      message: `Started planning for ${newTripObj.name} in ${newTripObj.destination}. Invite friends to divide cost!`,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'settlement',
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAddExpenseSubmit = (formObj: Omit<Expense, 'id' | 'convertedAmount' | 'exchangeRate'>) => {
    // Perform Currency conversions
    const conversion = convertCurrency(formObj.amount, formObj.currency, currentTrip.baseCurrency);

    if (selectedEditExpense) {
      // Editing Mode
      const updatedExpenses = expenses.map(e => {
        if (e.id === selectedEditExpense.id) {
          return {
            ...e,
            ...formObj,
            convertedAmount: conversion.convertedAmount,
            exchangeRate: conversion.rate,
          };
        }
        return e;
      });
      setExpenses(updatedExpenses);

      const notifMsg = `Expense "${formObj.description}" updated to ${getCurrencySymbol(formObj.currency)}${
        formObj.amount
      }. Ledger re-adjusted.`;
      const editNotif: TripNotification = {
        id: `notif-edit-${Date.now()}`,
        tripId: currentTrip.id,
        title: 'Expense Split Modified',
        message: notifMsg,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'expense_added',
      };
      setNotifications(prev => [editNotif, ...prev]);
    } else {
      // Adding Mode
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        ...formObj,
        convertedAmount: conversion.convertedAmount,
        exchangeRate: conversion.rate,
      };
      setExpenses(prev => [...prev, newExp]);

      const originalFormatted = `${getCurrencySymbol(formObj.currency)}${formObj.amount} ${formObj.currency}`;
      const baseFormatted = `${getCurrencySymbol(currentTrip.baseCurrency)}${conversion.convertedAmount} ${
        currentTrip.baseCurrency
      }`;

      const payerObj = currentTrip.friends.find(f => f.id === formObj.payerId);
      const payerName = payerObj ? payerObj.name : 'Participant';

      const notifMsg = `${payerName} recorded "${formObj.description}" (${originalFormatted} / ~${baseFormatted}). Split details registered offline.`;
      const addNotif: TripNotification = {
        id: `notif-add-${Date.now()}`,
        tripId: currentTrip.id,
        title: 'Recorded New Bill Split',
        message: notifMsg,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'expense_added',
      };
      setNotifications(prev => [addNotif, ...prev]);

      // Quick Alerting check
      setTimeout(() => {
        const afterExpenses = [...expenses, newExp];
        const { categorySpent } = calculateBalances(currentTrip, afterExpenses);
        const catSpentObj = categorySpent.find(c => c.category === formObj.category);

        if (catSpentObj && catSpentObj.limit > 0 && catSpentObj.total >= catSpentObj.limit) {
          const limitMsg = `${
            formObj.category.charAt(0).toUpperCase() + formObj.category.slice(1)
          } budget has exceeded set limit! Currently spent: ${getCurrencySymbol(
            currentTrip.baseCurrency
          )}${catSpentObj.total} / ${getCurrencySymbol(currentTrip.baseCurrency)}${catSpentObj.limit}`;

          const limitNotif: TripNotification = {
            id: `notif-warn-${Date.now()}`,
            tripId: currentTrip.id,
            title: `Exceeded Category Budget Warn!`,
            message: limitMsg,
            timestamp: new Date().toISOString(),
            isRead: false,
            type: 'budget_warning',
          };
          setNotifications(prev => [limitNotif, ...prev]);
        }
      }, 100);
    }

    setIsAddingExpense(false);
    setSelectedEditExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;

    setExpenses(prev => prev.filter(e => e.id !== id));

    const removeNotif: TripNotification = {
      id: `notif-delete-${Date.now()}`,
      tripId: currentTrip.id,
      title: 'Expense Deleted',
      message: `Removed expense SPLIT for "${target.description}" (${getCurrencySymbol(target.currency)}${
        target.amount
      }). Balances re-adjusted.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'expense_added',
    };
    setNotifications(prev => [removeNotif, ...prev]);
  };

  const handleAddFriend = (friend: Friend) => {
    // Add friend to active trip friends list
    const updatedTrips = trips.map(t => {
      if (t.id === currentTrip.id) {
        return {
          ...t,
          friends: [...t.friends, friend],
        };
      }
      return t;
    });
    setTrips(updatedTrips);

    const matchNotif: TripNotification = {
      id: `notif-friend-${Date.now()}`,
      tripId: currentTrip.id,
      title: 'Participant Joined Trip',
      message: `Welcome ${friend.name}! They joined the Cherry Blossom split calculations database.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'settlement',
    };
    setNotifications(prev => [matchNotif, ...prev]);
  };

  const handleSettleDebt = (debt: { fromId: string; toId: string; amount: number }) => {
    // To settle. e.g. Sarah pays Dhananjay $120.00:
    // Create an expense with exact split: Sarah pays, split exact to Dhananjay:
    // Payer ID = debt.fromId (Sarah)
    // Converted Amount = debt.amount, original amount = debt.amount, currency = baseCurrency
    // Split details: { debt.toId: debt.amount }
    const splitDetails: Record<string, number> = {};
    currentTrip.friends.forEach(f => {
      splitDetails[f.id] = f.id === debt.toId ? debt.amount : 0;
    });

    const settlementExpense: Expense = {
      id: `exp-settle-${Date.now()}`,
      tripId: currentTrip.id,
      description: `Settled Balance: ${debt.fromName} paid ${debt.toName}`,
      amount: debt.amount,
      currency: currentTrip.baseCurrency,
      convertedAmount: debt.amount,
      exchangeRate: 1.0,
      category: 'others',
      date: new Date().toISOString().split('T')[0],
      payerId: debt.fromId, // debtor pays out of pocket
      splitType: 'exact',
      splitDetails,
    };

    setExpenses(prev => [...prev, settlementExpense]);

    const settleNotif: TripNotification = {
      id: `notif-settle-${Date.now()}`,
      tripId: currentTrip.id,
      title: 'Debt Settled Up!',
      message: `${debt.fromName} completed transaction to ${debt.toName} for ${getCurrencySymbol(
        currentTrip.baseCurrency
      )}${debt.amount.toLocaleString()}. Balance resolved.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'settlement',
    };
    setNotifications(prev => [settleNotif, ...prev]);

    setToast({
      id: `toast-${Date.now()}`,
      title: 'Transferred Settlement 💸',
      message: `${debt.fromName} has fully paid ${debt.toName} ${getCurrencySymbol(
        currentTrip.baseCurrency
      )}${debt.amount.toLocaleString()}`,
    });
  };

  const handleUpdateCategoryBudgets = (categoryBudgets: { category: string; limit: number }[]) => {
    const updatedTrips = trips.map(t => {
      if (t.id === currentTrip.id) {
        return {
          ...t,
          categoryBudgets,
        };
      }
      return t;
    });
    setTrips(updatedTrips);
  };

  const handleUpdateTotalBudget = (amount: number) => {
    const updatedTrips = trips.map(t => {
      if (t.id === currentTrip.id) {
        return {
          ...t,
          budget: amount,
        };
      }
      return t;
    });
    setTrips(updatedTrips);
  };

  const handleExportPDF = () => {
    generateTripReportPDF(currentTrip, expenses);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.filter(n => n.tripId !== currentTrip.id));
  };

  // Stats aggregate
  const { totalSpent: tripTotalSpent } = calculateBalances(currentTrip, expenses);
  const percentComplete = Math.min((tripTotalSpent / currentTrip.budget) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* 1. Header Bar Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-wider uppercase font-sans flex items-center gap-1.5">
              SettleTrip 🌍
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              International Expense & Settle Router
            </p>
          </div>
        </div>

        {/* Center: Trip Selector Panel */}
        <div className="flex items-center gap-2 max-w-full">
          <div className="relative">
            <select
              id="active-trip-selector"
              value={activeTripId}
              onChange={e => {
                setActiveTripId(e.target.value);
                setActiveTab('dashboard');
              }}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 px-3.5 py-2 rounded-xl outline-none focus:border-blue-600 pr-8 cursor-pointer"
            >
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} ({trip.destination})
                </option>
              ))}
            </select>
            <Compass className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          <button
            id="open-add-trip-btn"
            onClick={() => setIsAddingTrip(true)}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center justify-center text-slate-700"
            title="Create New Trip Layout"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Right side: Realtime Notifications and Simulation switches */}
        <div className="flex items-center gap-2">
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={markNotificationRead}
            onClearAll={clearAllNotifications}
            currentTrip={currentTrip}
            simulating={simulating}
            onToggleSimulation={setSimulating}
            isOffline={isOffline}
            onToggleOffline={handleToggleOffline}
          />
        </div>
      </header>

      {/* Main Body container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
        {/* Connection Notice / Offline Banner */}
        {isOffline && (
          <div className="p-3 bg-amber-500 text-white rounded-xl flex items-center justify-between text-xs font-semibold shadow-md animate-pulse">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                <strong>Travelling Abroad Offline Mode Locked:</strong> Budget tracking data is fully cached in local storage. All splits operate without data connections.
              </span>
            </div>
            <button
              id="reconnect-cloud-btn"
              onClick={handleToggleOffline}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 text-white border border-white/20 rounded-lg text-[10px] transition font-bold"
            >
              Reconnect Online
            </button>
          </div>
        )}

        {/* Global Floating Toast Alert banner */}
        <AnimatePresence>
          {toast && (
            <motion.div
              id="live-alert-toast"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl max-w-sm flex items-start gap-3"
            >
              <div className="p-1 px-1.5 bg-blue-600 rounded-lg shrink-0 text-white text-[10px] uppercase font-bold tracking-wider mt-0.5">
                Live
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold leading-none mb-1 text-blue-300">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white p-0.5 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Trip Create Form Overlay Modal */}
        {isAddingTrip && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <motion.div
              id="add-trip-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full relative"
            >
              <button
                onClick={() => setIsAddingTrip(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                Initialize New Settle Trip
              </h3>

              <form onSubmit={handleCreateTrip} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Trip Name</label>
                  <input
                    id="new-trip-name-input"
                    type="text"
                    required
                    placeholder="e.g. Euro Backpack Tour, Goa 2026"
                    value={newTripName}
                    onChange={e => setNewTripName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Destination</label>
                  <input
                    id="new-trip-dest-input"
                    type="text"
                    required
                    placeholder="Country / Cities"
                    value={newTripDestination}
                    onChange={e => setNewTripDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Total Budget</label>
                    <input
                      id="new-trip-budget-input"
                      type="number"
                      required
                      placeholder="e.g. 3000"
                      value={newTripBudget}
                      onChange={e => setNewTripBudget(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Base Currency</label>
                    <select
                      id="new-trip-currency-select"
                      value={newTripCurrency}
                      onChange={e => setNewTripCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:border-blue-600"
                    >
                      {EXCHANGE_RATES.map(rate => (
                        <option key={rate.code} value={rate.code}>
                          {rate.code} ({rate.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Start Date</label>
                    <input
                      id="new-trip-start-input"
                      type="date"
                      value={newTripStart}
                      onChange={e => setNewTripStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
                    <input
                      id="new-trip-end-input"
                      type="date"
                      value={newTripEnd}
                      onChange={e => setNewTripEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-blue-600"
                    />
                  </div>
                </div>

                <button
                  id="confirm-create-trip-btn"
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer font-bold mt-4 shrink-0 shadow-md text-xs uppercase tracking-wider"
                >
                  Create and Setup Options
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Active Trip Header Details */}
        <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Subtle background graphics */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-400 capitalize mb-2">
              Active Settle Ledger
            </span>
            <h2 className="text-2xl font-black text-white font-sans tracking-tight">
              {currentTrip.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-300 mt-2 font-medium">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                {currentTrip.destination}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentTrip.startDate} to {currentTrip.endDate}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/5 font-mono text-[10px] text-blue-300 font-bold">
                Currency: {currentTrip.baseCurrency}
              </span>
            </div>
          </div>

          {/* Action buttons (Add Bill & Export Report) */}
          <div className="flex gap-2.5 flex-wrap relative font-bold text-xs font-sans">
            <button
              id="open-add-expense-btn"
              onClick={() => {
                setSelectedEditExpense(null);
                setIsAddingExpense(true);
              }}
              className="px-4.5 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5 transition font-extrabold"
            >
              <Plus className="w-4 h-4" />
              Settle Expense 💸
            </button>

            <button
              id="export-pdf-report-btn"
              onClick={handleExportPDF}
              className="px-4.5 py-3 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 shadow-md flex items-center gap-1.5 transition cursor-pointer font-semibold"
            >
              <FileDown className="w-4 h-4" />
              Export PDF Invoice
            </button>
          </div>
        </section>

        {/* Tab Selection */}
        <nav className="flex border-b border-slate-200">
          {(
            [
              { key: 'dashboard', name: 'Dashboard View', icon: TrendingUp },
              { key: 'friends', name: 'Splits & Companions', icon: Users },
              { key: 'budgets', name: 'Limits & Budgeting', icon: PiggyBank },
            ] as const
          ).map(tab => {
            const IconComp = tab.icon;
            const selected = activeTab === tab.key;

            return (
              <button
                id={`app-tab-${tab.key}`}
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsAddingExpense(false);
                }}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold font-sans text-xs transition cursor-pointer mr-6 ${
                  selected
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <IconComp className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>

        {/* Expanded Form Workspace View */}
        {(isAddingExpense || selectedEditExpense) && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-1">
            <ExpenseForm
              currentTrip={currentTrip}
              initExpense={selectedEditExpense}
              onSubmit={handleAddExpenseSubmit}
              onCancel={() => {
                setIsAddingExpense(false);
                setSelectedEditExpense(null);
              }}
            />
          </div>
        )}

        {/* Dynamic Tab Renderers */}
        {!isAddingExpense && !selectedEditExpense && (
          <section className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <TripDashboard
                currentTrip={currentTrip}
                expenses={expenses}
                onEditExpense={val => {
                  setSelectedEditExpense(val);
                }}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'friends' && (
              <FriendManager
                currentTrip={currentTrip}
                expenses={expenses}
                onAddFriend={handleAddFriend}
                onSettleDebt={handleSettleDebt}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetSummary
                currentTrip={currentTrip}
                expenses={expenses}
                onUpdateCategoryBudgets={handleUpdateCategoryBudgets}
                onUpdateTotalBudget={handleUpdateTotalBudget}
              />
            )}
          </section>
        )}
      </main>

      {/* Footer bar */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-center text-xs text-slate-400 font-medium font-sans">
        <p>SettleTrip International Tracker &copy; 2026 | Safe offline and synced databases.</p>
      </footer>
    </div>
  );
}
