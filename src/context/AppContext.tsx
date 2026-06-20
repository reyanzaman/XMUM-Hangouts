/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Profile,
  Hangout,
  HangoutApplication,
  HangoutLike,
  HangoutComment,
  Report,
  ReportAppeal,
  Chat,
  Message,
  Block,
  AppNotification,
  HangoutRestrictions
} from "../types";

import { XMUM_PROGRAMS } from "../config/xmum-config";
import { supabase } from "../lib/supabase";
import { encryptMessage, decryptMessage } from "../lib/encryption";

interface AppContextType {
  currentUser: Profile | null;
  profiles: Profile[];
  hangouts: Hangout[];
  applications: HangoutApplication[];
  likes: HangoutLike[];
  comments: HangoutComment[];
  reports: Report[];
  appeals: ReportAppeal[];
  chats: Chat[];
  messages: Message[];
  blocks: Block[];
  notifications: AppNotification[];
  
  // Auth Functions
  signInSimulated: (email: string, name?: string) => Promise<{ success: boolean; error?: string; message?: string; resend_expired?: boolean }>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOutSimulated: () => void;
  completeOnboarding: () => void;
  
  // Custom action triggers for demo
  switchUser: (profileId: string, providedProfile?: Profile) => void;
  createMockUser: (email: string, name: string, isAdmin?: boolean) => void;

  // Profile Functions
  updateProfile: (data: Partial<Profile>) => { success: boolean; error?: string };
  setHideDetails: (hide: boolean) => void;
  
  // Hangout Functions
  createHangout: (data: Omit<Hangout, "id" | "creator_id" | "status" | "created_at" | "updated_at">) => { success: boolean; error?: string };
  toggleLike: (hangoutId: string) => void;
  addComment: (hangoutId: string, content: string, parentCommentId?: string | null) => { success: boolean; error?: string };
  
  // Application Functions
  applyToHangout: (hangoutId: string, isAnonymous: boolean) => { success: boolean; error?: string };
  retractApplication: (applicationId: string) => void;
  manageApplication: (applicationId: string, status: "accepted" | "rejected", rejectMessage?: string) => void;
  
  // Chat Functions
  getOrCreateChat: (otherUserId: string, hangoutId?: string | null) => Chat;
  sendChatMessage: (chatId: string, content: string) => void;
  markChatAsRead: (chatId: string) => void;

  // Block/Report Functions
  toggleBlockUser: (otherUserId: string) => void;
  submitReport: (reportedUserId: string, description: string) => { success: boolean; error?: string };
  submitAppeal: (reportId: string, description: string) => { success: boolean; error?: string };
  
  // Admin functions
  adminReviewReport: (reportId: string, action: "approved" | "rejected") => void;
  adminReviewAppeal: (appealId: string, action: "approved" | "rejected", reason?: string) => void;

  // Helpers
  isEligibleForHangout: (profile: Profile, hangout: Hangout) => { eligible: boolean; reasons: string[] };
  triggerCronJobs: () => void;
  clearNotification: (id: string) => void;
  markNotificationsAsRead: () => void;

  // Demo status helper
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;

  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  clearToast: () => void;

  viewedProfile: Profile | null;
  setViewedProfile: (profile: Profile | null) => void;

