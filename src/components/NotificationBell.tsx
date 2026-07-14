/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { AppNotification } from "../types";
import {
  Bell,
  BellRing,
  Check,
  Clock3,
  Dot,
  Heart,
  MessageCircle,
  ShieldAlert,
  Trash2,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationBellProps {
  onOpenNotification: (notification: AppNotification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenNotification }) => {
  const { notifications, markNotificationsAsRead, clearNotification, profiles } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter relevant notifications for current active user
  const { currentUser } = useApp();
  const myNotifications = notifications
    .filter(n => n.user_id === currentUser?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const handleNotificationOpen = (notification: AppNotification) => {
    onOpenNotification(notification);
    setIsOpen(false);
  };

  const getNotificationMeta = (notification: AppNotification) => {
    switch (notification.type) {
      case "new_application":
        return {
          label: "Join Request",
          icon: UserCheck,
          accent: "text-amber-700 bg-amber-50 border-amber-100",
          iconWrap: "bg-amber-100 text-amber-700"
        };
      case "application_accepted":
        return {
          label: "Accepted",
          icon: Check,
          accent: "text-teal-700 bg-teal-50 border-teal-100",
          iconWrap: "bg-teal-100 text-teal-700"
        };
      case "application_rejected":
        return {
          label: "Update",
          icon: BellRing,
          accent: "text-rose-700 bg-rose-50 border-rose-100",
          iconWrap: "bg-rose-100 text-rose-700"
        };
      case "comment_reply":
        return {
          label: "Comment",
          icon: MessageCircle,
          accent: "text-sky-700 bg-sky-50 border-sky-100",
          iconWrap: "bg-sky-100 text-sky-700"
        };
      case "hangout_like":
        return {
          label: "Reaction",
          icon: Heart,
          accent: "text-rose-700 bg-rose-50 border-rose-100",
          iconWrap: "bg-rose-100 text-rose-700"
        };
      case "upcoming_hangout_reminder":
        return {
          label: "Reminder",
          icon: Clock3,
          accent: "text-indigo-700 bg-indigo-50 border-indigo-100",
          iconWrap: "bg-indigo-100 text-indigo-700"
        };
      case "report_approved":
      case "report_appeal_result":
      case "new_report_admin":
        return {
          label: "Safety",
          icon: ShieldAlert,
          accent: "text-purple-700 bg-purple-50 border-purple-100",
          iconWrap: "bg-purple-100 text-purple-700"
        };
      default:
        return {
          label: "Notice",
          icon: Bell,
          accent: "text-slate-700 bg-slate-50 border-slate-100",
          iconWrap: "bg-slate-100 text-slate-700"
        };
    }
  };

  const getNotificationText = (notification: AppNotification) => {
    const text = notification.payload.custom_text || notification.payload.message || "You have a new update.";
    if (notification.payload.actor_is_anonymous || !notification.payload.actor_user_id || !notification.payload.actor_name) {
      return text;
    }

    const latestActor = profiles.find(profile => profile.id === notification.payload.actor_user_id);
    const latestName = latestActor?.name?.trim();
    if (!latestName || latestName === notification.payload.actor_name) {
      return text;
    }

    return text.split(notification.payload.actor_name).join(latestName);
  };

  return (
    <div className="relative" ref={dropdownRef} id="notification-bell-container">
      <button
        id="notification-bell-btn"
        onClick={handleToggle}
        className="relative rounded-xl sm:rounded-2xl border border-transparent bg-white/70 p-1.5 sm:p-2 text-gray-600 shadow-sm transition-all duration-200 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 hover:shadow focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {unreadCount > 0 && (
          <span
            id="notif-count-badge"
            className="absolute -right-1 -top-1 flex min-w-4 sm:min-w-5 items-center justify-center gap-0.5 rounded-full bg-rose-500 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold text-white ring-2 ring-white shadow-[0_10px_22px_rgba(244,63,94,0.35)]"
          >
            {unreadCount < 10 && <Dot className="-ml-1 h-3 w-3" />}
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
            className="fixed left-3 right-3 top-14 z-50 w-auto max-w-none overflow-hidden rounded-[1.75rem] border border-rose-100/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur-sm sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[24rem]"
          >
            <div className="border-b border-rose-100/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.14),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(255,241,242,0.75))] px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm ring-1 ring-rose-100">
                      <BellRing className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Notifications</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-[11px] text-slate-500">
                          {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "All caught up for now"}
                        </p>
                        {myNotifications.length > 0 && (
                          <span className="rounded-full border border-white/80 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                            {myNotifications.length} total
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    id="mark-all-read-btn"
                    onClick={markNotificationsAsRead}
                    className="shrink-0 rounded-xl border border-white/90 bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            <div id="notifications-list" className="max-h-[24rem] overflow-y-auto px-3 py-3">
              {myNotifications.length === 0 ? (
                <div id="no-notifications" className="py-10 text-center text-gray-400 text-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-300 ring-1 ring-rose-100">
                    <Bell className="w-6 h-6 stroke-1.5" />
                  </div>
                  <p className="font-semibold text-slate-500">No notifications yet</p>
                  <p className="mt-1 text-[11px] text-slate-400">Replies, approvals, and reminders will show up here.</p>
                </div>
              ) : (
                myNotifications.map(notif => {
                  const meta = getNotificationMeta(notif);
                  const Icon = meta.icon;

                  return (
                    <div
                      id={`notif-${notif.id}`}
                      key={notif.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationOpen(notif)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNotificationOpen(notif);
                        }
                      }}
                      className={`group relative mb-2 flex cursor-pointer gap-3 rounded-[1.35rem] border px-3.5 py-3 transition-all last:mb-0 ${
                        !notif.is_read
                          ? "border-rose-100 bg-[linear-gradient(135deg,_rgba(255,241,242,0.95),_rgba(255,255,255,1))] shadow-[0_10px_30px_rgba(251,113,133,0.08)]"
                          : "border-slate-100 bg-white hover:border-rose-100 hover:bg-slate-50/80 hover:shadow-sm"
                      }`}
                    >
                      {!notif.is_read && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-rose-400" />}

                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 ${meta.iconWrap}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${meta.accent}`}>
                              {meta.label}
                            </span>
                            {!notif.is_read && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" />
                            )}
                          </div>
                          <button
                            id={`delete-notif-${notif.id}`}
                            onClick={event => {
                              event.stopPropagation();
                              clearNotification(notif.id);
                            }}
                            className="shrink-0 rounded-xl p-1.5 text-slate-300 opacity-70 transition-all hover:bg-white hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="mt-2 text-[12px] font-medium leading-5 text-slate-700">
                          {getNotificationText(notif)}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="block text-[10px] font-mono text-slate-400">
                            {new Date(notif.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 transition-colors group-hover:text-rose-400">
                            Open
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
