/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowLeft, Heart, Inbox, MessageSquare, Search, Send, ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Chat, Profile } from "../types";
import { formatHangoutIntent } from "../lib/hangouts";
import { AvatarSVG } from "./AvatarSVG";
import { ChatWindowSkeleton } from "./LoadingSkeletons";

export const ChatWindow: React.FC = () => {
  const {
    currentUser,
    isAuthInitializing,
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
  const [threadSearch, setThreadSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unreadCount = currentUser
    ? messages.filter(message => message.chat_id === activeChatId && message.sender_id !== currentUser.id && !message.is_read).length
    : 0;

  useEffect(() => {
    if (activeChatId && currentUser && unreadCount > 0) markChatAsRead(activeChatId);
  }, [activeChatId, unreadCount, currentUser?.id, markChatAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatId]);

  if (isAuthInitializing && !currentUser) return <ChatWindowSkeleton />;

  if (!currentUser) {
    return (
      <div id="chat-no-auth" className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <MessageSquare className="mx-auto h-11 w-11 text-rose-500" />
        <h4 className="mt-3 font-black text-slate-800">Inbox locked</h4>
        <p className="mt-1 text-xs text-slate-400">Sign in to read your conversations.</p>
      </div>
    );
  }

  const myChats = chats.filter(chat => chat.user_a_id === currentUser.id || chat.user_b_id === currentUser.id);
  const getOtherUser = (chat: Chat): Profile | undefined => {
    const otherId = chat.user_a_id === currentUser.id ? chat.user_b_id : chat.user_a_id;
    return profiles.find(profile => profile.id === otherId);
  };
  const getUnreadCount = (chatId: string) =>
    messages.filter(message => message.chat_id === chatId && message.sender_id !== currentUser.id && !message.is_read).length;
  const getChatMessages = (chatId: string) =>
    messages
      .filter(message => message.chat_id === chatId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const getLastMessage = (chatId: string) => getChatMessages(chatId).at(-1);

  const visibleChats = [...myChats]
    .filter(chat => {
      const other = getOtherUser(chat);
      const query = threadSearch.trim().toLowerCase();
      if (!query) return true;
      return Boolean(
        other?.name.toLowerCase().includes(query) ||
        other?.student_id.toLowerCase().includes(query) ||
        getLastMessage(chat.id)?.content.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aTime = new Date(getLastMessage(a.id)?.created_at || a.created_at).getTime();
      const bTime = new Date(getLastMessage(b.id)?.created_at || b.created_at).getTime();
      return bTime - aTime;
    });

  const activeChat = myChats.find(chat => chat.id === activeChatId);
  const otherUser = activeChat ? getOtherUser(activeChat) : null;
  const activeChatMessages = activeChatId ? getChatMessages(activeChatId) : [];
  const totalUnread = myChats.reduce((sum, chat) => sum + getUnreadCount(chat.id), 0);
  const isBlockedByUser = otherUser
    ? blocks.some(block => block.blocker_id === currentUser.id && block.blocked_id === otherUser.id)
    : false;
  const hasBlockedMe = otherUser
    ? blocks.some(block => block.blocker_id === otherUser.id && block.blocked_id === currentUser.id)
    : false;
  const isChatLocked = isBlockedByUser || hasBlockedMe;

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!typedMessage.trim() || !activeChatId || isChatLocked) return;
    sendChatMessage(activeChatId, typedMessage);
    setTypedMessage("");
  };

  if (myChats.length === 0) {
    return (
      <div id="chat-system-empty" className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white text-rose-500 shadow-sm ring-1 ring-rose-100">
          <Inbox className="h-9 w-9" />
          <Heart className="absolute -right-1 -top-1 h-5 w-5 fill-pink-400 text-pink-400" />
        </div>
        <h3 className="relative text-lg font-black tracking-tight text-slate-900 sm:text-xl">Your inbox is ready</h3>
        <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
          Private conversations appear here after a host approves a join request.
        </p>
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-rose-600 shadow-sm">
          <Heart className="h-3 w-3 text-pink-500" /> Your next campus conversation will land here.
        </div>
      </div>
    );
  }

  return (
    <div id="chat-system-grid" className="flex h-[calc(100dvh-9rem)] min-h-[540px] max-h-[780px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white font-sans shadow-sm">
      <aside id="chat-sidebar" className={`${activeChatId ? "hidden md:flex" : "flex"} h-full w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 md:w-[21rem] lg:w-[23rem]`}>
        <div className="space-y-3 border-b border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-850"><Inbox className="h-4 w-4 text-rose-500" /> Inbox</h3>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Your approved campus connections</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-rose-600 shadow-sm ring-1 ring-rose-100">{totalUnread > 0 ? `${totalUnread} new` : `${myChats.length} chats`}</span>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={threadSearch} onChange={event => setThreadSearch(event.target.value)} placeholder="Search conversations" className="w-full rounded-2xl border border-rose-100 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-350 focus:border-rose-300 focus:ring-2 focus:ring-rose-100" />
          </label>
        </div>

        <div id="chats-threads-list" className="flex-1 space-y-2 overflow-y-auto p-2.5 sm:p-3">
          {visibleChats.map(chat => {
            const other = getOtherUser(chat);
            if (!other) return null;
            const unread = getUnreadCount(chat.id);
            const lastMessage = getLastMessage(chat.id);
            return (
              <button key={chat.id} id={`chat-thread-btn-${chat.id}`} onClick={() => setActiveChatId(chat.id)} className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left outline-none transition-all duration-200 ${activeChatId === chat.id ? "border-rose-200 bg-rose-50/60 shadow-sm" : "border-transparent bg-white hover:border-slate-200"}`}>
                <AvatarSVG id={other.avatar_id} size={44} petCount={other.companion_pet_count} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-extrabold text-slate-800 sm:text-sm">{other.name}</span>
                    {lastMessage && <span className="shrink-0 text-[9px] font-semibold text-slate-400">{new Date(lastMessage.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                  </div>
                  <p className={`truncate pr-2 text-[11px] ${unread > 0 ? "font-bold text-slate-650" : "font-medium text-slate-400"}`}>{lastMessage?.content || "Start your conversation"}</p>
                </div>
                {unread > 0 && <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">{unread}</span>}
              </button>
            );
          })}
          {visibleChats.length === 0 && (
            <div className="px-4 py-12 text-center"><Search className="mx-auto h-7 w-7 text-rose-300" /><p className="mt-2 text-xs font-bold text-slate-500">No matching conversations</p><p className="mt-1 text-[10px] text-slate-400">Try another name or message.</p></div>
          )}
        </div>
      </aside>

      <section id="chat-message-window" className={`${activeChatId ? "flex" : "hidden md:flex"} relative h-full min-w-0 flex-1 flex-col bg-white`}>
        {activeChat && otherUser ? (
          <>
            <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-3.5 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button onClick={() => setActiveChatId(null)} className="shrink-0 rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 md:hidden" title="Back to inbox"><ArrowLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => setViewedProfile(otherUser)} className="group flex min-w-0 items-center gap-2.5 text-left outline-none">
                  <span className="transition-transform group-hover:scale-105"><AvatarSVG id={otherUser.avatar_id} size={38} petCount={otherUser.companion_pet_count} /></span>
                  <span className="min-w-0"><strong className="block truncate text-xs font-black text-slate-800 group-hover:text-rose-600 sm:text-sm">{otherUser.name}</strong><span className="block truncate text-[9px] font-semibold text-slate-400 sm:text-[10px]">{otherUser.student_id}</span></span>
                </button>
              </div>
              <button id="chat-toggle-block" onClick={() => toggleBlockUser(otherUser.id)} className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold transition-all ${isBlockedByUser ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-500"}`}>{isBlockedByUser ? "Unblock" : "Block"}</button>
            </header>

            {activeChat.hangout_id && (
              <div className="flex items-start gap-2 border-b border-rose-100 bg-rose-50/60 px-4 py-2.5 text-[10px] font-semibold text-rose-700 sm:px-5">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span>Linked plan: <strong>{hangouts.find(hangout => hangout.id === activeChat.hangout_id)?.intention ? formatHangoutIntent(hangouts.find(hangout => hangout.id === activeChat.hangout_id)?.intention || "") : "This plan has ended"}</strong></span>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-3 sm:p-5">
              <AnimatePresence initial={false}>
                {activeChatMessages.map(message => {
                  const isMe = message.sender_id === currentUser.id;
                  return (
                    <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[84%] rounded-[1.35rem] px-3.5 py-2.5 text-xs shadow-sm sm:max-w-[72%] sm:px-4 sm:py-3 sm:text-sm ${isMe ? "rounded-br-md bg-rose-500 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <span className={`mt-1.5 block text-right text-[8px] font-semibold ${isMe ? "text-rose-50" : "text-slate-350"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-slate-200 bg-white p-3 sm:p-4">
              {isChatLocked ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700"><ShieldAlert className="h-4 w-4 shrink-0" />{isBlockedByUser ? "Unblock this student to continue messaging." : "This conversation is currently unavailable."}</div>
              ) : (
                <form onSubmit={handleSend} className="flex items-center gap-2 rounded-[1.35rem] border border-rose-100 bg-rose-50/35 p-1.5 transition-all focus-within:border-rose-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100">
                  <input id="chat-text-input" value={typedMessage} onChange={event => setTypedMessage(event.target.value)} placeholder="Write a message" className="min-w-0 flex-grow bg-transparent px-3 py-2 text-xs text-slate-700 outline-none sm:text-sm" />
                  <button id="chat-send-btn" type="submit" disabled={!typedMessage.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm transition-all hover:bg-rose-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200" title="Send message"><Send className="h-4 w-4" /></button>
                </form>
              )}
            </footer>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
            <span className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-100 bg-white text-rose-500 shadow-sm"><MessageSquare className="h-7 w-7" /><Heart className="absolute -right-1 -top-1 h-4 w-4 text-pink-400" /></span>
            <h4 className="text-sm font-black text-slate-800 sm:text-base">Choose a conversation</h4>
            <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-slate-400">Pick a student from your inbox to continue planning together.</p>
          </div>
        )}
      </section>
    </div>
  );
};