  commentLikes: { comment_id: string; user_id: string }[];
  toggleCommentLike: (commentId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- DATABASE TABLES IN LOCAL STORAGE ---
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem("xmum_current_user_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Sync current user updates to local storage for instant loads and absolute session permanence
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("xmum_current_user_profile", JSON.stringify(currentUser));
      localStorage.setItem("xmum_current_user_id", currentUser.id);
    } else {
      localStorage.removeItem("xmum_current_user_profile");
      localStorage.removeItem("xmum_current_user_id");
    }
  }, [currentUser]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);
  const [applications, setApplications] = useState<HangoutApplication[]>([]);
  const [likes, setLikes] = useState<HangoutLike[]>([]);
  const [comments, setComments] = useState<HangoutComment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<ReportAppeal[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [commentLikes, setCommentLikes] = useState<{ comment_id: string; user_id: string }[]>(() => {
    try {
      const saved = localStorage.getItem("xmum_comment_likes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Onboarding Helper state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);

  // Rate limits state tracker for simulation
  const [lastHangoutCreatedTime, setLastHangoutCreatedTime] = useState<number>(0);
  const [lastCommentCreatedTime, setLastCommentCreatedTime] = useState<number>(0);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };
  const clearToast = () => setToast(null);

  // Auto-clear active toast notifications after 4 seconds to prevent endless floating
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const mergeByField = <T extends { id: string }>(arrSupa: T[], arrLocal: T[]): T[] => {
    const mapObj = new Map<string, T>();
    if (Array.isArray(arrLocal)) {
      arrLocal.forEach(item => {
        if (item && item.id) mapObj.set(item.id, item);
      });
    }
    if (Array.isArray(arrSupa)) {
      arrSupa.forEach(item => {
        if (item && item.id) mapObj.set(item.id, item);
      });
    }
    return Array.from(mapObj.values());
  };

  const sanitizeHangout = (h: any) => ({
    id: h.id,
    creator_id: h.creator_id,
    intention: h.intention,
    location: h.location,
    event_datetime: h.event_datetime,
    meeting_point: h.meeting_point,
    additional_info: h.additional_info,
    max_participants: h.max_participants,
    restrictions: h.restrictions,
    status: h.status,
    created_at: h.created_at,
    updated_at: h.updated_at,
    is_anonymous: !!h.is_anonymous
  });

  const sanitizeComment = (c: any) => ({
    id: c.id,
    hangout_id: c.hangout_id,
    user_id: c.user_id,
    parent_comment_id: c.parent_comment_id || null,
    content: c.content,
    created_at: c.created_at
  });

  // --- INITIAL SEEDING ---
  useEffect(() => {
    const initData = async () => {
      try {
        // Parse URL segment/hash to automatically process redirect authentication keys from external emails
        try {
          const authHashStr = window.location.hash || window.location.search;
          if (authHashStr && (authHashStr.includes("access_token=") || authHashStr.includes("refresh_token="))) {
            const cleanUrlQuery = authHashStr.replace(/^[#?]/, "");
            const tempSearchObj = new URLSearchParams(cleanUrlQuery);
            const maybeAccessToken = tempSearchObj.get("access_token");
            const maybeRefreshToken = tempSearchObj.get("refresh_token");
            if (maybeAccessToken && maybeRefreshToken) {
              console.log("Restoring Supabase auth session from copied token link URL...");
              const { error: sessionSetErr } = await supabase.auth.setSession({
                access_token: maybeAccessToken,
                refresh_token: maybeRefreshToken
              });
              if (!sessionSetErr) {
                // Clear URL address bar hash to keep UI clean
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
              } else {
                console.warn("Session restore error:", sessionSetErr.message);
              }
            }
          }
        } catch (uhError) {
          console.error("Auto hash verification attempt skipped:", uhError);
        }

        console.log("Loading primary tables from Supabase...");
        
        // --- 1. Profiles ---
        let { data: dbProfiles, error: errProfiles } = await supabase.from("xmum_profiles").select("*");
        if (errProfiles) throw errProfiles;
        
        if (!dbProfiles || dbProfiles.length === 0) {
          const seedProfiles: Profile[] = [
            {
              id: "sys_admin",
              email: "admin@xmu.edu.my",
              student_id: "admin",
              name: "Dean Hangouts",
              name_last_changed_at: null,
              country: "Malaysia",
              country_last_changed_at: null,
              languages: ["English", "Malay (Bahasa Melayu)", "Mandarin (Chinese)"],
              age: 26,
              program: "Software Engineering",
              year_of_study: "Year 5+",
              gender: "Male",
              student_type: "postgraduate",
              about_me: "The official admin of XMUM Hangouts. Hit me up if you ever experience safety issues or bad manners!",
              avatar_id: "owl",
              is_profile_complete: true,
              hide_details: false,
              is_admin: true,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            },
            {
              id: "user_sarah",
              email: "sarah.lin@xmu.edu.my",
              student_id: "sarah.lin",
              name: "Sarah Lin",
              name_last_changed_at: null,
              country: "Singapore",
              country_last_changed_at: null,
              languages: ["English", "Mandarin (Chinese)"],
              age: 20,
              program: "Computer Science & Technology",
              year_of_study: "Year 2",
              gender: "Female",
              student_type: "degree",
              about_me: "Love bubble tea, programming in PyTorch, and playing boardgames. Looking for friends to form a weekly Catan party!",
              avatar_id: "cat",
              is_profile_complete: true,
              hide_details: false,
              is_admin: false,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            },
            {
              id: "user_ahmad",
              email: "ahmad.fauzi@xmu.edu.my",
              student_id: "ahmad.fauzi",
              name: "Ahmad Fauzi",
              name_last_changed_at: null,
              country: "Malaysia",
              country_last_changed_at: null,
              languages: ["Malay (Bahasa Melayu)", "English"],
              age: 19,
              program: "Artificial Intelligence",
              year_of_study: "Year 1",
              gender: "Male",
              student_type: "degree",
              about_me: "Futuristic ML researcher and part-time coffee barista. Lets explore cafes around Sepang or Putrajaya together!",
              avatar_id: "koala",
              is_profile_complete: true,
              hide_details: false,
              is_admin: false,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            },
            {
              id: "user_xiaoming",
              email: "xiaoming@xmu.edu.my",
              student_id: "xiaoming",
              name: "Xiao Ming",
              name_last_changed_at: null,
              country: "China",
              country_last_changed_at: null,
              languages: ["Mandarin (Chinese)", "English"],
              age: 21,
              program: "Digital Media Technology",
              year_of_study: "Year 3",
              gender: "Male",
              student_type: "degree",
              about_me: "Digital designer, anime nerd, and cozy game lover. Happy to help practice Mandarin or discuss animations!",
              avatar_id: "panda",
              is_profile_complete: true,
              hide_details: false,
              is_admin: false,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            }
          ];
          await supabase.from("xmum_profiles").insert(seedProfiles);
          dbProfiles = seedProfiles;
        }

        // Force admin for mcs2509008@xmu.edu.my if it exists
        let adminChanged = false;
        dbProfiles = dbProfiles.map(p => {
          if (p.email.toLowerCase().trim() === "mcs2509008@xmu.edu.my" && !p.is_admin) {
            adminChanged = true;
            return { ...p, is_admin: true };
          }
          return p;
        });
        if (adminChanged) {
          await supabase.from("xmum_profiles").upsert(dbProfiles);
        }
        setProfiles(dbProfiles);
        localStorage.setItem("xmum_profiles", JSON.stringify(dbProfiles));

        // --- 2. Hangouts ---
        let localHangouts: Hangout[] = [];
        try {
          const res = await fetch("/api/hangouts");
          const json = await res.json();
          localHangouts = json.hangouts || [];
        } catch (e) {
          console.warn("Failed to fetch local hangouts backup during startup:", e);
        }

        let { data: dbHangouts, error: errHangouts } = await supabase.from("view_xmum_hangouts").select("*");
        if (errHangouts) {
          console.warn("view_xmum_hangouts read failed, fetching from base table:", errHangouts);
          const { data: baseHG, error: errBaseHG } = await supabase.from("xmum_hangouts").select("*");
          if (!errBaseHG && baseHG) {
            dbHangouts = baseHG;
          }
        }
        let finalHangouts = mergeByField((dbHangouts || []) as Hangout[], localHangouts);

        if (!finalHangouts || finalHangouts.length === 0) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(18, 0, 0, 0);

          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 5);
          nextWeek.setHours(14, 0, 0, 0);

          const dayAfterTomorrow = new Date();
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
          dayAfterTomorrow.setHours(16, 30, 0, 0);

          const seedHangouts: Hangout[] = [
            {
              id: "hangout_catan",
              creator_id: "user_sarah",
              intention: "boardgame night and play Settlers of Catan",
              location: "Block B Study Hall / Activity Room",
              event_datetime: tomorrow.toISOString(),
              meeting_point: "Red high-chairs in the middle of Block B Hall",
              additional_info: "I hired the boardgame box with Catan and Cities & Knights expansion. Beginner friendly! I have cookies as well, just bring your good vibes.",
              max_participants: 4,
              restrictions: {
                countries: [],
                languages: ["English"],
                programs: [],
                years: [],
                student_types: [],
                age_min: null,
                age_max: null,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "hangout_cafe",
              creator_id: "user_ahmad",
              intention: "go for a late night Mamak / Cafe run to discuss Machine Learning projects",
              location: "Sepang / Dengkil Cafe Area",
              event_datetime: nextWeek.toISOString(),
              meeting_point: "Main Guard House (Main Gate 1) waiting area",
              additional_info: "We'll pool a Grab. Open to both newbies and veterans who are interested in AI. Highly conversational & chill session over milk tea/roti canai.",
              max_participants: null,
              restrictions: {
                countries: [],
                languages: [],
                programs: [],
                years: [],
                student_types: ["degree", "postgraduate"],
                age_min: 18,
                age_max: 25,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "hangout_badminton",
              creator_id: "user_xiaoming",
              intention: "play friendly badminton singles/doubles",
              location: "XMUM Sports Hall Court 3",
              event_datetime: dayAfterTomorrow.toISOString(),
              meeting_point: "Courtside benches near Court 3",
              additional_info: "Friendly match, rackets can be rented. Looking for intermediate or beginner players to play 2v2 doubles together.",
              max_participants: 4,
              restrictions: {
                countries: [],
                languages: [],
                programs: [],
                years: [],
                student_types: [],
                age_min: null,
                age_max: null,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "hangout_study",
              creator_id: "sys_admin",
              intention: "quiet study and research session",
              location: "Main Library Level 3 Quiet Room",
              event_datetime: nextWeek.toISOString(),
              meeting_point: "Water dispenser area of Library Level 3",
              additional_info: "Quiet focus sprint, study buddy session. We use the Pomodoro technique to complete mock reports or final theses.",
              max_participants: 6,
              restrictions: {
                countries: [],
                languages: [],
                programs: [],
                years: [],
                student_types: [],
                age_min: null,
                age_max: null,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          await supabase.from("xmum_hangouts").insert(seedHangouts.map(h => sanitizeHangout(h)));
          finalHangouts = seedHangouts;
        }
        const cleanHangouts = finalHangouts.filter(h => h.additional_info && h.additional_info.trim() !== "");
        setHangouts(cleanHangouts);
        localStorage.setItem("xmum_hangouts", JSON.stringify(cleanHangouts));

        // --- 3. Applications ---
        let localApps: HangoutApplication[] = [];
        try {
          const res = await fetch("/api/applications");
          const json = await res.json();
          localApps = json.applications || [];
        } catch (e) {
          console.warn("Failed to fetch local applications backup during startup:", e);
        }
        let { data: dbApps } = await supabase.from("xmum_applications").select("*");
        let finalApps = mergeByField((dbApps || []) as HangoutApplication[], localApps);

        if (finalApps.length === 0) {
          const seedApps: HangoutApplication[] = [
            {
              id: "app_seed_1",
              hangout_id: "hangout_catan",
              applicant_id: "user_ahmad",
              is_anonymous: false,
              status: "accepted",
              rejection_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "app_seed_2",
              hangout_id: "hangout_catan",
              applicant_id: "user_xiaoming",
              is_anonymous: true,
              status: "pending",
              rejection_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "app_seed_3",
              hangout_id: "hangout_cafe",
              applicant_id: "user_sarah",
              is_anonymous: false,
              status: "pending",
              rejection_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          await supabase.from("xmum_applications").insert(seedApps);
          finalApps = seedApps;
        }
        setApplications(finalApps);
        localStorage.setItem("xmum_applications", JSON.stringify(finalApps));

        // --- 4. Chats ---
        let localChats: Chat[] = [];
        try {
          const res = await fetch("/api/chats");
          const json = await res.json();
          localChats = json.chats || [];
        } catch (e) {
          console.warn("Failed to fetch local chats backup during startup:", e);
        }
        let { data: dbChats } = await supabase.from("xmum_chats").select("*");
        let finalChats = mergeByField((dbChats || []) as Chat[], localChats);

        if (finalChats.length === 0) {
          const seedChats = [
            {
              id: "chat_seed_sarah_ahmad",
              user_a_id: "user_sarah",
              user_b_id: "user_ahmad",
              hangout_id: "hangout_catan",
              created_at: new Date().toISOString()
            }
          ];
          await supabase.from("xmum_chats").insert(seedChats);
          finalChats = seedChats;
        }
        setChats(finalChats);
        localStorage.setItem("xmum_chats", JSON.stringify(finalChats));

        // --- 5. Messages ---
        let localMessages: Message[] = [];
        try {
          const res = await fetch("/api/messages");
          const json = await res.json();
          localMessages = json.messages || [];
        } catch (e) {
          console.warn("Failed to fetch local messages backup during startup:", e);
        }
        let { data: dbMessages } = await supabase.from("xmum_messages").select("*");
        let finalMessages = mergeByField((dbMessages || []) as Message[], localMessages);

        if (finalMessages.length === 0) {
          const fiveMinsAgo = new Date();
          fiveMinsAgo.setMinutes(fiveMinsAgo.getMinutes() - 15);
          const twoMinsAgo = new Date();
          twoMinsAgo.setMinutes(twoMinsAgo.getMinutes() - 5);

          const seedMessages = [
            {
              id: "msg_seed_1",
              chat_id: "chat_seed_sarah_ahmad",
              sender_id: "user_ahmad",
              content: "Hey Sarah, I'm super excited about playing Catan tomorrow! I haven't played the Cities & Knights expansion before, is it easy for me to pick up?",
              is_read: true,
              created_at: fiveMinsAgo.toISOString()
            },
            {
              id: "msg_seed_2",
              chat_id: "chat_seed_sarah_ahmad",
              sender_id: "user_sarah",
              content: "Hey Ahmad, definitely! It takes maybe 10 minutes to explain, but it adds so much depth. Looking forward to gaming together!",
              is_read: false,
              created_at: twoMinsAgo.toISOString()
            }
          ];
          
          const encryptedSeeds = seedMessages.map(msg => ({
            ...msg,
            content: encryptMessage(msg.content)
          }));
          await supabase.from("xmum_messages").insert(encryptedSeeds);
          finalMessages = encryptedSeeds;
        }
        
        const decryptedMessages = finalMessages.map(msg => {
          try {
            return { ...msg, content: decryptMessage(msg.content) };
          } catch {
            return msg;
          }
        });
        setMessages(decryptedMessages);
        
        const encryptedLocal = decryptedMessages.map(msg => ({
          ...msg,
          content: encryptMessage(msg.content)
        }));
        localStorage.setItem("xmum_messages", JSON.stringify(encryptedLocal));

        // --- 6. Other tables ---
        let localLikes: HangoutLike[] = [];
        try {
          const res = await fetch("/api/likes");
          const json = await res.json();
          localLikes = json.likes || [];
        } catch (e) {}
        const { data: dbLikes } = await supabase.from("xmum_likes").select("*");
        const finalLikes = mergeByField((dbLikes || []) as HangoutLike[], localLikes);
        setLikes(finalLikes);
        localStorage.setItem("xmum_likes", JSON.stringify(finalLikes));

        let localComments: HangoutComment[] = [];
        try {
          const res = await fetch("/api/comments");
          const json = await res.json();
          localComments = json.comments || [];
        } catch (e) {}
        const { data: dbComments } = await supabase.from("xmum_comments").select("*");
        const finalComments = mergeByField((dbComments || []) as HangoutComment[], localComments);
        setComments(finalComments);
        localStorage.setItem("xmum_comments", JSON.stringify(finalComments));

        let localReports: Report[] = [];
        try {
          const res = await fetch("/api/reports");
          const json = await res.json();
          localReports = json.reports || [];
        } catch (e) {}
        const { data: dbReports } = await supabase.from("xmum_reports").select("*");
        const finalReports = mergeByField((dbReports || []) as Report[], localReports);
        setReports(finalReports);
        localStorage.setItem("xmum_reports", JSON.stringify(finalReports));

        let localAppeals: ReportAppeal[] = [];
        try {
          const res = await fetch("/api/appeals");
          const json = await res.json();
          localAppeals = json.appeals || [];
        } catch (e) {}
        const { data: dbAppeals } = await supabase.from("xmum_appeals").select("*");
        const finalAppeals = mergeByField((dbAppeals || []) as ReportAppeal[], localAppeals);
        setAppeals(finalAppeals);
        localStorage.setItem("xmum_appeals", JSON.stringify(finalAppeals));

        let localBlocks: Block[] = [];
        try {
          const res = await fetch("/api/blocks");
          const json = await res.json();
          localBlocks = json.blocks || [];
        } catch (e) {}
        const { data: dbBlocks } = await supabase.from("xmum_blocks").select("*");
        const finalBlocks = mergeByField((dbBlocks || []) as Block[], localBlocks);
        setBlocks(finalBlocks);
        localStorage.setItem("xmum_blocks", JSON.stringify(finalBlocks));

        let localNotifs: any[] = [];
        try {
          const res = await fetch("/api/notifications");
          const json = await res.json();
          localNotifs = json.notifications || [];
        } catch (e) {}
        const { data: dbNotifs } = await supabase.from("xmum_notifications").select("*");
        const finalNotifs = mergeByField((dbNotifs || []) as any[], localNotifs);
        setNotifications(finalNotifs);
        localStorage.setItem("xmum_notifications", JSON.stringify(finalNotifs));

        // Listen for Auth Session updates automatically
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          try {
            if (session?.user) {
              const email = session.user.email;
              if (email && email.toLowerCase().endsWith("@xmu.edu.my")) {
                let profile: Profile | null = null;
                try {
                  const { data } = await supabase.from("xmum_profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
                  profile = data;
                } catch (dbErr) {
                  console.warn("Auth state change callback profile fetch failed (using local match):", dbErr);
                  profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
                }

                if (!profile) {
                  const student_id = email.split("@")[0];
                  profile = {
                    id: session.user.id,
                    email: email.toLowerCase(),
                    student_id,
                    name: email.split("@")[0],
                    name_last_changed_at: null,
                    country: "Malaysia",
                    country_last_changed_at: null,
                    languages: ["English"],
                    age: 18,
                    program: "Software Engineering",
                    year_of_study: "Year 1",
                    gender: "Male",
                    student_type: "degree",
                    about_me: "Hey there! I am new here on XMUM Hangouts.",
                    avatar_id: "panda",
                    is_profile_complete: false,
                    hide_details: false,
                    is_admin: email.toLowerCase() === "mcs2509008@xmu.edu.my" || email.toLowerCase().startsWith("admin"),
                    is_blocked_globally: false,
                    flag_status: "none",
                    appeal_count: 0
                  };
                  try {
                    await supabase.from("xmum_profiles").insert([profile]);
                  } catch (insErr) {
                    console.warn("Auth state change profile creation deferred (offline database):", insErr);
                  }
                  setProfiles(prev => {
                    if (!prev.some(p => p.id === profile!.id)) {
                      return [...prev, profile!];
                    }
                    return prev;
                  });
                  setShowOnboarding(true);
                }
                setCurrentUser(profile);
                localStorage.setItem("xmum_current_user_id", profile.id);
              }
            }
          } catch (callbackErr) {
            console.error("Auth state change callback exception:", callbackErr);
          }
        });

        // Initialize active user session if previously logged in from local state
        const storedActiveUser = localStorage.getItem("xmum_current_user_id");
        if (storedActiveUser) {
          try {
            const { data: userProfile } = await supabase.from("xmum_profiles").select("*").eq("id", storedActiveUser).maybeSingle();
            if (userProfile) {
              setCurrentUser(userProfile);
            } else {
              const fallbackLocal = profiles.find(p => p.id === storedActiveUser);
              if (fallbackLocal) {
                setCurrentUser(fallbackLocal);
              }
            }
          } catch (actErr) {
            console.warn("Active user profile fetch errored, resolving from local profiles cache:", actErr);
            const fallbackLocal = profiles.find(p => p.id === storedActiveUser);
            if (fallbackLocal) {
              setCurrentUser(fallbackLocal);
            }
          }
        }

        return () => {
          subscription.unsubscribe();
        };

      } catch (err) {
        console.error("Failed to fetch primary tables from Supabase, resolving from LocalStorage fallback:", err);
        // LocalStorage Fallback loaders
        const storedProfiles = localStorage.getItem("xmum_profiles");
        setProfiles(storedProfiles ? JSON.parse(storedProfiles) : []);
        const rawLocalHangouts = localStorage.getItem("xmum_hangouts") ? JSON.parse(localStorage.getItem("xmum_hangouts")!) : [];
        setHangouts(rawLocalHangouts.filter((h: any) => h.additional_info && h.additional_info.trim() !== ""));
        setApplications(localStorage.getItem("xmum_applications") ? JSON.parse(localStorage.getItem("xmum_applications")!) : []);
        setChats(localStorage.getItem("xmum_chats") ? JSON.parse(localStorage.getItem("xmum_chats")!) : []);
        const cachedMsgsRaw = localStorage.getItem("xmum_messages");
        const decryptedLocalMsgs = cachedMsgsRaw
          ? JSON.parse(cachedMsgsRaw).map((m: any) => ({ ...m, content: decryptMessage(m.content) }))
          : [];
        setMessages(decryptedLocalMsgs);
        setLikes(localStorage.getItem("xmum_likes") ? JSON.parse(localStorage.getItem("xmum_likes")!) : []);
        setComments(localStorage.getItem("xmum_comments") ? JSON.parse(localStorage.getItem("xmum_comments")!) : []);
        setReports(localStorage.getItem("xmum_reports") ? JSON.parse(localStorage.getItem("xmum_reports")!) : []);
        setAppeals(localStorage.getItem("xmum_appeals") ? JSON.parse(localStorage.getItem("xmum_appeals")!) : []);
        setBlocks(localStorage.getItem("xmum_blocks") ? JSON.parse(localStorage.getItem("xmum_blocks")!) : []);
        setNotifications(localStorage.getItem("xmum_notifications") ? JSON.parse(localStorage.getItem("xmum_notifications")!) : []);

        const storedActiveUser = localStorage.getItem("xmum_current_user_id");
        if (storedActiveUser && storedProfiles) {
          const found = JSON.parse(storedProfiles).find((p: any) => p.id === storedActiveUser);
          if (found) setCurrentUser(found);
        }
      }
    };
    initData();
  }, []);

  // --- PERSISTENCE SYNCS ---
  const saveProfiles = async (data: Profile[]) => {
    const prev = profiles;
    setProfiles(data);
    localStorage.setItem("xmum_profiles", JSON.stringify(data));
    
    // Sync to backend file-based local profiles registry
    try {
      await fetch("/api/profiles/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: data })
      });
    } catch (syncErr) {
      console.warn("Local backend profiles mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(p => p.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_profiles").upsert(changed);
      }
    } catch (e) {
      console.error("Profiles sync exception:", e);
    }
  };
  const saveHangouts = async (data: Hangout[]) => {
    const prev = hangouts;
    setHangouts(data);
    localStorage.setItem("xmum_hangouts", JSON.stringify(data));

    try {
      await fetch("/api/hangouts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hangouts: data })
      });
    } catch (syncErr) {
      console.warn("Local backend hangouts mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(h => h.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        const sanitized = changed.map(item => sanitizeHangout(item));
        await supabase.from("xmum_hangouts").upsert(sanitized);
      }
    } catch (e) {
      console.error("Hangouts sync exception:", e);
    }
  };
  const saveApplications = async (data: HangoutApplication[]) => {
    const prev = applications;
    setApplications(data);
    localStorage.setItem("xmum_applications", JSON.stringify(data));

    try {
      await fetch("/api/applications/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications: data })
      });
    } catch (syncErr) {
      console.warn("Local backend applications mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(a => a.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_applications").upsert(changed);
      }
    } catch (e) {
      console.error("Applications sync exception:", e);
    }
  };
  const saveLikes = async (data: HangoutLike[]) => {
    const prev = likes;
    setLikes(data);
    localStorage.setItem("xmum_likes", JSON.stringify(data));

    try {
      await fetch("/api/likes/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes: data })
      });
    } catch (syncErr) {
      console.warn("Local backend likes mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(l => l.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_likes").upsert(changed);
      }
    } catch (e) {
      console.error("Likes sync exception:", e);
    }
  };
  const saveComments = async (data: HangoutComment[]) => {
    const prev = comments;
    setComments(data);
    localStorage.setItem("xmum_comments", JSON.stringify(data));

    try {
      await fetch("/api/comments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: data })
      });
    } catch (syncErr) {
      console.warn("Local backend comments mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(c => c.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        const sanitized = changed.map(item => sanitizeComment(item));
        await supabase.from("xmum_comments").upsert(sanitized);
      }
    } catch (e) {
      console.error("Comments sync exception:", e);
    }
  };
  const saveReports = async (data: Report[]) => {
    const prev = reports;
    setReports(data);
    localStorage.setItem("xmum_reports", JSON.stringify(data));

    try {
      await fetch("/api/reports/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: data })
      });
    } catch (syncErr) {
      console.warn("Local backend reports mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(r => r.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_reports").upsert(changed);
      }
    } catch (e) {
      console.error("Reports sync exception:", e);
    }
  };
  const saveAppeals = async (data: ReportAppeal[]) => {
    const prev = appeals;
    setAppeals(data);
    localStorage.setItem("xmum_appeals", JSON.stringify(data));

    try {
      await fetch("/api/appeals/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appeals: data })
      });
    } catch (syncErr) {
      console.warn("Local backend appeals mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(a => a.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_appeals").upsert(changed);
      }
    } catch (e) {
      console.error("Appeals sync exception:", e);
    }
  };
  const saveChats = async (data: Chat[]) => {
    const prev = chats;
    setChats(data);
    localStorage.setItem("xmum_chats", JSON.stringify(data));

    try {
      await fetch("/api/chats/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chats: data })
      });
    } catch (syncErr) {
      console.warn("Local backend chats mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(c => c.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_chats").upsert(changed);
      }
    } catch (e) {
      console.error("Chats sync exception:", e);
    }
  };
  const saveMessages = async (data: Message[]) => {
    const prev = messages;
    setMessages(data);
    
    // Encrypt messages for LocalStorage to prevent client-side plain-text inspection
    const encryptedAll = data.map(m => ({ ...m, content: encryptMessage(m.content) }));
    localStorage.setItem("xmum_messages", JSON.stringify(encryptedAll));

    try {
      await fetch("/api/messages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: encryptedAll })
      });
    } catch (syncErr) {
      console.warn("Local backend messages mirror sync failed:", syncErr);
    }
    
    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(m => m.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        // Encrypt changed rows for database row level security consistency
        const encryptedChanged = changed.map(item => ({
          ...item,
          content: encryptMessage(item.content)
        }));
        await supabase.from("xmum_messages").upsert(encryptedChanged);
      }
    } catch (e) {
      console.error("Messages sync exception:", e);
    }
  };
  const saveBlocks = async (data: Block[]) => {
    const prev = blocks;
    setBlocks(data);
    localStorage.setItem("xmum_blocks", JSON.stringify(data));

    try {
      await fetch("/api/blocks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: data })
      });
    } catch (syncErr) {
      console.warn("Local backend blocks mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(b => b.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_blocks").upsert(changed);
      }
    } catch (e) {
      console.error("Blocks sync exception:", e);
    }
  };
  const saveNotifications = async (data: AppNotification[]) => {
    const prev = notifications;
    setNotifications(data);
    localStorage.setItem("xmum_notifications", JSON.stringify(data));

    try {
      await fetch("/api/notifications/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: data })
      });
    } catch (syncErr) {
      console.warn("Local backend notifications mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(n => n.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_notifications").upsert(changed);
      }
    } catch (e) {
      console.error("Notifications sync exception:", e);
    }
  };

  // --- ACTIONS ---

  // Auth
  const signInSimulated = async (email: string, name?: string) => {
    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail.endsWith("@xmu.edu.my")) {
      return { success: false, error: "Only official Xiamen University Malaysia student emails (@xmu.edu.my) are permitted." };
    }

    try {
      console.log("Sending OTP code via Express Resend secure backend API...");
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: formattedEmail })
      });

      const resText = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Non-JSON API response from /api/auth/send-otp:", resText);
        return {
          success: false,
          error: `Server answered with an unexpected response (Status ${res.status}). Let's fallback to password authentication or try again.`
        };
      }
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed secure OTP email dispatch.",
          resend_expired: resData.resend_expired
        };
      }

      // Also create target profile skeleton upfront if they don't have one
      let profile: Profile | null = null;
      try {
        const { data } = await supabase.from("xmum_profiles").select("*").eq("email", formattedEmail).maybeSingle();
        profile = data;
      } catch (dbErr) {
        console.warn("Client-side Supabase profile fetch errored (Supabase offline/paused); resolving from local state:", dbErr);
        profile = profiles.find(p => p.email.toLowerCase() === formattedEmail) || null;
      }

      if (!profile) {
        const student_id = formattedEmail.split("@")[0];
        const newId = "user_" + Math.random().toString(36).substring(2, 11);
        const newProfile: Profile = {
          id: newId,
          email: formattedEmail,
          student_id,
          name: name?.trim() || student_id,
          name_last_changed_at: null,
          country: "Malaysia",
          country_last_changed_at: null,
          languages: ["English"],
          age: 18,
          program: XMUM_PROGRAMS[0],
          year_of_study: "Year 1",
          gender: "Male",
          student_type: "degree",
          about_me: "Hey there! I am new here on XMUM Hangouts.",
          avatar_id: "panda",
          is_profile_complete: false,
          hide_details: false,
          is_admin: formattedEmail === "mcs2509008@xmu.edu.my" || formattedEmail.startsWith("admin"),
          is_blocked_globally: false,
          flag_status: "none",
          appeal_count: 0
        };
        try {
          await supabase.from("xmum_profiles").insert([newProfile]);
        } catch (dbInsErr) {
          console.warn("Client-side Supabase skeleton insertion deferred (Supabase offline/paused):", dbInsErr);
        }
        
        // Setup local copy in the profiles array
        setProfiles(prev => [...prev, newProfile]);
        const currentLocalProfiles = JSON.parse(localStorage.getItem("xmum_profiles") || "[]");
        if (!currentLocalProfiles.some((p: any) => p.email === formattedEmail)) {
          localStorage.setItem("xmum_profiles", JSON.stringify([...currentLocalProfiles, newProfile]));
        }
      } else {
        if (profile.is_blocked_globally) {
          return { success: false, error: "Your account is permanently locked due to security reviews." };
        }
      }

      return { 
        success: true, 
        message: "Email Magic Link initiated successfully! Verify your university inbox to log in." 
      };
    } catch (e: any) {
      console.error("Supabase sign in failed:", e);
      return { success: false, error: e.message || "Failed to trigger magic link authentication." };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    const formattedEmail = email.trim().toLowerCase();
    try {
      console.log("Signing in with password...");
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: formattedEmail, password })
      });
      const resText = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Non-JSON API response from /api/auth/login-password:", resText);
        return {
          success: false,
          error: `Server answered with an unexpected response (Status ${res.status}). Let's verify details or retry again.`
        };
      }
      if (!res.ok) {
        return { success: false, error: resData.error || "Password authentication failed." };
      }

      if (resData.is_fallback) {
        localStorage.setItem("xmum_current_user_id", resData.profile.id);
        await switchUser(resData.profile.id, resData.profile);
      } else {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: resData.session.access_token,
          refresh_token: resData.session.refresh_token
        });
        if (sessionError) throw sessionError;

        localStorage.setItem("xmum_current_user_id", resData.profile.id);
        await switchUser(resData.profile.id, resData.profile);
      }

      showToast("Signed in successfully with your password!", "success");
      return { success: true };
    } catch (e: any) {
      console.error("Password auth failed:", e);
      return { success: false, error: e.message || "Failed to log in with password." };
    }
  };

  const signOutSimulated = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase signout failed:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("xmum_current_user_id");
    showToast("Signed out successfully.", "info");
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  const switchUser = async (profileId: string, providedProfile?: Profile) => {
    if (providedProfile) {
      setCurrentUser(providedProfile);
      setProfiles(prev => {
        if (!prev.some(p => p.id === providedProfile.id)) {
          return [...prev, providedProfile];
        }
        return prev;
      });
      localStorage.setItem("xmum_current_user_id", providedProfile.id);
      showToast(`Switched active session to ${providedProfile.name}`, "info");
      return;
    }

    try {
      const { data: found } = await supabase.from("xmum_profiles").select("*").eq("id", profileId).maybeSingle();
      if (found) {
        setCurrentUser(found);
        localStorage.setItem("xmum_current_user_id", found.id);
        showToast(`Switched active session to ${found.name}`, "info");
      } else {
        const fallbackLocal = profiles.find(p => p.id === profileId);
        if (fallbackLocal) {
          setCurrentUser(fallbackLocal);
          localStorage.setItem("xmum_current_user_id", fallbackLocal.id);
          showToast(`Switched active session to ${fallbackLocal.name} (Local fallback)`, "info");
        }
      }
    } catch (e) {
      const fallbackLocal = profiles.find(p => p.id === profileId);
      if (fallbackLocal) {
        setCurrentUser(fallbackLocal);
        localStorage.setItem("xmum_current_user_id", fallbackLocal.id);
        showToast(`Switched active session to ${fallbackLocal.name} (Local fallback)`, "info");
      }
    }
  };

  const createMockUser = (email: string, name: string, isAdmin = false) => {
    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail.endsWith("@xmu.edu.my")) {
      showToast("Email must end with @xmu.edu.my", "error");
      return;
    }
    const student_id = formattedEmail.split("@")[0];
    const newUser: Profile = {
      id: "user_" + Math.random().toString(36).substring(2, 11),
      email: formattedEmail,
      student_id,
      name,
      name_last_changed_at: null,
      country: "Malaysia",
      country_last_changed_at: null,
      languages: ["English"],
      age: 20,
      program: "Software Engineering",
      year_of_study: "Year 2",
      gender: "Male",
      student_type: "degree",
      about_me: "Barista by day, scholar by night. Let's study in the courtyard!",
      avatar_id: "frog",
      is_profile_complete: true,
      hide_details: false,
      is_admin: isAdmin,
      is_blocked_globally: false,
      flag_status: "none",
      appeal_count: 0
    };
    saveProfiles([...profiles, newUser]);
    showToast(`Simulated user ${name} created!`, "success");
  };

  // Profile Update
  const updateProfile = (data: Partial<Profile>) => {
    if (!currentUser) return { success: false, error: "Not logged in" };

    const original = profiles.find(p => p.id === currentUser.id);
    if (!original) return { success: false, error: "Profile not found" };

    const update: Partial<Profile> = { ...data };
    
    // Safety check: Name / Country 14-day edit cooldown validation
    const now = new Date().getTime();
    const cooldownPeriod = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

    // If changing name
    if (data.name && data.name !== original.name) {
      if (original.name_last_changed_at) {
        const lastChanged = new Date(original.name_last_changed_at).getTime();
        if (now - lastChanged < cooldownPeriod) {
          const daysLeft = Math.ceil((cooldownPeriod - (now - lastChanged)) / (1000 * 60 * 60 * 24));
          return { success: false, error: `Name cannot be changed. You must wait ${daysLeft} more day(s).` };
        }
      }
      update.name_last_changed_at = new Date().toISOString();
    }

    // If changing country
    if (data.country && data.country !== original.country) {
      if (original.country_last_changed_at) {
        const lastChanged = new Date(original.country_last_changed_at).getTime();
        if (now - lastChanged < cooldownPeriod) {
          const daysLeft = Math.ceil((cooldownPeriod - (now - lastChanged)) / (1000 * 60 * 60 * 24));
          return { success: false, error: `Country cannot be changed. You must wait ${daysLeft} more day(s).` };
        }
      }
      update.country_last_changed_at = new Date().toISOString();
    }

    // Email and student_id are permanently locked and cannot be changed
    delete update.email;
    delete update.student_id;
    delete update.is_admin;
    delete update.is_blocked_globally;
    delete update.flag_status;
    delete update.appeal_count;

    // Build finalized profile
    const updatedUser = { ...original, ...update, is_profile_complete: true };
    
    const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
    saveProfiles(nextProfiles);
    setCurrentUser(updatedUser);
    showToast("Profile updated successfully!", "success");
    return { success: true };
  };

  const setHideDetails = (hide: boolean) => {
    if (!currentUser) return;
    const updated = { ...currentUser, hide_details: hide };
    saveProfiles(profiles.map(p => p.id === currentUser.id ? updated : p));
    setCurrentUser(updated);
    showToast(hide ? "Profile details hidden from public." : "Profile details visible to public.", "info");
  };

  // Hangouts
  const createHangout = (data: Omit<Hangout, "id" | "creator_id" | "status" | "created_at" | "updated_at">) => {
    if (!currentUser) return { success: false, error: "Please sign in to post a hangout." };
    if (!currentUser.is_profile_complete) return { success: false, error: "Please complete your profile to post a hangout." };

    // Vulgarity detection
    if (containsProfanity(data.intention) || containsProfanity(data.additional_info || "") || containsProfanity(data.location) || containsProfanity(data.meeting_point)) {
      const err = "Inappropriate content detected. Please keep language clean and safe.";
      showToast(err, "error");

      // System warning to user
      localStorage.setItem("xmum_companion_anger_time", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("xmum-profanity-warned"));
      const warnNotif: AppNotification = {
        id: "warn_" + Math.random().toString(36).substring(2, 11),
        user_id: currentUser.id,
        type: "admin_message",
        payload: {
          custom_text: `⚠️ Safety Warning: You tried to type inappropriate words. Offenses are logged under Student Safety Guidelines.`
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      // Notification to admins
      const adminNotifs: AppNotification[] = profiles
        .filter(p => p.is_admin)
        .map(ad => ({
          id: "admin_alert_" + Math.random().toString(36).substring(2, 11),
          user_id: ad.id,
          type: "new_report_admin",
          payload: {
            custom_text: `🚨 Abusive Behavior: ${currentUser.name} attempted vulgar hangout plan: "${data.intention.substring(0, 30)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        }));

      saveNotifications([warnNotif, ...adminNotifs, ...notifications]);
      return { success: false, error: err };
    }

    // Rate Limit check: Max 5 hangouts per day
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const recentHangoutsCount = hangouts.filter(
      h => h.creator_id === currentUser.id && 
           (now - new Date(h.created_at).getTime()) < oneDayMs
    ).length;

    if (recentHangoutsCount >= 5) {
      const err = "Rate limit exceeded: You can only create up to 5 hangouts per day.";
      showToast(err, "error");
      return { success: false, error: err };
    }

    const newHangout: Hangout = {
      ...data,
      id: "hangout_" + Math.random().toString(36).substring(2, 11),
      creator_id: currentUser.id,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveHangouts([newHangout, ...hangouts]);
    setLastHangoutCreatedTime(now);
    showToast("Hangout plan posted successfully! Let the meetups begin.", "success");
    return { success: true };
  };

  // Likes
  const toggleLike = (hangoutId: string) => {
    if (!currentUser) {
      showToast("Please login to react to this hangout.", "error");
      return;
    }
    const existingLike = likes.find(l => l.hangout_id === hangoutId && l.user_id === currentUser.id);
    let nextLikes = [...likes];
    
    if (existingLike) {
      nextLikes = nextLikes.filter(l => l.id !== existingLike.id);
      saveLikes(nextLikes);
    } else {
      const newLike: HangoutLike = {
        id: "like_" + Math.random().toString(36).substring(2, 11),
        hangout_id: hangoutId,
        user_id: currentUser.id,
        created_at: new Date().toISOString()
      };
      nextLikes.push(newLike);
      saveLikes(nextLikes);

      // Send Notification to creator
      const targetHangout = hangouts.find(h => h.id === hangoutId);
      if (targetHangout && targetHangout.creator_id !== currentUser.id) {
        const newNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: targetHangout.creator_id,
          type: "hangout_like",
          payload: {
            hangout_id: hangoutId,
            hangout_title: targetHangout.intention.substring(0, 15) + "...",
            custom_text: `${currentUser.name} liked your hangout plan!`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([newNotif, ...notifications]);
      }
    }
  };

  const VULGAR_WORDS = [
    "fuck", "fuk", "fck", "fcuk", "fux", "fuc", "phuck",
    "shit", "shyt", "sht",
    "bitch", "bytch", "b1tch", "asshole", "bastard", "crap", "dick", "pussy", "cock",
    "wanker", "whore", "slut", "motherfucker"
  ];

  const containsProfanity = (text: string): boolean => {
    if (!text) return false;
    
    const levDist = (s1: string, s2: string): number => {
      const m = s1.length;
      const n = s2.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (s1[i - 1] === s2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + 1
            );
          }
        }
      }
      return dp[m][n];
    };

    const deobfuscate = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/[0o]/g, "o")
        .replace(/[1il!|]/g, "i")
        .replace(/[@4a]/g, "a")
        .replace(/[3e]/g, "e")
        .replace(/[$5s]/g, "s")
        .replace(/[7+t]/g, "t")
        .replace(/[uv]/g, "u")
        .replace(/[9g]/g, "g");
    };

    const checkWord = (token: string): boolean => {
      const cleanToken = deobfuscate(token.replace(/[^a-zA-Z]/g, ""));
      if (!cleanToken) return false;

      for (const vulgar of VULGAR_WORDS) {
        if (cleanToken === vulgar) return true;
        if (cleanToken.includes(vulgar)) return true;

        const maxDist = vulgar.length >= 6 ? 2 : (vulgar.length >= 4 ? 1 : 0);
        if (maxDist > 0 && Math.abs(cleanToken.length - vulgar.length) <= maxDist) {
          if (levDist(cleanToken, vulgar) <= maxDist) {
            return true;
          }
        }
      }
      return false;
    };

    const lower = text.toLowerCase();
    const fullyNormalized = deobfuscate(lower.replace(/[\s\-_.*\(\)\[\]\{\}\?\!\&\$\@\#]/g, ""));
    for (const vulgar of VULGAR_WORDS) {
      if (fullyNormalized.includes(vulgar)) return true;
      const maxDist = vulgar.length >= 6 ? 2 : (vulgar.length >= 4 ? 1 : 0);
      if (maxDist > 0 && Math.abs(fullyNormalized.length - vulgar.length) <= maxDist) {
        if (levDist(fullyNormalized, vulgar) <= maxDist) {
          return true;
        }
      }
    }

    const words = text.split(/[\s\-_.*\(\)\[\]\{\}\?\!\&\$\@\#,\.;:]+/);
    for (const token of words) {
      if (checkWord(token)) {
        return true;
      }
    }

    return false;
  };

  const toggleCommentLike = (commentId: string) => {
    if (!currentUser) {
      showToast("Please log in to react.", "error");
      return;
    }
    const exists = commentLikes.some(l => l.comment_id === commentId && l.user_id === currentUser.id);
    let nextLikes = [];
    if (exists) {
      nextLikes = commentLikes.filter(l => !(l.comment_id === commentId && l.user_id === currentUser.id));
    } else {
      nextLikes = [...commentLikes, { comment_id: commentId, user_id: currentUser.id }];

      // Trigger notification and custom event for companion
      const commentObj = comments.find(c => c.id === commentId);
      if (commentObj && commentObj.user_id !== currentUser.id) {
        // Send a notification to the commenter
        const loveNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: commentObj.user_id,
          type: "comment_reply",
          payload: {
            hangout_id: commentObj.hangout_id,
            comment_id: commentId,
            custom_text: `💖 ${currentUser.name} loved your comment: "${commentObj.content.substring(0, 20)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([loveNotif, ...notifications]);
      }
    }
    setCommentLikes(nextLikes);
    localStorage.setItem("xmum_comment_likes", JSON.stringify(nextLikes));
  };

  // Comments
  const addComment = (hangoutId: string, content: string, parentCommentId: string | null = null) => {
    if (!currentUser) return { success: false, error: "Please log in to leave a comment." };
    if (!currentUser.is_profile_complete) return { success: false, error: "Please complete your profile first." };
    if (!content.trim()) return { success: false, error: "Comment cannot be empty." };

    // Vulgarity detection
    if (containsProfanity(content)) {
      const err = "Inappropriate content detected. Please keep dialogues polite.";
      showToast(err, "error");

      // System warning to user
      localStorage.setItem("xmum_companion_anger_time", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("xmum-profanity-warned"));
      const warnNotif: AppNotification = {
        id: "warn_" + Math.random().toString(36).substring(2, 11),
        user_id: currentUser.id,
        type: "admin_message",
        payload: {
          custom_text: `⚠️ Safety Warning: You tried to type inappropriate words. Offenses are logged under Student Safety Guidelines.`
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      // Notification to admins
      const adminNotifs: AppNotification[] = profiles
        .filter(p => p.is_admin)
        .map(ad => ({
          id: "admin_alert_" + Math.random().toString(36).substring(2, 11),
          user_id: ad.id,
          type: "new_report_admin",
          payload: {
            custom_text: `🚨 Abusive Behavior: ${currentUser.name} attempted vulgar comment: "${content.substring(0, 30)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        }));

      saveNotifications([warnNotif, ...adminNotifs, ...notifications]);
      return { success: false, error: err };
    }

    // Rate Limit check for comments: Max 1 comment every 10 seconds
    const now = new Date().getTime();
    if (now - lastCommentCreatedTime < 10000) {
      const secondsLeft = Math.ceil((10000 - (now - lastCommentCreatedTime)) / 1000);
      const err = `Rate limit: Please wait ${secondsLeft} second(s) before posting another comment.`;
      showToast(err, "error");
      return { success: false, error: err };
    }

    const newComment: HangoutComment = {
      id: "comment_" + Math.random().toString(36).substring(2, 11),
      hangout_id: hangoutId,
      user_id: currentUser.id,
      parent_comment_id: parentCommentId,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    saveComments([...comments, newComment]);
    setLastCommentCreatedTime(now);

    // Notify hangout creator or parent commenter
    const targetHangout = hangouts.find(h => h.id === hangoutId);
    if (targetHangout) {
      const notifyUserId = parentCommentId 
        ? comments.find(c => c.id === parentCommentId)?.user_id 
        : targetHangout.creator_id;

      if (notifyUserId && notifyUserId !== currentUser.id) {
        const newNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: notifyUserId,
          type: parentCommentId ? "comment_reply" : "comment_reply", // Reuse comment_reply type
          payload: {
            hangout_id: hangoutId,
            comment_id: newComment.id,
            custom_text: `${currentUser.name} left a comment on your post: "${content.substring(0, 20)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([newNotif, ...notifications]);
      }
    }

    showToast("Comment added successfully!", "success");
    return { success: true };
  };

  // Applications
  const applyToHangout = (hangoutId: string, isAnonymous: boolean) => {
    if (!currentUser) return { success: false, error: "Please log in to apply." };
    if (!currentUser.is_profile_complete) return { success: false, error: "Please complete your profile to apply." };

    const targetHangout = hangouts.find(h => h.id === hangoutId);
    if (!targetHangout) return { success: false, error: "Hangout not found." };

    // Check Eligibility
    const { eligible, reasons } = isEligibleForHangout(currentUser, targetHangout);
    if (!eligible) {
      return { success: false, error: `Ineligible: ${reasons.join(", ")}` };
    }

    // Check if block exists either way
    const hasBlock = blocks.some(b => 
      (b.blocker_id === currentUser.id && b.blocked_id === targetHangout.creator_id) ||
      (b.blocker_id === targetHangout.creator_id && b.blocked_id === currentUser.id)
    );
    if (hasBlock) {
      return { success: false, error: "Cannot apply to hangouts of a blocked student." };
    }

    // Check existing application
    const existingApp = applications.find(a => a.hangout_id === hangoutId && a.applicant_id === currentUser.id && a.status !== "retracted");
    if (existingApp) {
      return { success: false, error: "You have already applied to this hangout." };
    }

    const newApp: HangoutApplication = {
      id: "app_" + Math.random().toString(36).substring(2, 11),
      hangout_id: hangoutId,
      applicant_id: currentUser.id,
      is_anonymous: isAnonymous,
      status: "pending",
      rejection_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveApplications([...applications, newApp]);

    // Send notification to hangout creator
    const newNotif: AppNotification = {
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: targetHangout.creator_id,
      type: "new_application",
      payload: {
        hangout_id: hangoutId,
        custom_text: `${isAnonymous ? "An anonymous student" : currentUser.name} requested to join: "I want to ${targetHangout.intention.substring(0, 20)}..."`
      },
      is_read: false,
      created_at: new Date().toISOString()
    };
    saveNotifications([newNotif, ...notifications]);

    showToast("Request to join submitted! Planner approval required.", "success");
    return { success: true };
  };

  const retractApplication = (applicationId: string) => {
    const updated = applications.map(app => {
      if (app.id === applicationId) {
        // Find hangout to notify creator
        const targetHangout = hangouts.find(h => h.id === app.hangout_id);
        if (targetHangout) {
          const newNotif: AppNotification = {
            id: "notif_" + Math.random().toString(36).substring(2, 11),
            user_id: targetHangout.creator_id,
            type: "application_rejected", // reuse or send warning
            payload: {
              hangout_id: app.hangout_id,
              custom_text: `An applicant retracted their request for: "${targetHangout.intention.substring(0, 15)}..."`
            },
            is_read: false,
            created_at: new Date().toISOString()
          };
          saveNotifications([newNotif, ...notifications]);
        }
        return { ...app, status: "retracted" as const, updated_at: new Date().toISOString() };
      }
      return app;
    });

    saveApplications(updated);
    showToast("Application retracted.", "info");
  };

  const manageApplication = (applicationId: string, status: "accepted" | "rejected", rejectMessage?: string) => {
    const targetApp = applications.find(a => a.id === applicationId);
    if (!targetApp) return;

    const targetHangout = hangouts.find(h => h.id === targetApp.hangout_id);
    if (!targetHangout) return;

    const nextApps = applications.map(app => {
      if (app.id === applicationId) {
        return { 
          ...app, 
          status, 
          rejection_message: status === "rejected" ? (rejectMessage || "The planner has decided not to accept your application for this hangout.") : null,
          updated_at: new Date().toISOString() 
        };
      }
      return app;
    });

    saveApplications(nextApps);

    // Send status notification to applicant
    const newNotif: AppNotification = {
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: targetApp.applicant_id,
      type: status === "accepted" ? "application_accepted" : "application_rejected",
      payload: {
        hangout_id: targetApp.hangout_id,
        custom_text: status === "accepted" 
          ? `Your application to "I want to ${targetHangout.intention.substring(0, 15)}..." was ACCEPTED! Meeting point is unlocked.` 
          : `Your application to "I want to ${targetHangout.intention.substring(0, 15)}..." was declined. "${rejectMessage || 'No message provided.'}"`
      },
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    // Create chat on accept
    if (status === "accepted") {
      try {
        const activeChat = getOrCreateChat(targetApp.applicant_id, targetApp.hangout_id);
        const autoMsg: Message = {
          id: "msg_" + Math.random().toString(36).substring(2, 11),
          chat_id: activeChat.id,
          sender_id: targetHangout.creator_id,
          content: `Your request was approved! Let's meet at "${targetHangout.meeting_point}" on ${new Date(targetHangout.event_datetime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}!`,
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveMessages([...messages, autoMsg]);
      } catch (err) {
        console.error("Error creating chat upon approval:", err);
      }
    }

    saveNotifications([newNotif, ...notifications]);

    showToast(`Application successfully ${status}!`, "success");
  };

  // Chats
  const getOrCreateChat = (otherUserId: string, hangoutId: string | null = null) => {
    if (!currentUser) throw new Error("Must be logged in.");

    // Unique constraint: check if there's already a chat between these two
    let activeChat = chats.find(
      c => (c.user_a_id === currentUser.id && c.user_b_id === otherUserId) ||
           (c.user_a_id === otherUserId && c.user_b_id === currentUser.id)
    );

    if (!activeChat) {
      activeChat = {
        id: "chat_" + Math.random().toString(36).substring(2, 11),
        user_a_id: currentUser.id,
        user_b_id: otherUserId,
        hangout_id: hangoutId,
        created_at: new Date().toISOString()
      };
      saveChats([...chats, activeChat]);
    }
    return activeChat;
  };

  const sendChatMessage = (chatId: string, content: string) => {
    if (!currentUser) return;
    const activeChat = chats.find(c => c.id === chatId);
    if (!activeChat) return;

    // Check if either blocker/blocked exists
    const otherUserId = activeChat.user_a_id === currentUser.id ? activeChat.user_b_id : activeChat.user_a_id;
    const isBlocked = blocks. some(b => 
      (b.blocker_id === currentUser.id && b.blocked_id === otherUserId) ||
      (b.blocker_id === otherUserId && b.blocked_id === currentUser.id)
    );

    if (isBlocked) {
      showToast("Cannot message. You have blocked this user or they have blocked you.", "error");
      return;
    }

    const newMsg: Message = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      chat_id: chatId,
      sender_id: currentUser.id,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    };

    saveMessages([...messages, newMsg]);

    // Send silent unread notif updates
    // In low-fidelity/high-fidelity client side we just trigger updates
  };

  const markChatAsRead = (chatId: string) => {
    if (!currentUser) return;
    let changed = false;
    const updatedMsgs = messages.map(msg => {
      if (msg.chat_id === chatId && msg.sender_id !== currentUser.id && !msg.is_read) {
        changed = true;
        return { ...msg, is_read: true };
      }
      return msg;
    });
    if (changed) {
      saveMessages(updatedMsgs);
    }
  };

  // Block/Unblock
  const toggleBlockUser = (otherUserId: string) => {
    if (!currentUser) return;
    const existingBlock = blocks.find(b => b.blocker_id === currentUser.id && b.blocked_id === otherUserId);
    if (existingBlock) {
      // Unblock
      saveBlocks(blocks.filter(b => b.id !== existingBlock.id));
      showToast("User unblocked.", "info");
    } else {
      // Block
      const newBlock: Block = {
        id: "block_" + Math.random().toString(36).substring(2, 11),
        blocker_id: currentUser.id,
        blocked_id: otherUserId,
        created_at: new Date().toISOString()
      };
      saveBlocks([...blocks, newBlock]);

      // Remove any pending applications between them both
      saveApplications(applications.map(app => {
        const creatorId = hangouts.find(h => h.id === app.hangout_id)?.creator_id;
        if (
          (app.applicant_id === currentUser.id && creatorId === otherUserId) ||
          (app.applicant_id === otherUserId && creatorId === currentUser.id)
        ) {
          return { ...app, status: "retracted" as const };
        }
        return app;
      }));

      showToast("User blocked. They can no longer see your hangouts or send you messages.", "info");
    }
  };

  // Reports & Appeals
  const submitReport = (reportedUserId: string, description: string) => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!description.trim()) return { success: false, error: "Description is mandatory." };

    const newReport: Report = {
      id: "report_" + Math.random().toString(36).substring(2, 11),
      reporter_id: currentUser.id,
      reported_user_id: reportedUserId,
      description: description.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
      reviewed_at: null
    };

    saveReports([...reports, newReport]);

    // Send notification to all admin profiles
    const adminProfiles = profiles.filter(p => p.is_admin);
    const newNotifs: AppNotification[] = adminProfiles.map(adm => ({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: adm.id,
      type: "new_report_admin",
      payload: {
        report_id: newReport.id,
        reporter_name: currentUser.name,
        custom_text: `New report submitted by ${currentUser.name} against profile target.`
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));

    saveNotifications([...newNotifs, ...notifications]);
    showToast("Safety report filed. Our administration team takes safety seriously and will review this within 24 hours.", "success");
    return { success: true };
  };

  const submitAppeal = (reportId: string, description: string) => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!description.trim()) return { success: false, error: "Appeal description cannot be empty." };

    const currentAppealCount = currentUser.appeal_count;
    if (currentAppealCount >= 5) {
      return { success: false, error: "You have exceeded your maximum allowed 5 safety appeals." };
    }

    const newAppeal: ReportAppeal = {
      id: "appeal_" + Math.random().toString(36).substring(2, 11),
      report_id: reportId,
      appeal_description: description.trim(),
      status: "pending",
      rejection_reason: null,
      appeal_number: currentAppealCount + 1,
      created_at: new Date().toISOString(),
      reviewed_at: null
    };

    // Increment appeal count on user profile
    const updatedUser = { ...currentUser, appeal_count: currentAppealCount + 1 };
    saveProfiles(profiles.map(p => p.id === currentUser.id ? updatedUser : p));
    setCurrentUser(updatedUser);

    saveAppeals([...appeals, newAppeal]);

    // Send notifications to admins
    const adminProfiles = profiles.filter(p => p.is_admin);
    const newNotifs: AppNotification[] = adminProfiles.map(adm => ({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: adm.id,
      type: "new_report_admin",
      payload: {
        report_id: reportId,
        custom_text: `Safety ban appeal #${currentAppealCount + 1} filed by ${currentUser.name}`
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));
    saveNotifications([...newNotifs, ...notifications]);

    showToast("Safety appeal filed successfully! Admins will review.", "success");
    return { success: true };
  };

  // Admin Actions
  const adminReviewReport = (reportId: string, action: "approved" | "rejected") => {
    const reportItem = reports.find(r => r.id === reportId);
    if (!reportItem) return;

    const nextReports = reports.map(r => {
      if (r.id === reportId) {
        return { ...r, status: action, reviewed_at: new Date().toISOString() };
      }
      return r;
    });
    saveReports(nextReports);

    if (action === "approved") {
      // Flag the reported user as "potentially_unsafe"
      const reportedProfile = profiles.find(p => p.id === reportItem.reported_user_id);
      if (reportedProfile) {
        const updatedProfile: Profile = {
          ...reportedProfile,
          flag_status: "potentially_unsafe"
        };
        saveProfiles(profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p));

        // Create a safety notification for reported user
        const warnNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: reportedProfile.id,
          type: "report_approved",
          payload: {
            custom_text: "⚠️ Your profile has been flagged as POTENTIALLY UNSAFE following safety reviews. You may appeal this assessment below."
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([warnNotif, ...notifications]);
      }
    }

    showToast(`Report successfully marked as ${action}!`, "success");
  };

  const adminReviewAppeal = (appealId: string, action: "approved" | "rejected", reason?: string) => {
    const appealItem = appeals.find(a => a.id === appealId);
    if (!appealItem) return;

    const nextAppeals = appeals.map(a => {
      if (a.id === appealId) {
        return { 
          ...a, 
          status: action, 
          rejection_reason: action === "rejected" ? (reason || "Appeal failed to address basic safety guidelines.") : null,
          reviewed_at: new Date().toISOString() 
        };
      }
      return a;
    });
    saveAppeals(nextAppeals);

    // Find the report to look up the target user
    const originalReport = reports.find(r => r.id === appealItem.report_id);
    if (originalReport) {
      const targetUser = profiles.find(p => p.id === originalReport.reported_user_id);
      if (targetUser) {
        let finalFlagStatus = targetUser.flag_status;

        if (action === "approved") {
          // Reset safety flag to "none" 
          finalFlagStatus = "none";
        } else if (action === "rejected") {
          // If appeal count reaches 5, lock profile to "confirmed_unsafe" permanently!
          if (targetUser.appeal_count >= 5) {
            finalFlagStatus = "confirmed_unsafe";
          }
        }

        const updatedProfile: Profile = {
          ...targetUser,
          flag_status: finalFlagStatus
        };
        saveProfiles(profiles.map(p => p.id === targetUser.id ? updatedProfile : p));

        // Sync local auth user state if they are the one being audited
        if (currentUser && currentUser.id === targetUser.id) {
          setCurrentUser(updatedProfile);
        }

        const appealNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: targetUser.id,
          type: "report_appeal_result",
          payload: {
            custom_text: action === "approved"
              ? "Your safety appeal was APPROVED! Your status has been lowered to none."
              : `Your appeal was declined. Reason: "${reason || 'No details provided'}" (${targetUser.appeal_count}/5 appeals used).`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([appealNotif, ...notifications]);
      }
    }

    showToast(`Appeal review complete: marked as ${action}.`, "success");
  };

  // Eligibility and Restriction checks
  const isEligibleForHangout = (profile: Profile, hangout: Hangout): { eligible: boolean; reasons: string[] } => {
    const r = hangout.restrictions;
    const reasons: string[] = [];

    // Country match
    if (r.countries && r.countries.length > 0 && !r.countries.includes(profile.country)) {
      reasons.push(`Mandatory Countries list: [${r.countries.join(", ")}]; your profile lists "${profile.country}"`);
    }

    // Languages match: check if user shares at least one required language
    if (r.languages && r.languages.length > 0) {
      const sharesLanguage = r.languages.some(lang => profile.languages.includes(lang));
      if (!sharesLanguage) {
        reasons.push(`Mandatory Spoken language(s): [${r.languages.join(", ")}]; your profile does not share these languages`);
      }
    }

    // Program match
    if (r.programs && r.programs.length > 0 && !r.programs.includes(profile.program)) {
      reasons.push(`Mandatory Academic Program(s): [${r.programs.join(", ")}]; your profile lists "${profile.program}"`);
    }

    // Year of Study match
    if (r.years && r.years.length > 0 && !r.years.includes(profile.year_of_study)) {
      reasons.push(`Mandatory Academic Year(s): [${r.years.join(", ")}]; your profile lists "${profile.year_of_study}"`);
    }

    // Student Type match
    if (r.student_types && r.student_types.length > 0 && !r.student_types.includes(profile.student_type)) {
      reasons.push(`Mandatory Student Type: [${r.student_types.join(", ")}]; your profile lists "${profile.student_type}"`);
    }

    // Age bound
    if (r.age_min !== null && profile.age < r.age_min) {
      reasons.push(`Age is below specified minimum of ${r.age_min} years old (you are ${profile.age})`);
    }
    if (r.age_max !== null && profile.age > r.age_max) {
      reasons.push(`Age is above specified maximum of ${r.age_max} years old (you are ${profile.age})`);
    }

    // Gender match
    if (r.genders && r.genders.length > 0 && !r.genders.includes(profile.gender)) {
      reasons.push(`Gender target mismatch: [${r.genders.join(", ")}]; your profile lists "${profile.gender}"`);
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  };

  // Helper automated cron checker which simulates daily pg_cron behavior to expire items
  const triggerCronJobs = () => {
    // Expiry: status = 'expired' where event_datetime has passed by more than 1 day
    const nowStamp = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let expiredAny = false;
    const nextHangouts = hangouts.map(h => {
      const eventTime = new Date(h.event_datetime).getTime();
      if (h.status === "active" && eventTime < (nowStamp - oneDayMs)) {
        expiredAny = true;
        return { ...h, status: "expired" as const };
      }
      return h;
    });

    if (expiredAny) {
      saveHangouts(nextHangouts);
    }

    // Generate upcoming_hangout_reminder: Find hangouts starting within next 2 hours
    const twoHoursMs = 2 * 60 * 60 * 1000;
    let createdReminders = false;

    // Check hangouts scheduled in next 2 hours 
    hangouts.forEach(h => {
      const eventTime = new Date(h.event_datetime).getTime();
      if (h.status === "active" && eventTime > nowStamp && eventTime < (nowStamp + twoHoursMs)) {
        // Find if we already generated a reminder today
        const hasReminder = notifications.some(
          n => n.type === "upcoming_hangout_reminder" && n.payload.hangout_id === h.id
        );

        if (!hasReminder) {
          createdReminders = true;
          // Notify creator
          const notifCreator: AppNotification = {
            id: "notif_cron_c_" + Math.random().toString(36).substring(2, 7),
            user_id: h.creator_id,
            type: "upcoming_hangout_reminder" as const,
            payload: {
              hangout_id: h.id,
              custom_text: `🕒 Upcoming Hangout Reminder! Your hangout "I want to ${h.intention.substring(0, 15)}..." begins in less than 2 hours.`
            },
            is_read: false,
            created_at: new Date().toISOString()
          };

          // Notify accepted applicants
          const acceptedApplicants = applications.filter(a => a.hangout_id === h.id && a.status === "accepted");
          const applicantNotifs: AppNotification[] = acceptedApplicants.map(app => ({
            id: "notif_cron_a_" + Math.random().toString(36).substring(2, 7),
            user_id: app.applicant_id,
            type: "upcoming_hangout_reminder" as const,
            payload: {
              hangout_id: h.id,
              custom_text: `🕒 Hangout starting soon! "${h.intention.substring(0, 20)}..." scheduled in less than 2 hours.`
            },
            is_read: false,
            created_at: new Date().toISOString()
          }));

          saveNotifications([notifCreator, ...applicantNotifs, ...notifications]);
        }
      }
    });

    showToast("Background safety cron verified: successfully scanned for expiries & reminders.", "info");
  };

  const clearNotification = (id: string) => {
    saveNotifications(notifications.filter(n => n.id !== id));
  };

  const markNotificationsAsRead = () => {
    if (!currentUser) return;
    let changed = false;
    const updated = notifications.map(n => {
      if (n.user_id === currentUser.id && !n.is_read) {
        changed = true;
        return { ...n, is_read: true };
      }
      return n;
    });
    if (changed) {
      saveNotifications(updated);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        profiles,
        hangouts,
        applications,
        likes,
        comments,
        reports,
        appeals,
        chats,
        messages,
        blocks,
        notifications,
        
        signInSimulated,
        signInWithPassword,
        signOutSimulated,
        completeOnboarding,
        switchUser,
        createMockUser,

        updateProfile,
        setHideDetails,
        
        createHangout,
        toggleLike,
        addComment,
        
        applyToHangout,
        retractApplication,
        manageApplication,
        
        getOrCreateChat,
        sendChatMessage,
        markChatAsRead,

        toggleBlockUser,
        submitReport,
        submitAppeal,
        
        adminReviewReport,
        adminReviewAppeal,

        isEligibleForHangout,
        triggerCronJobs,
        clearNotification,
        markNotificationsAsRead,

        onboardingStep,
        setOnboardingStep,
        showOnboarding,
        setShowOnboarding,

        toast,
        showToast,
        clearToast,

        viewedProfile,
        setViewedProfile,

        commentLikes,
        toggleCommentLike
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
