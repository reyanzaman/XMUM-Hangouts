/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Bell, Check, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const NotificationBell: React.FC = () => {
  const { notifications, markNotificationsAsRead, clearNotification, switchUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter relevant notifications for current active user
  const { currentUser } = useApp();
  const myNotifications = notifications.filter(n => n.user_id === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markNotificationsAsRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="notification-bell-container">
      <button
        id="notification-bell-btn"
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors duration-200 focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span
            id="notif-count-badge"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-bounce"
          >
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="notification-dropdown"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-[-54px] xs:right-[-20px] sm:right-0 mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-[350px] sm:max-w-none rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5 z-50 border border-rose-100/50"
          >
            <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={markNotificationsAsRead}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
                >
                  <Check className="w-3.h-3" /> Mark all read
                </button>
              )}
            </div>

            <div id="notifications-list" className="max-h-80 overflow-y-auto">
              {myNotifications.length === 0 ? (
                <div id="no-notifications" className="py-8 text-center text-gray-400 text-sm">
                  <Bell className="w-8 h-8 mx-auto stroke-1 mb-2 text-gray-300" />
                  No notifications yet. Keep hanging!
                </div>
              ) : (
                myNotifications.map(notif => (
                  <div
                    id={`notif-${notif.id}`}
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-amber-50/30 transition-colors border-b border-gray-50 last:border-0 relative group ${
                      !notif.is_read ? "bg-rose-50/20" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-xs text-gray-700 leading-relaxed font-sans">
                        {notif.payload.custom_text}
                      </p>
                      <span className="text-[10px] text-gray-400 block mt-1 font-mono">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 self-center" />
                      )}
                      <button
                        id={`delete-notif-${notif.id}`}
                        onClick={() => clearNotification(notif.id)}
                        className="p-1 text-gray-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
