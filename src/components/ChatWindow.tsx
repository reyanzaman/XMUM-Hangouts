/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { AvatarSVG } from "./AvatarSVG";
import { Send, BookOpen, AlertCircle, MessageSquare, ShieldAlert, ArrowLeft, MoreVertical, X } from "lucide-react";
import { Chat, Message, Profile } from "../types";
import { motion, AnimatePresence } from "motion/react";

export const ChatWindow: React.FC = () => {
  const {
    currentUser,
    profiles,
    chats,
    messages,
    sendChatMessage,
    markChatAsRead,
    blocks,
    toggleBlockUser,
    hangouts,
    setViewedProfile
  } = useApp();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Focus and mark as read when chat changes
  const unreadCount = currentUser
    ? messages.filter(m => m.chat_id === activeChatId && m.sender_id !== currentUser.id && !m.is_read).length
    : 0;

  useEffect(() => {
    if (activeChatId && currentUser && unreadCount > 0) {
      markChatAsRead(activeChatId);
    }
  }, [activeChatId, unreadCount, currentUser?.id, markChatAsRead]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatId]);

  if (!currentUser) {
    return (
      <div id="chat-no-auth" className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-8">
        <MessageSquare className="w-12 h-12 text-rose-300 mx-auto stroke-1" />
        <h4 className="font-bold text-gray-800 mt-3">Access Locked</h4>
        <p className="text-gray-500 text-xs mt-1">Please sign in to read matching chats.</p>
      </div>
    );
  }

  // Find all active chats for this user
  const myChats = chats.filter(c => c.user_a_id === currentUser.id || c.user_b_id === currentUser.id);

  // Helper to extract the other user
  const getOtherUser = (chat: Chat): Profile | undefined => {
    const otherId = chat.user_a_id === currentUser.id ? chat.user_b_id : chat.user_a_id;
    return profiles.find(p => p.id === otherId);
  };

  // Helper to get unread count
  const getUnreadCount = (chatId: string): number => {
    return messages.filter(m => m.chat_id === chatId && m.sender_id !== currentUser.id && !m.is_read).length;
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const otherUser = activeChat ? getOtherUser(activeChat) : null;
  const activeChatMessages = messages.filter(m => m.chat_id === activeChatId);

  // Check locks/blocks
  const isBlockedByUser = otherUser 
    ? blocks.some(b => b.blocker_id === currentUser.id && b.blocked_id === otherUser.id)
    : false;
  const hasBlockedMe = otherUser
    ? blocks.some(b => b.blocker_id === otherUser.id && b.blocked_id === currentUser.id)
    : false;
  const isChatLocked = isBlockedByUser || hasBlockedMe;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChatId || isChatLocked) return;
    sendChatMessage(activeChatId, typedMessage);
    setTypedMessage("");
  };

  // If there are absolutely no chats, return a single cohesive full-width empty page instead of a weird split screen
  if (myChats.length === 0) {
    return (
      <div
        id="chat-system-empty"
        className="bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 h-[600px] flex flex-col items-center justify-center p-8 text-center font-sans animate-in fade-in duration-300"
      >
        <div className="p-4 bg-rose-50 rounded-full text-rose-500 mb-4 animate-bounce">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Your Inbox is Empty 📬</h3>
        <p className="text-gray-500 text-xs sm:text-sm max-w-sm mt-2 leading-relaxed font-medium">
          Your private chats will automatically unlock and appear here when host approvals occur.
        </p>
        <div className="mt-4 text-[10px] text-gray-400 font-mono tracking-wide">
          🔒 Safe • Verified student connections only
        </div>
      </div>
    );
  }

  return (
    <div
      id="chat-system-grid"
      className="bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-200 h-[650px] flex overflow-hidden font-sans"
    >
      {/* 1. Chats List (Sidebar) */}
      <div
        id="chat-sidebar"
        className={`w-full md:w-80 lg:w-96 border-r border-gray-50 flex flex-col h-full bg-slate-50/10 shrink-0 ${
          activeChatId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-gray-50">
          <h3 id="chat-sidebar-title" className="font-bold text-gray-800 text-sm">Your Hangouts Chats</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Dual safe chats opened on approved join requests.</p>
        </div>

        <div id="chats-threads-list" className="flex-1 overflow-y-auto py-2">
          {myChats.map(chat => {
            const other = getOtherUser(chat);
            if (!other) return null;

            const unread = getUnreadCount(chat.id);
            const chatMsgs = messages.filter(m => m.chat_id === chat.id);
            const lastMsg = chatMsgs[chatMsgs.length - 1];

            return (
              <button
                id={`chat-thread-btn-${chat.id}`}
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full p-4 flex gap-3.5 text-left border-b border-gray-50 hover:bg-slate-50/50 transition-colors duration-150 outline-none items-center relative ${
                  activeChatId === chat.id ? "bg-rose-50/25 font-semibold" : ""
                }`}
              >
                <AvatarSVG id={other.avatar_id} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                      {other.name}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate pr-4">
                    {lastMsg ? lastMsg.content : "No messages yet."}
                  </p>
                </div>

                {/* Badges */}
                {unread > 0 && (
                  <span className="bg-rose-500 text-[10px] text-white font-bold h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-white ml-2 animate-pulse">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Message Thread (Active Window) */}
      <div
        id="chat-message-window"
        className={`flex-1 flex flex-col h-full bg-white relative ${
          activeChatId ? "flex" : "hidden md:flex"
        }`}
      >
        {activeChatId && otherUser ? (
          <>
            {/* Header with robust responsive spacing to prevent email/button overlap */}
            <div className="p-3.5 sm:p-4 border-b border-gray-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setActiveChatId(null)}
                  className="p-1 text-gray-550 hover:bg-slate-100 rounded-lg md:hidden shrink-0"
                  title="Back to list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewedProfile(otherUser)}
                  className="flex items-center gap-2 sm:gap-3 min-w-0 text-left hover:text-rose-600 transition-all cursor-pointer group outline-none"
                  title={`View ${otherUser.name}'s Profile`}
                >
                  <div className="shrink-0 group-hover:scale-105 transition-transform">
                    <AvatarSVG id={otherUser.avatar_id} size={36} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate group-hover:underline">
                      {otherUser.name}
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-teal-600 font-mono truncate">
                      {otherUser.student_id}@xmu.edu.my
                    </p>
                  </div>
                </button>
              </div>

              {/* Block/Unblock header action */}
              <div className="shrink-0">
                <button
                  id="chat-toggle-block"
                  onClick={() => toggleBlockUser(otherUser.id)}
                  className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 font-semibold rounded-xl border transition-all cursor-pointer ${
                    isBlockedByUser 
                      ? "bg-rose-550 text-rose-600 border-rose-100/50" 
                      : "bg-slate-100/60 hover:bg-slate-100 text-slate-650 border-slate-200/55"
                  }`}
                >
                  {isBlockedByUser ? "Unblock" : "Block User"}
                </button>
              </div>
            </div>

            {/* Expansible info notes on the hangout related */}
            {activeChat?.hangout_id && (
              <div className="bg-amber-50/40 p-3 px-4 border-b border-gray-50/50 flex gap-2 items-start text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Meet on-campus for security! Linked to hangout plan:{" "}
                  <strong>
                    {hangouts.find(h => h.id === activeChat.hangout_id)?.intention
                      ? `I want to ${hangouts.find(h => h.id === activeChat.hangout_id)?.intention}`
                      : "This plan has ended."}
                  </strong>
                </div>
              </div>
            )}

            {/* Messages Thread list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/10">
              <AnimatePresence initial={false}>
                {activeChatMessages.map(msg => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-3 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-xs sm:text-sm ${
                          isMe
                            ? "bg-rose-500 text-white rounded-br-none"
                            : "bg-slate-100 text-gray-800 rounded-bl-none border border-slate-200/40"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</p>
                        <span
                          className={`text-[9px] block text-right mt-1.5 font-mono ${
                            isMe ? "text-rose-100" : "text-gray-400"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t border-gray-50 bg-white">
              {isChatLocked ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex gap-2 items-center text-xs text-rose-800">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    {isBlockedByUser 
                      ? "You blocked this student. Unblock to message." 
                      : "This user has blocked you or account security reviews are pending."}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    id="chat-text-input"
                    type="text"
                    value={typedMessage}
                    onChange={e => setTypedMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow bg-slate-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs sm:text-sm text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-rose-400 focus:border-rose-400"
                  />
                  <button
                    id="chat-send-btn"
                    type="submit"
                    className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-colors duration-150 flex items-center justify-center shrink-0"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/5 animate-in fade-in duration-300">
            <span className="p-4 bg-slate-50 text-rose-400 rounded-full mb-3.5 shadow-sm border border-slate-100">
              <MessageSquare className="w-8 h-8" />
            </span>
            <h4 id="no-chat-chosen-msg" className="font-extrabold text-gray-850 text-sm sm:text-base">No Chat Selected</h4>
            <p className="text-gray-400 text-xs max-w-[260px] mt-1.5 leading-relaxed">
              Select an active student conversation from the sidebar list to coordinate your plans safely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
