/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Trash2, Zap, WifiOff, Globe, Sparkles } from 'lucide-react';
import { TripNotification, Trip } from '../types';

interface NotificationCenterProps {
  notifications: TripNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  currentTrip: Trip;
  simulating: boolean;
  onToggleSimulation: (active: boolean) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}

export default function NotificationCenter({
  notifications,
  onMarkAsRead,
  onClearAll,
  currentTrip,
  simulating,
  onToggleSimulation,
  isOffline,
  onToggleOffline,
}: NotificationCenterProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => n.tripId === currentTrip.id && !n.isRead).length);
  }, [notifications, currentTrip.id]);

  const activeTripNotifications = notifications
    .filter(n => n.tripId === currentTrip.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="relative mr-2">
      {/* Real-time Status Badge & Control header inside top action bar */}
      <div className="flex items-center gap-3">
        {/* Offline Toggle */}
        <button
          id="offline-toggle-btn"
          onClick={onToggleOffline}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-300 ${
            isOffline
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
          title={isOffline ? "You are traveling offline" : "You are connected in real-time"}
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 animate-pulse" />
              <span>Travel Cloud (Syncing)</span>
            </>
          )}
        </button>

        {/* Sync Simulator Switch */}
        {!isOffline && (
          <button
            id="simulation-toggle-btn"
            onClick={() => onToggleSimulation(!simulating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-300 ${
              simulating
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle friend live activity simulation feel"
          >
            <Sparkles className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
            <span>{simulating ? 'Live Simulated' : 'Simulate Feed'}</span>
          </button>
        )}

        {/* Bell Button */}
        <button
          id="notification-bell-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              id="notifications-panel-container"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-secondary border-slate-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-sm text-slate-800">Trip Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold font-mono">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        activeTripNotifications.forEach(n => {
                          if (!n.isRead) onMarkAsRead(n.id);
                        });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  {activeTripNotifications.length > 0 && (
                    <button
                      onClick={() => {
                        onClearAll();
                        setIsOpen(false);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                      title="Clear all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {activeTripNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Bell className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                    <span className="text-xs text-slate-500 font-medium font-sans">No recent activity</span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      New expense splits and budget alerts will appear in this feed.
                    </span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeTripNotifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                          !notif.isRead ? 'bg-blue-50/40 border-l-2 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-semibold text-slate-900 leading-snug">
                              {notif.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap self-start mt-0.5">
                              {new Date(notif.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-sans leading-relaxed mt-1">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {notif.type === 'expense_added' ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-medium uppercase font-mono">
                                Expense Added
                              </span>
                            ) : notif.type === 'budget_warning' ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-medium uppercase font-mono">
                                Budget Alert
                              </span>
                            ) : notif.type === 'settlement' ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-medium uppercase font-mono">
                                Payment Settle
                              </span>
                            ) : (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-medium uppercase font-mono">
                                Offline Cached
                              </span>
                            )}
                          </div>
                        </div>

                        {!notif.isRead && (
                          <button
                            onClick={() => onMarkAsRead(notif.id)}
                            className="self-center p-1 bg-white hover:bg-blue-100 border border-slate-200 text-blue-600 rounded-full shadow-sm transition h-6 w-6 flex items-center justify-center cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {simulating && (
                <div className="bg-blue-50 border-t border-blue-100 px-4 py-2 flex items-center justify-between text-[11px] text-blue-800">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-blue-600 animate-bounce" />
                    <span>Live Simulation active. Trip members will add dynamic mock expenses periodically!</span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
