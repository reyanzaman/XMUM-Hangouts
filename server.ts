import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { hashPassword, isModernPasswordHash, matchesStoredPassword } from "./src/lib/security";
import { collapseProfilesByEmail, normalizeProfileEmail, pickCanonicalProfile } from "./src/lib/profiles";
import { generateOtpCode, hashOtpCode, isXmumEmail, matchesOtpCode, OTP_TTL_MS, validatePassword } from "./src/server/auth-security";
import {
  dispatchPushNotifications,
  getVapidPublicKey,
  isPushConfigured,
  processScheduledReminders,
  removePushSubscription,
  savePushSubscription
} from "./src/server/push-service";

// Load environment variables
dotenv.config();

// Initialize Supabase Client for backend operation (SignUp / SignIn)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bssljvoorzotsiskhpcl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
const backendProfileClient = supabaseAdmin || supabase;

const sanitizeProfileForClient = <T extends Record<string, any>>(profile: T) => {
  const { password, ...safeProfile } = profile;
  return {
    ...safeProfile,
    password_hash: profile.password_hash ? "configured" : null
  };
};

const PORT = 3000;
const ADMIN_ACCOUNT_EMAIL = normalizeProfileEmail(process.env.ADMIN_ACCOUNT_EMAIL || "");
const RUNTIME_DATA_DIR = path.join(process.cwd(), ".runtime-data");
const SYSTEM_DELETED_USER_ID = "deleted_user";
const SYSTEM_DELETED_USER_EMAIL = "deleted.user@system.local";

function isConfiguredAdminEmail(email: string) {
  return normalizeProfileEmail(email) === ADMIN_ACCOUNT_EMAIL;
}

function ensureRuntimeDataDir() {
  if (!fs.existsSync(RUNTIME_DATA_DIR)) {
    fs.mkdirSync(RUNTIME_DATA_DIR, { recursive: true });
  }
}

function getRuntimeDataFile(fileName: string) {
  return path.join(RUNTIME_DATA_DIR, fileName);
}

function getLegacyDataFile(fileName: string) {
  return path.join(process.cwd(), fileName);
}

function getLocalAuthSecret() {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "xmum-local-dev-secret-change-me" : "");

  if (!secret) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return secret;
}

function isLocalhostHost(host: string) {
  return host.includes("localhost") || host.includes("127.0.0.1");
}

function getRequestOrigin(req: express.Request) {
  const host = req.get("host") || `localhost:${PORT}`;
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto || (isLocalhostHost(host) ? "http" : "https");
  return `${protocol}://${host}`;
}

function getConfiguredAppOrigin() {
  const rawValue = (process.env.APP_URL || "").trim();
  if (!rawValue) return "";

  try {
    const parsed = new URL(rawValue);
    if (process.env.NODE_ENV === "production" && isLocalhostHost(parsed.host)) {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

function escapeSupabaseLikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function resolveAppUrl(req: express.Request) {
  return getConfiguredAppOrigin() || getRequestOrigin(req);
}

function setCors(
  req: express.Request,
  res: express.Response,
  methods = "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  headers = "Authorization, X-Local-Auth, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
) {
  const requestOrigin = getRequestOrigin(req);
  const configuredOrigin = getConfiguredAppOrigin();
  const originHeader = req.get("origin") || "";
  const allowedOrigins = new Set([requestOrigin, configuredOrigin].filter(Boolean));
  const allowedOrigin = originHeader && allowedOrigins.has(originHeader) ? originHeader : requestOrigin;

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", headers);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

const passwordLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function consumePasswordLoginAttempt(req: express.Request, email: string) {
  const key = `${req.ip || "unknown"}:${email}`;
  const now = Date.now();
  const current = passwordLoginAttempts.get(key);
  const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + 15 * 60_000 } : { ...current, count: current.count + 1 };
  passwordLoginAttempts.set(key, next);
  return { allowed: next.count <= 8, key, retryAfterSeconds: Math.max(1, Math.ceil((next.resetAt - now) / 1000)) };
}

function readDataFile(fileName: string): any[] {
  const runtimeFile = getRuntimeDataFile(fileName);
  const legacyFile = getLegacyDataFile(fileName);
  const candidate = fs.existsSync(runtimeFile) ? runtimeFile : legacyFile;

  try {
    if (fs.existsSync(candidate)) {
      const data = fs.readFileSync(candidate, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Failed to read local data from ${candidate}:`, err);
  }

  return [];
}

function getLocalProfiles(): any[] {
  return readDataFile("local_profiles.json");
}

function saveLocalProfiles(profiles: any[]) {
  try {
    ensureRuntimeDataDir();
    fs.writeFileSync(getRuntimeDataFile("local_profiles.json"), JSON.stringify(profiles, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local profiles:", err);
  }
}

// Backup file pathways for other tables
const LOCAL_HANGOUTS_FILE = "local_hangouts.json";
const LOCAL_COMMENTS_FILE = "local_comments.json";
const LOCAL_APPLICATIONS_FILE = "local_applications.json";
const LOCAL_LIKES_FILE = "local_likes.json";
const LOCAL_CHATS_FILE = "local_chats.json";
const LOCAL_MESSAGES_FILE = "local_messages.json";
const LOCAL_REPORTS_FILE = "local_reports.json";
const LOCAL_APPEALS_FILE = "local_appeals.json";
const LOCAL_BLOCKS_FILE = "local_blocks.json";
const LOCAL_NOTIFICATIONS_FILE = "local_notifications.json";

function getLocalData(filePath: string): any[] {
  return readDataFile(filePath);
}

function saveLocalData(filePath: string, data: any[]) {
  try {
    ensureRuntimeDataDir();
    fs.writeFileSync(getRuntimeDataFile(filePath), JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to write local data to ${filePath}:`, err);
  }
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary || []) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of primary || []) {
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function sanitizeBlocks(rows: any[]) {
  const latestByPair = new Map<string, any>();

  for (const block of rows || []) {
    if (!block?.id || !block?.blocker_id || !block?.blocked_id) continue;
    if (block.blocker_id === block.blocked_id) continue;

    latestByPair.set(`${block.blocker_id}::${block.blocked_id}`, block);
  }

  return Array.from(latestByPair.values());
}

const LOCKED_MEETING_POINT_MARKERS = [
  "apply and get accepted to unlock",
  "visible after the host approves your request"
];

function isLockedMeetingPointPlaceholder(value: unknown) {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  return LOCKED_MEETING_POINT_MARKERS.some(marker => normalizedValue.includes(marker));
}

function sanitizeHangoutRestrictions(restrictions: any) {
  const source = restrictions && typeof restrictions === "object" ? restrictions : {};
  const toArray = (value: unknown) => (Array.isArray(value) ? value.filter(item => typeof item === "string") : []);
  const toNullableNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    countries: toArray(source.countries),
    languages: toArray(source.languages),
    programs: toArray(source.programs),
    years: toArray(source.years),
    student_types: toArray(source.student_types),
    age_min: toNullableNumber(source.age_min),
    age_max: toNullableNumber(source.age_max),
    genders: toArray(source.genders)
  };
}

function sanitizeHangoutForDatabase(hangout: any) {
  return {
    id: hangout.id,
    creator_id: hangout.creator_id,
    intention: typeof hangout.intention === "string" ? hangout.intention.trim() : "",
    location: typeof hangout.location === "string" ? hangout.location.trim() : "",
    event_datetime: hangout.event_datetime,
    meeting_point: typeof hangout.meeting_point === "string" ? hangout.meeting_point.trim() : "",
    additional_info: typeof hangout.additional_info === "string" ? hangout.additional_info.trim() : "",
    max_participants:
      hangout.max_participants === null || hangout.max_participants === undefined || hangout.max_participants === ""
        ? null
        : Number(hangout.max_participants),
    restrictions: sanitizeHangoutRestrictions(hangout.restrictions),
    status: hangout.status,
    created_at: hangout.created_at,
    updated_at: hangout.updated_at,
    is_anonymous: Boolean(hangout.is_anonymous)
  };
}

function sanitizeCommentForDatabase(comment: any) {
  const row: Record<string, any> = {
    id: comment.id,
    hangout_id: comment.hangout_id,
    user_id: comment.user_id,
    parent_comment_id: comment.parent_comment_id || null,
    content: comment.content,
    created_at: comment.created_at
  };

  if (commentColumnSupport.is_anonymous) {
    row.is_anonymous = Boolean(comment.is_anonymous);
  };

  return row;
}

async function prepareHangoutRowsForPersistence(rows: any[]) {
  const sanitizedRows = rows.map(sanitizeHangoutForDatabase).filter(row => row?.id);
  if (!supabaseAdmin || sanitizedRows.length === 0) {
    return sanitizedRows;
  }

  const ids = Array.from(new Set(sanitizedRows.map(row => row.id).filter(Boolean)));
  const existingById = new Map<string, any>();
  const chunkSize = 100;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const { data, error } = await supabaseAdmin.from("xmum_hangouts").select("*").in("id", chunk);
    if (error) {
      throw error;
    }

    for (const row of data || []) {
      if (row?.id) {
        existingById.set(row.id, row);
      }
    }
  }

  return sanitizedRows.map(row => {
    const existing = existingById.get(row.id);
    const existingMeetingPoint = typeof existing?.meeting_point === "string" ? existing.meeting_point.trim() : "";
    const needsPreservedMeetingPoint = !row.meeting_point || isLockedMeetingPointPlaceholder(row.meeting_point);

    if (
      needsPreservedMeetingPoint &&
      existingMeetingPoint &&
      !isLockedMeetingPointPlaceholder(existingMeetingPoint)
    ) {
      return {
        ...row,
        meeting_point: existingMeetingPoint
      };
    }

    return row;
  });
}

function buildDeletedUserProfile() {
  return {
    id: SYSTEM_DELETED_USER_ID,
    email: SYSTEM_DELETED_USER_EMAIL,
    student_id: "deleted.user",
    name: "Deleted User",
    name_last_changed_at: null,
    country: "Malaysia",
    country_last_changed_at: null,
    languages: [],
    age: 0,
    birthdate: null,
    program: "Not Specified",
    year_of_study: "Not Specified",
    gender: "Prefer not to say",
    gender_last_changed_at: null,
    student_type: "Not Specified",
    about_me: "This account has been removed.",
    avatar_id: "owl",
    is_profile_complete: true,
    hide_details: true,
    is_admin: false,
    is_blocked_globally: false,
    flag_status: "none",
    appeal_count: 0,
    companion_pet_count: 0,
    companion_selected_state_id: null,
    is_demo_profile: false
  };
}

function sanitizeProfileForDatabase(profile: any) {
  return stripUnsupportedColumnsFromProfileRow({
    id: profile.id,
    email: profile.email,
    student_id: profile.student_id,
    name: profile.name,
    name_last_changed_at: profile.name_last_changed_at ?? null,
    country: profile.country,
    country_last_changed_at: profile.country_last_changed_at ?? null,
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    age: profile.age,
    birthdate: profile.birthdate ?? null,
    program: profile.program,
    year_of_study: profile.year_of_study,
    gender: profile.gender,
    gender_last_changed_at: profile.gender_last_changed_at ?? null,
    student_type: profile.student_type,
    about_me: profile.about_me,
    avatar_id: profile.avatar_id,
    is_profile_complete: Boolean(profile.is_profile_complete),
    hide_details: Boolean(profile.hide_details),
    is_admin: Boolean(profile.is_admin),
    is_blocked_globally: Boolean(profile.is_blocked_globally),
    flag_status: profile.flag_status,
    appeal_count: profile.appeal_count ?? 0,
    companion_pet_count: Math.max(0, Number(profile.companion_pet_count || 0)),
    companion_selected_state_id: profile.companion_selected_state_id ?? null,
    password_hash: profile.password_hash ?? null
  });
}

function isMissingPasswordHashColumnError(error: unknown) {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes("password_hash") && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
}

function isMissingProfileColumnError(error: unknown, columnName: string) {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes(columnName) && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
}

function isMissingCommentColumnError(error: unknown, columnName: string) {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes(columnName) && message.includes("xmum_comments") && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
}

const profileColumnSupport = {
  birthdate: true,
  password_hash: true,
  companion_pet_count: true,
  companion_selected_state_id: true,
  gender_last_changed_at: true
};

const commentColumnSupport = {
  is_anonymous: true
};

function markUnsupportedProfileColumns(error: unknown) {
  if (isMissingProfileColumnError(error, "birthdate")) {
    profileColumnSupport.birthdate = false;
  }
  if (isMissingPasswordHashColumnError(error)) {
    profileColumnSupport.password_hash = false;
  }
  if (isMissingProfileColumnError(error, "companion_pet_count")) {
    profileColumnSupport.companion_pet_count = false;
  }
  if (isMissingProfileColumnError(error, "companion_selected_state_id")) {
    profileColumnSupport.companion_selected_state_id = false;
  }
  if (isMissingProfileColumnError(error, "gender_last_changed_at")) {
    profileColumnSupport.gender_last_changed_at = false;
  }
}

function isMissingOptionalProfileColumnError(error: unknown) {
  return (
    isMissingPasswordHashColumnError(error) ||
    isMissingProfileColumnError(error, "birthdate") ||
    isMissingProfileColumnError(error, "companion_pet_count") ||
    isMissingProfileColumnError(error, "companion_selected_state_id") ||
    isMissingProfileColumnError(error, "gender_last_changed_at")
  );
}

function markUnsupportedCommentColumns(error: unknown) {
  if (isMissingCommentColumnError(error, "is_anonymous")) {
    commentColumnSupport.is_anonymous = false;
  }
}

function getProfileSelectColumns() {
  const baseColumns = [
    "id",
    "email",
    "student_id",
    "name",
    "name_last_changed_at",
    "country",
    "country_last_changed_at",
    "languages",
    "age",
    "program",
    "year_of_study",
    "gender",
    "student_type",
    "about_me",
    "avatar_id",
    "is_profile_complete",
    "hide_details",
    "is_admin",
    "is_blocked_globally",
    "flag_status",
    "appeal_count"
  ];

  if (profileColumnSupport.birthdate) {
    baseColumns.push("birthdate");
  }
  if (profileColumnSupport.gender_last_changed_at) {
    baseColumns.push("gender_last_changed_at");
  }
  if (profileColumnSupport.companion_pet_count) {
    baseColumns.push("companion_pet_count");
  }
  if (profileColumnSupport.companion_selected_state_id) {
    baseColumns.push("companion_selected_state_id");
  }
  if (profileColumnSupport.password_hash) {
    baseColumns.push("password_hash");
  }

  return baseColumns.join(",");
}

function stripUnsupportedColumnsFromProfileRow(row: Record<string, any>) {
  const nextRow = { ...row };
  if (!profileColumnSupport.birthdate) {
    delete nextRow.birthdate;
  }
  if (!profileColumnSupport.password_hash) {
    delete nextRow.password_hash;
  }
  if (!profileColumnSupport.companion_pet_count) {
    delete nextRow.companion_pet_count;
  }
  if (!profileColumnSupport.companion_selected_state_id) {
    delete nextRow.companion_selected_state_id;
  }
  if (!profileColumnSupport.gender_last_changed_at) {
    delete nextRow.gender_last_changed_at;
  }
  return nextRow;
}

function stripUnsupportedProfileColumns(rows: Array<Record<string, any>>, error: unknown) {
  markUnsupportedProfileColumns(error);
  return rows.map(row => {
    const nextRow = stripUnsupportedColumnsFromProfileRow(row);
    if (isMissingProfileColumnError(error, "birthdate")) delete nextRow.birthdate;
    if (isMissingPasswordHashColumnError(error)) delete nextRow.password_hash;
    if (isMissingProfileColumnError(error, "companion_pet_count")) delete nextRow.companion_pet_count;
    if (isMissingProfileColumnError(error, "companion_selected_state_id")) delete nextRow.companion_selected_state_id;
    if (isMissingProfileColumnError(error, "gender_last_changed_at")) delete nextRow.gender_last_changed_at;
    return nextRow;
  });
}

async function upsertProfileWithFallback(profile: any, remoteFields: string[] = []) {
  const [preparedProfile] = await prepareProfileRowsForSupabase([profile], backendProfileClient, remoteFields);
  if (!preparedProfile) return;

  const { error } = await backendProfileClient.from("xmum_profiles").upsert([preparedProfile]);
  if (error) {
    if (isMissingOptionalProfileColumnError(error)) {
      markUnsupportedProfileColumns(error);
      const [fallbackProfile] = stripUnsupportedProfileColumns([preparedProfile], error);
      const fallback = await backendProfileClient.from("xmum_profiles").upsert([fallbackProfile]);
      if (fallback.error) {
        throw fallback.error;
      }
      return;
    }

    throw error;
  }
}

async function prepareProfileRowsForSupabase(rows: any[], client = supabaseAdmin || supabase, remoteFields: string[] = []) {
  const collapsedRows = collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase);
  const emails = Array.from(new Set(collapsedRows.map(row => normalizeProfileEmail(row.email || "")).filter(Boolean)));
  const allowedRemoteFields = new Set(remoteFields);

  if (emails.length === 0) {
    return collapsedRows;
  }

  await Promise.all(
    collapsedRows.map(row =>
      mirrorProfileToAuthUser(row).catch(error => {
        console.warn("Auth metadata mirror during profile sync failed:", error);
      })
    )
  );

  let existingProfiles: any[] = [];
  try {
    let { data, error } = await client.from("xmum_profiles").select(getProfileSelectColumns()).in("email", emails);
    if (
      error &&
      isMissingOptionalProfileColumnError(error)
    ) {
      markUnsupportedProfileColumns(error);
      ({ data, error } = await client.from("xmum_profiles").select(getProfileSelectColumns()).in("email", emails));
    }
    if (error) {
      console.warn("Existing profile lookup during sync failed:", error.message);
    } else {
      existingProfiles = data || [];
    }
  } catch (error) {
    console.warn("Existing profile reconciliation failed before sync:", error);
  }

  return collapsedRows.map(row => {
    const existing = pickCanonicalProfile(existingProfiles as any[], { email: row.email });
    if (!existing) {
      return row;
    }

    const mergedProfile = {
      ...existing,
      id: existing.id,
      email: normalizeProfileEmail(existing.email || row.email),
      is_profile_complete: allowedRemoteFields.has("is_profile_complete")
        ? Boolean(existing.is_profile_complete || row.is_profile_complete)
        : Boolean(existing.is_profile_complete)
    };

    for (const field of allowedRemoteFields) {
      if (field === "id" || field === "email") continue;
      (mergedProfile as any)[field] = row[field];
    }

    if (allowedRemoteFields.has("companion_pet_count")) {
      (mergedProfile as any).companion_pet_count = Math.max(
        Number(row.companion_pet_count || 0),
        Number(existing.companion_pet_count || 0)
      );
    }

    if (allowedRemoteFields.has("password_hash")) {
      (mergedProfile as any).password_hash = row.password_hash ?? existing.password_hash ?? null;
    }

    return sanitizeProfileForDatabase(mergedProfile);
  });
}

async function deleteRowsByIds(table: string, ids: string[]) {
  if (!supabaseAdmin || ids.length === 0) return;

  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const chunkSize = 100;
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { error } = await supabaseAdmin.from(table).delete().in("id", chunk);
    if (error) {
      throw error;
    }
  }
}

async function upsertToSupabase(table: string, rows: any[], remoteFields: string[] = []) {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side sync.");
  }
  if (rows.length === 0) return;

  const preparedRows = table === "xmum_profiles" ? await prepareProfileRowsForSupabase(rows, supabaseAdmin, remoteFields) : rows;
  const { error } = await supabaseAdmin.from(table).upsert(preparedRows);
  if (error) {
    if (
      table === "xmum_profiles" &&
      isMissingOptionalProfileColumnError(error)
    ) {
      markUnsupportedProfileColumns(error);
      const fallbackRows = stripUnsupportedProfileColumns(preparedRows, error);
      const fallback = await supabaseAdmin.from(table).upsert(fallbackRows);
      if (fallback.error) {
        throw fallback.error;
      }
      return;
    }

    if (table === "xmum_comments" && isMissingCommentColumnError(error, "is_anonymous")) {
      markUnsupportedCommentColumns(error);
      const fallbackRows = rows.map(sanitizeCommentForDatabase);
      const fallback = await supabaseAdmin.from(table).upsert(fallbackRows);
      if (fallback.error) {
        throw fallback.error;
      }
      return;
    }

    throw error;
  }
}

function findLocalProfileByEmail(email: string): any | null {
  const formatted = normalizeProfileEmail(email);
  const list = getLocalProfiles();
  return pickCanonicalProfile(list as any[], { email: formatted }) || null;
}

async function findAuthUserByEmail(email: string) {
  if (!supabaseAdmin) return null;

  const normalizedEmail = normalizeProfileEmail(email);
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.warn("Supabase auth user lookup failed:", error.message);
      return null;
    }

    const users = (data?.users || []) as Array<{ id: string; email?: string | null; user_metadata?: any; app_metadata?: any }>;
    const match = users.find(user => normalizeProfileEmail(user.email || "") === normalizedEmail);
    if (match) return match;
    if (users.length < 1000) return null;
  }

  return null;
}

function mergeProfileWithAuthMetadata(profile: any, authUser?: any | null) {
  const userMetadata = authUser?.user_metadata || {};
  const appMetadata = authUser?.app_metadata || {};
  const profileMetadata = userMetadata.xmum_profile || {};

  return {
    ...profile,
    birthdate: profile.birthdate ?? profileMetadata.birthdate ?? null,
    companion_pet_count: Math.max(
      0,
      Number(profile.companion_pet_count ?? profileMetadata.companion_pet_count ?? 0)
    ),
    companion_selected_state_id:
      profile.companion_selected_state_id ?? profileMetadata.companion_selected_state_id ?? null,
    password_hash: appMetadata.xmum_password_hash || profile.password_hash || null
  };
}

async function mirrorProfileToAuthUser(profile: any, password?: string) {
  if (!supabaseAdmin || !profile?.email) return;

  try {
    const authUser = await findAuthUserByEmail(profile.email);
    const passwordHash = profile.password_hash || (password ? hashPassword(profile.email, password) : null);
    const userMetadata = {
      ...(authUser?.user_metadata || {}),
      xmum_profile: {
        ...((authUser?.user_metadata || {}).xmum_profile || {}),
        birthdate: profile.birthdate ?? null,
        companion_pet_count: Math.max(0, Number(profile.companion_pet_count || 0)),
        companion_selected_state_id: profile.companion_selected_state_id ?? null
      }
    };
    const appMetadata = {
      ...(authUser?.app_metadata || {}),
      ...(passwordHash ? { xmum_password_hash: passwordHash } : {})
    };

    if (!authUser && password) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: normalizeProfileEmail(profile.email),
        password,
        email_confirm: true,
        user_metadata: userMetadata,
        app_metadata: appMetadata
      });
      if (created.error) {
        console.warn("Supabase auth mirror user creation failed:", created.error.message);
      }
      return;
    }

    if (!authUser) return;

    const updatePayload: any = {
      user_metadata: userMetadata,
      app_metadata: appMetadata
    };
    if (password) {
      updatePayload.password = password;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, updatePayload);
    if (error) {
      console.warn("Supabase auth mirror update failed:", error.message);
    }
  } catch (error) {
    console.warn("Supabase auth metadata mirror failed:", error);
  }
}

async function resolveBestProfileByEmail(email: string): Promise<any | null> {
  const formattedEmail = normalizeProfileEmail(email);
  const candidates: any[] = [];

  try {
    let { data, error } = await backendProfileClient.from("xmum_profiles").select(getProfileSelectColumns()).eq("email", formattedEmail);
    if (
      error &&
      isMissingOptionalProfileColumnError(error)
    ) {
      markUnsupportedProfileColumns(error);
      ({ data, error } = await backendProfileClient.from("xmum_profiles").select(getProfileSelectColumns()).eq("email", formattedEmail));
    }
    if (error) {
      console.warn("Supabase profile lookup returned an error:", error.message);
    }
    candidates.push(...(data || []));

    if (candidates.length === 0) {
      let { data: insensitiveData, error: insensitiveError } = await backendProfileClient
        .from("xmum_profiles")
        .select(getProfileSelectColumns())
        .ilike("email", escapeSupabaseLikePattern(formattedEmail));

      if (
        insensitiveError &&
        isMissingOptionalProfileColumnError(insensitiveError)
      ) {
        markUnsupportedProfileColumns(insensitiveError);
        ({ data: insensitiveData, error: insensitiveError } = await backendProfileClient
          .from("xmum_profiles")
          .select(getProfileSelectColumns())
          .ilike("email", escapeSupabaseLikePattern(formattedEmail)));
      }

      if (insensitiveError) {
        console.warn("Case-insensitive Supabase profile lookup returned an error:", insensitiveError.message);
      } else if (insensitiveData?.length) {
        candidates.push(
          ...(insensitiveData as any[]).filter(
            profile => normalizeProfileEmail(profile.email || "") === formattedEmail
          )
        );
      }
    }
  } catch (dbErr) {
    console.warn("Supabase profile lookup failed, continuing with local fallback:", dbErr);
  }

  candidates.push(...getLocalProfiles().filter((profile: any) => normalizeProfileEmail(profile.email || "") === formattedEmail));

  const profile = pickCanonicalProfile(candidates as any[], { email: formattedEmail }) || null;
  if (!profile) return null;

  const authUser = await findAuthUserByEmail(formattedEmail);
  return mergeProfileWithAuthMetadata(profile, authUser);
}

async function resolveExpressRequestIdentity(req: express.Request) {
  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (accessToken) {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!error && user?.id && user.email) {
      const email = normalizeProfileEmail(user.email);
      const profile = await resolveBestProfileByEmail(email);
      return { userId: profile?.id || user.id, email };
    }
  }

  const localAuth = verifyLocalAuthToken(
    typeof req.headers["x-local-auth"] === "string" ? req.headers["x-local-auth"] : undefined
  );
  return localAuth ? { userId: localAuth.profileId, email: localAuth.email } : null;
}

function upsertLocalProfiles(profilesToUpsert: any[]) {
  const current = getLocalProfiles();
  const updated = [...current];
  for (const item of profilesToUpsert) {
    if (!item.email) continue;
    const formattedEmail = item.email.trim().toLowerCase();
    const idx = updated.findIndex((p: any) => p.email && p.email.toLowerCase() === formattedEmail);
    if (idx !== -1) {
      updated[idx] = { ...updated[idx], ...item };
    } else {
      updated.push(item);
    }
  }
  saveLocalProfiles(updated);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateLocalAuthToken(profile: { id: string; email: string }) {
  const payload = {
    profileId: profile.id,
    email: normalizeProfileEmail(profile.email),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getLocalAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyLocalAuthToken(token: string | undefined | null) {
  if (!token || !token.includes(".")) return null;

  const [encodedPayload, providedSignature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", getLocalAuthSecret()).update(encodedPayload).digest("base64url");
  const providedSignatureBuffer = Buffer.from(providedSignature || "", "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload?.profileId || !payload?.email || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }
    return {
      profileId: String(payload.profileId),
      email: normalizeProfileEmail(String(payload.email))
    };
  } catch {
    return null;
  }
}

// OTP Storage in-memory
// In production, a database or redis store is preferred, but memory store is perfect and low-overhead for this runtime.
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

// Basic Rate Limiting Storage
// email -> timestamp of last requested OTP code
const rateLimitStore = new Map<string, number>();

// Track timestamps of requested OTP codes to enforce strict security limits
const otpRequestTracker = new Map<string, number[]>();

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isProduction) {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
      );
    }
    next();
  });

  // Middleware to parse json requests
  app.use(express.json({ limit: "1mb" }));

  // --- API Routes ---

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "XMUM Hangouts Authentication Server" });
  });

  // 1. Send OTP Email using Resend Endpoint
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Student email is required." });
      }

      const formattedEmail = normalizeProfileEmail(email);

      // Server-side validation of email domain restriction
      if (!isXmumEmail(formattedEmail)) {
        return res.status(400).json({
          error: "Only official Xiamen University Malaysia student emails (@xmu.edu.my) are permitted to login or register."
        });
      }

      // Check if user is already registered (profile exists)
      let isRegistered = false;
      try {
        isRegistered = Boolean(await resolveBestProfileByEmail(formattedEmail));
      } catch (dbErr) {
        console.warn("Backend Supabase fetch registered check errored (Supabase offline/paused). Falling back to local check.");
      }

      // If not registered in Supabase, check local backup database file cache
      if (!isRegistered) {
        const localProf = findLocalProfileByEmail(formattedEmail);
        if (localProf) {
          isRegistered = true;
        } else {
          // If neither found and Supabase is offline/errored, fallback to true to allow safer code verification/onboarding setup
          isRegistered = true;
        }
      }

      // Rate limiting: Maximum of 3 OTP code attempts within 15 minutes
      const now = Date.now();
      const requestHistory = otpRequestTracker.get(formattedEmail) || [];
      const windowStart = now - 15 * 60 * 1000;
      const recentRequests = requestHistory.filter(ts => ts > windowStart);

      if (isProduction && recentRequests.length >= 3) {
        return res.status(429).json({
          error: "Security limit reached: You can request at most 3 verification codes every 15 minutes. Please try again later, continue with Microsoft sign-in, or use your password if you already set one.",
          rate_limited: true,
          requires_microsoft: true,
          allows_password_login: true
        });
      }

      // Basic cooling throttling (45 seconds between consecutive request button clicks)
      const lastRequested = rateLimitStore.get(formattedEmail);
      if (isProduction && lastRequested && (now - lastRequested < 45000)) {
        const waitTime = Math.ceil((45000 - (now - lastRequested)) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitTime} seconds before requesting another verification code, or continue with Microsoft sign-in if you need immediate access.`,
          rate_limited: true,
          requires_microsoft: true,
          allows_password_login: true
        });
      }

      // Generate a secure 6-digit OTP code for login
      const otp = generateOtpCode();
      
      // Log for easy testing and debugging flow visibility
      if (!isProduction) console.log(`[DEV-OTP] Generated code ${otp} for student: ${formattedEmail}`);

      // Store only a keyed hash of the short-lived code.
      otpStore.set(formattedEmail, {
        otp: hashOtpCode(formattedEmail, otp, getLocalAuthSecret()),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0
      });
      rateLimitStore.set(formattedEmail, now);

      // Track request history timestamp
      recentRequests.push(now);
      otpRequestTracker.set(formattedEmail, recentRequests);

      // Email template styling with the OTP highlighted.
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px;">🌸</span>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 8px 0 0; tracking: -0.025em;">XMUM Hangouts</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Sepang Campus Meetups & Student Activities</p>
          </div>
          
          <p style="color: #334155; font-size: 14px; line-height: 1.5; margin-bottom: 20px; text-align: center;">
            Hello student! Here is your one-time verification coordinate to access your profile.
          </p>

          <!-- Main Highlight: 6-Digit OTP Code -->
          <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
            <p style="color: #be123c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">
              Your One-Time Security Code
            </p>
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 38px; font-weight: 900; letter-spacing: 0.18em; color: #e11d48; display: inline-block; margin: 4px 0;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 8px 0 0;">
              Type this code into the active login screen.
            </p>
            <p style="color: #94a3b8; font-size: 10px; margin: 4px 0 0;">
              This code will expire in 10 minutes.
            </p>
          </div>

          <p style="color: #94a3b8; font-size: 10px; line-height: 1.4; margin-top: 32px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
            This security email was delivered via Resend. If you did not request this login attempt, you can safely ignore this message.
          </p>
        </div>
      `;

      // Resend API delivery integration
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        if (isProduction) {
          return res.status(500).json({
            error: "Email service is not configured. Please set RESEND_API_KEY."
          });
        }

        console.log(`[DEV-OTP] RESEND_API_KEY not set. Use OTP ${otp} for ${formattedEmail}`);
        return res.status(200).json({
          success: true,
          message: "Local development mode: verification code generated. Check the server terminal for the OTP.",
          dev_mode: true,
          dev_otp_preview: otp
        });
      }
      
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "XMUM Hangouts <noreply@xmum-hangouts.reyanzaman.com>",
          to: formattedEmail,
          subject: `${otp} is your XMUM Hangouts verification code`,
          html: emailHtml
        })
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.error("Resend API delivery failure details:", errorText);

        if (!isRegistered) {
          return res.status(400).json({
            error: "OTP daily email limit has been reached. New registrations must continue with Microsoft sign-in today.",
            resend_expired: true,
            otp_limit_reached: true,
            requires_microsoft: true,
            allows_password_login: false,
            is_registered: false
          });
        } else {
          return res.status(429).json({
            error: "OTP daily email limit has been reached. Please sign in with Microsoft or use your password instead.",
            resend_expired: true,
            otp_limit_reached: true,
            requires_microsoft: true,
            allows_password_login: true,
            is_registered: true
          });
        }
      }

      const resendResult = await resendResponse.json();
      return res.status(200).json({
        success: true,
        message: "Code dispatched! Head to your @xmu.edu.my inbox shortly.",
        id: resendResult.id
      });

    } catch (apiErr: any) {
      console.error("Fatal exception during OTP send operation:", apiErr);
      return res.status(500).json({ error: "Internal security gateway execution error." });
    }
  });

  // 1b. Login with Password Secure Endpoint
  app.post("/api/auth/login-password", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email address and password are required parameters." });
      }

      const formattedEmail = normalizeProfileEmail(email);
      if (!isXmumEmail(formattedEmail)) {
        return res.status(400).json({ error: "Please use your official @xmu.edu.my student email." });
      }
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: "Email or password is incorrect." });
      }
      const validatedPassword = passwordValidation.password;
      const attempt = consumePasswordLoginAttempt(req, formattedEmail);
      if (!attempt.allowed) {
        res.setHeader("Retry-After", String(attempt.retryAfterSeconds));
        return res.status(429).json({ error: "Too many login attempts. Please wait a few minutes and try again." });
      }

      // Retrieve existing profile
      let profile = await resolveBestProfileByEmail(formattedEmail);

      if (!profile) {
        const authOnlyResponse = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: validatedPassword
        });

        if (authOnlyResponse.error || !authOnlyResponse.data?.user?.email) {
          return res.status(404).json({
            error: "No registered profile found with this email. Please log in with a verification code or Microsoft first."
          });
        }

        const studentId = formattedEmail.split("@")[0];
        profile = {
          id: authOnlyResponse.data.user.id,
          email: formattedEmail,
          student_id: studentId,
          name: studentId,
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
          is_admin: isConfiguredAdminEmail(formattedEmail),
          is_blocked_globally: false,
          flag_status: "none",
          appeal_count: 0,
          password_hash: hashPassword(formattedEmail, validatedPassword)
        };
        await upsertProfileWithFallback(profile);
        await mirrorProfileToAuthUser(profile, validatedPassword);
      }

      // Sync local cache
      upsertLocalProfiles([profile]);

      let authResponse = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: validatedPassword
      });

      const hasAppPassword = Boolean(profile.password_hash || profile.password);
      const appPasswordMatches = hasAppPassword && matchesStoredPassword(formattedEmail, validatedPassword, profile);

      if (!appPasswordMatches && (authResponse.error || !authResponse.data?.session)) {
        return res.status(hasAppPassword ? 401 : 400).json({
          error: hasAppPassword
            ? "Incorrect password. Please try again."
            : "No password has been configured for this account. Please log in with a verification code or Microsoft, then set a password from your profile."
        });
      }

      if (!appPasswordMatches && authResponse.data?.session) {
        profile.password_hash = hashPassword(formattedEmail, validatedPassword);
        await upsertProfileWithFallback(profile, ["password_hash"]);
        await mirrorProfileToAuthUser(profile, validatedPassword);
      }

      if (appPasswordMatches && !isModernPasswordHash(profile.password_hash)) {
        profile.password_hash = hashPassword(formattedEmail, validatedPassword);
        delete profile.password;

        try {
          upsertLocalProfiles([profile]);
          await upsertProfileWithFallback(profile, ["password_hash"]);
        } catch (migrationErr) {
          console.warn("Password hash migration failed during login:", migrationErr);
        }
      }

      if (profile.is_blocked_globally) {
        return res.status(400).json({ error: "Your account is permanently locked due to security reviews." });
      }

      if (appPasswordMatches && (authResponse.error || !authResponse.data?.session)) {
        await mirrorProfileToAuthUser(profile, validatedPassword);
        authResponse = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: validatedPassword
        });
      }

      if (authResponse.error || !authResponse.data?.session) {
        passwordLoginAttempts.delete(attempt.key);
        // Fallback with profile payload
        return res.status(200).json({
          success: true,
          message: "Logged in successfully (Resilient fallback profile session)!",
          is_fallback: true,
          profile: sanitizeProfileForClient(profile),
          local_auth_token: generateLocalAuthToken(profile),
          session: {
            access_token: "resilient_fallback_session_token",
            refresh_token: "resilient_fallback_session_token",
            expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30, // 30 days
            user: {
              id: profile.id,
              email: formattedEmail
            }
          }
        });
      }

      passwordLoginAttempts.delete(attempt.key);
      return res.status(200).json({
        success: true,
        message: "Logged in successfully!",
        is_fallback: false,
        profile: sanitizeProfileForClient(profile),
        local_auth_token: generateLocalAuthToken(profile),
        session: {
          access_token: authResponse.data.session.access_token,
          refresh_token: authResponse.data.session.refresh_token,
          expires_at: authResponse.data.session.expires_at,
          user: authResponse.data.user
        }
      });

    } catch (err) {
      console.error("Password login exception:", err);
      return res.status(500).json({ error: "An error occurred during password authentication." });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ error: "Password sync requires SUPABASE_SERVICE_ROLE_KEY." });
      }

      const passwordValidation = validatePassword(req.body?.password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: "error" in passwordValidation ? passwordValidation.error : "Invalid password." });
      }
      const password = passwordValidation.password;

      const authHeader = req.headers.authorization || "";
      const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const localAuth = verifyLocalAuthToken(
        typeof req.headers["x-local-auth"] === "string" ? req.headers["x-local-auth"] : undefined
      );

      let authUserId = "";
      let formattedEmail = "";

      if (accessToken) {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser(accessToken);
        if (error || !user?.email || !user.id) {
          return res.status(401).json({ error: "Please sign in again before changing your password." });
        }
        authUserId = user.id;
        formattedEmail = normalizeProfileEmail(user.email);
      } else if (localAuth) {
        authUserId = localAuth.profileId;
        formattedEmail = localAuth.email;
      } else {
        return res.status(401).json({ error: "Please sign in again before changing your password." });
      }

      const profile = await resolveBestProfileByEmail(formattedEmail);
      if (!profile) {
        return res.status(404).json({ error: "Profile could not be found for password setup." });
      }

      const nextProfile = {
        ...profile,
        password_hash: hashPassword(formattedEmail, password)
      };

      const authUser = accessToken && authUserId ? { id: authUserId } : await findAuthUserByEmail(formattedEmail);
      if (authUser?.id) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
        if (error) {
          return res.status(500).json({ error: "Could not update Supabase Auth password." });
        }
      }

      upsertLocalProfiles([nextProfile]);
      await upsertProfileWithFallback(nextProfile, ["password_hash"]);
      await mirrorProfileToAuthUser(nextProfile, password);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Set password endpoint failed:", err);
      return res.status(500).json({ error: "Could not update password right now." });
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    try {
      const identity = await resolveExpressRequestIdentity(req);
      if (!identity) return res.status(401).json({ error: "Session expired." });
      const profile = await resolveBestProfileByEmail(identity.email);
      if (!profile || profile.is_blocked_globally) return res.status(401).json({ error: "Session expired." });
      return res.status(200).json({ profile: sanitizeProfileForClient(profile) });
    } catch (error) {
      console.warn("Session validation failed:", error);
      return res.status(401).json({ error: "Session expired." });
    }
  });

  // 2. Clear & Authenticate verified OTP endpoint
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "Email address and 6-digit verification code are required parameters." });
      }

      const formattedEmail = normalizeProfileEmail(email);
      const codeStr = otp.trim();
      if (!isXmumEmail(formattedEmail)) {
        return res.status(400).json({ error: "Please use your official @xmu.edu.my student email." });
      }

      const entry = otpStore.get(formattedEmail);
      if (!entry) {
        return res.status(400).json({ error: "Verification session expired or does not exist. Please request a new code." });
      }

      // Check OTP expiration
      if (Date.now() > entry.expiresAt) {
        otpStore.delete(formattedEmail);
        return res.status(400).json({ error: "Verification code has expired (10 minute limit). Please send a new one." });
      }

      // Max attempt protection against brute forcing (5 attempts total)
      if (entry.attempts >= 5) {
        otpStore.delete(formattedEmail);
        return res.status(429).json({ error: "Too many incorrect OTP attempts. For safety, please request a new code." });
      }

      // Check OTP match
      if (!matchesOtpCode(entry.otp, formattedEmail, codeStr, getLocalAuthSecret())) {
        entry.attempts += 1;
        otpStore.set(formattedEmail, entry);
        return res.status(400).json({ error: `Incorrect verification code. Attempts remaining: ${5 - entry.attempts}.` });
      }

      // OTP Is Correct! Wipe from the active volatile memory store
      otpStore.delete(formattedEmail);

      let verifiedProfile = await resolveBestProfileByEmail(formattedEmail);
      if (!verifiedProfile) {
        const studentId = formattedEmail.split("@")[0];
        verifiedProfile = {
          id: `user_${crypto.randomUUID()}`,
          email: formattedEmail,
          student_id: studentId,
          name: studentId,
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
          is_admin: isConfiguredAdminEmail(formattedEmail),
          is_blocked_globally: false,
          flag_status: "none",
          appeal_count: 0
        };
        await upsertProfileWithFallback(verifiedProfile);
      }

      verifiedProfile = mergeProfileWithAuthMetadata(verifiedProfile);
      await mirrorProfileToAuthUser(verifiedProfile);
      upsertLocalProfiles([verifiedProfile]);

      return res.status(200).json({
        success: true,
        message: "Identity verified!",
        is_fallback: true,
        profile: sanitizeProfileForClient(verifiedProfile),
        local_auth_token: generateLocalAuthToken(verifiedProfile),
        session: {
          access_token: "local_verified_session",
          refresh_token: "local_verified_session",
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
          user: { id: verifiedProfile.id, email: formattedEmail }
        }
      });


    } catch (apiErr: any) {
      console.error("Fatal exception during OTP verification operation:", apiErr);
      return res.status(500).json({ error: "Exception occurred during identity validation." });
    }
  });

  // 3. Backup login direct redirect link landing endpoint
  app.get("/api/auth/login-backup", async (req, res) => {
    return res.status(410).send("<h3>This sign-in link has been retired for security. Return to XMUM Hangouts and enter the verification code from your email.</h3>");
    /* legacy implementation retained temporarily for source compatibility
    try {
      const email = req.query.email as string;
      const otp = req.query.otp as string;

      if (!email || !otp) {
        return res.status(400).send("<h3>Missing backup query parameters</h3>");
      }

      const formattedEmail = email.trim().toLowerCase();
      const codeStr = otp.trim();

      const entry = otpStore.get(formattedEmail);
      if (!entry || entry.otp !== codeStr || Date.now() > entry.expiresAt) {
        return res.status(400).send(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <p style="font-size: 40px;">⚠️</p>
            <h3>Invalid or Expired Backup Verification Link</h3>
            <p style="color: #64748b;">The code has already been verified or the session expired. Please return to the app and request a fresh login link.</p>
          </div>
        `);
      }

      // Clean up OTP session
      otpStore.delete(formattedEmail);

      // Perform authentication logic on Supabase

      // Retrieve existing / create new user

      if (sessionErr || !sessionData?.session) {
        return res.status(500).send("<h3>Authentication service is temporarily busy. Try logging in normally.</h3>");
      }

      const { access_token, refresh_token } = sessionData.session;
      const appUrl = resolveAppUrl(req);

      // Redirect user with hash parameters, which is auto parsed by AppContext!
      return res.redirect(`${appUrl}/#access_token=${access_token}&refresh_token=${refresh_token}`);

    } catch (err) {
      console.error("Backup Login exception:", err);
      return res.status(500).send("<h3>Internal server validation error</h3>");
    } */
  });

  const registerSyncRoute = (options: {
    getPath: string;
    postPath: string;
    payloadKey: string;
    fileName: string;
    table: string;
    localProfileMode?: boolean;
    transformRows?: (rows: any[]) => any[] | Promise<any[]>;
    removedIdsKey?: string;
  }) => {
    const { getPath, postPath, payloadKey, fileName, table, localProfileMode, transformRows, removedIdsKey } = options;

    app.get(getPath, async (req, res) => {
      setCors(req, res);
      const identity = await resolveExpressRequestIdentity(req);
      const profile = identity ? await resolveBestProfileByEmail(identity.email) : null;
      const isAdmin = Boolean(profile?.is_admin && isConfiguredAdminEmail(profile.email));
      const userId = identity?.userId || "";
      let payload = localProfileMode ? getLocalProfiles() : getLocalData(fileName);

      if (table === "xmum_profiles") {
        payload = payload.map((row: any) => {
          const { password, password_hash, ...safeRow } = row;
          if (isAdmin || row.id === userId || !row.hide_details) return safeRow;
          return { ...safeRow, country: "Hidden", languages: [], age: 0, birthdate: null, program: "Hidden", year_of_study: "Hidden", gender: "Hidden", student_type: "Not Specified" };
        });
      } else if (table === "xmum_hangouts") {
        const acceptedIds = new Set(getLocalData(LOCAL_APPLICATIONS_FILE).filter((item: any) => item.applicant_id === userId && item.status === "accepted").map((item: any) => item.hangout_id));
        payload = payload.map((row: any) => isAdmin || row.creator_id === userId || acceptedIds.has(row.id) ? row : { ...row, meeting_point: "Apply and get accepted to unlock" });
      } else if (table === "xmum_applications") {
        const hostedIds = new Set(getLocalData(LOCAL_HANGOUTS_FILE).filter((item: any) => item.creator_id === userId).map((item: any) => item.id));
        payload = isAdmin ? payload : payload.filter((row: any) => row.applicant_id === userId || hostedIds.has(row.hangout_id));
      } else if (table === "xmum_chats") {
        payload = isAdmin ? payload : payload.filter((row: any) => row.user_a_id === userId || row.user_b_id === userId);
      } else if (table === "xmum_messages") {
        const chatIds = new Set(getLocalData(LOCAL_CHATS_FILE).filter((row: any) => row.user_a_id === userId || row.user_b_id === userId).map((row: any) => row.id));
        payload = isAdmin ? payload : payload.filter((row: any) => chatIds.has(row.chat_id));
      } else if (table === "xmum_blocks") {
        payload = isAdmin ? payload : payload.filter((row: any) => row.blocker_id === userId || row.blocked_id === userId);
      } else if (table === "xmum_reports") {
        payload = isAdmin ? payload : payload.filter((row: any) => row.reporter_id === userId || row.reported_user_id === userId);
      } else if (table === "xmum_appeals") {
        const reportIds = new Set(getLocalData(LOCAL_REPORTS_FILE).filter((row: any) => row.reported_user_id === userId).map((row: any) => row.id));
        payload = isAdmin ? payload : payload.filter((row: any) => reportIds.has(row.report_id));
      } else if (table === "xmum_notifications") {
        payload = isAdmin ? payload : payload.filter((row: any) => row.user_id === userId);
      }
      return res.status(200).json({ [payloadKey]: payload });
    });

    app.post(postPath, async (req, res) => {
      setCors(req, res);
      try {
        const identity = await resolveExpressRequestIdentity(req);
        if (!identity) {
          return res.status(401).json({ error: "Please sign in again before syncing data." });
        }
        const data = req.body?.[payloadKey];
        if (!Array.isArray(data)) {
          return res.status(400).json({ error: "Invalid payload: must be array." });
        }
        if (data.length > 2000) {
          return res.status(413).json({ error: "Sync payload is too large." });
        }

        const profile = await resolveBestProfileByEmail(identity.email);
        const isAdmin = Boolean(profile?.is_admin && isConfiguredAdminEmail(profile.email));
        let authorizedData = data;
        if (!isAdmin) {
          if (table === "xmum_profiles") authorizedData = data.filter((row: any) => row.id === identity.userId || normalizeProfileEmail(row.email || "") === identity.email).map((row: any) => ({ ...row, id: profile?.id || identity.userId, email: identity.email, is_admin: false, is_blocked_globally: Boolean(profile?.is_blocked_globally), flag_status: profile?.flag_status || "none", appeal_count: Number(profile?.appeal_count || 0), password_hash: profile?.password_hash || null }));
          else if (table === "xmum_hangouts") authorizedData = data.filter((row: any) => row.creator_id === identity.userId);
          else if (table === "xmum_likes") authorizedData = data.filter((row: any) => row.user_id === identity.userId);
          else if (table === "xmum_comments") authorizedData = data.filter((row: any) => row.user_id === identity.userId);
          else if (table === "xmum_blocks") authorizedData = data.filter((row: any) => row.blocker_id === identity.userId);
          else if (table === "xmum_chats") authorizedData = data.filter((row: any) => row.user_a_id === identity.userId || row.user_b_id === identity.userId);
          else if (table === "xmum_messages") {
            const chatIds = new Set(getLocalData(LOCAL_CHATS_FILE).filter((row: any) => row.user_a_id === identity.userId || row.user_b_id === identity.userId).map((row: any) => row.id));
            authorizedData = data.filter((row: any) => row.sender_id === identity.userId && chatIds.has(row.chat_id));
          } else if (table === "xmum_reports") {
            const existing = new Map(getLocalData(LOCAL_REPORTS_FILE).map((row: any) => [row.id, row]));
            authorizedData = data.filter((row: any) => row.reporter_id === identity.userId).map((row: any) => existing.get(row.id) || ({ ...row, status: "pending", reviewed_at: null }));
          }
          else if (table === "xmum_applications") {
            const hostedIds = new Set(getLocalData(LOCAL_HANGOUTS_FILE).filter((row: any) => row.creator_id === identity.userId).map((row: any) => row.id));
            authorizedData = data.filter((row: any) => hostedIds.has(row.hangout_id) || (row.applicant_id === identity.userId && (row.status === "pending" || row.status === "retracted")));
          } else if (table === "xmum_appeals") {
            const reportIds = new Set(getLocalData(LOCAL_REPORTS_FILE).filter((row: any) => row.reported_user_id === identity.userId).map((row: any) => row.id));
            const existing = new Map(getLocalData(LOCAL_APPEALS_FILE).map((row: any) => [row.id, row]));
            authorizedData = data.filter((row: any) => reportIds.has(row.report_id)).map((row: any) => existing.get(row.id) || ({ ...row, status: "pending", reviewed_at: null }));
          } else if (table === "xmum_notifications") {
            const actorGeneratedTypes = new Set(["hangout_like", "comment_reply", "new_application", "chat_message"]);
            authorizedData = data.filter((row: any) => row.user_id === identity.userId || (row.payload?.actor_user_id === identity.userId && actorGeneratedTypes.has(row.type)));
          }
          else authorizedData = [];
        }

        const transformedData = transformRows ? await transformRows(authorizedData) : authorizedData;
        let removedIds = Array.isArray(req.body?.[removedIdsKey || ""])
          ? req.body[removedIdsKey || ""].filter((id: unknown) => typeof id === "string" && id.trim().length > 0)
          : [];
        if (!isAdmin && removedIds.length > 0) {
          if (table === "xmum_blocks") {
            const allowedIds = new Set(getLocalData(LOCAL_BLOCKS_FILE).filter((row: any) => row.blocker_id === identity.userId).map((row: any) => row.id));
            removedIds = removedIds.filter((id: string) => allowedIds.has(id));
          } else {
            removedIds = [];
          }
        }
        const profileRemoteFields =
          table === "xmum_profiles" && Array.isArray(req.body?.profile_remote_fields)
            ? req.body.profile_remote_fields.filter((field: unknown) => typeof field === "string" && [
                "name", "name_last_changed_at", "country", "country_last_changed_at", "languages", "age", "birthdate",
                "program", "year_of_study", "gender", "gender_last_changed_at", "student_type", "about_me", "avatar_id",
                "is_profile_complete", "hide_details", "companion_pet_count", "companion_selected_state_id"
              ].includes(field.trim()))
            : [];

        if (localProfileMode) {
          upsertLocalProfiles(authorizedData);
        } else {
          const existingRows = getLocalData(fileName);
          const mergedRows = Array.from(new Map([...existingRows, ...transformedData].map((row: any) => [row.id, row])).values());
          saveLocalData(fileName, mergedRows);
        }

        await upsertToSupabase(table, transformedData, profileRemoteFields);
        if (removedIds.length > 0) {
          await deleteRowsByIds(table, removedIds);
        }

        return res.status(200).json({ success: true, count: data.length });
      } catch (err) {
        console.error(`${payloadKey} sync exception:`, err);
        return res.status(500).json({ error: `Failed to sync ${payloadKey}` });
      }
    });
  };

  registerSyncRoute({
    getPath: "/api/profiles",
    postPath: "/api/profiles/sync",
    payloadKey: "profiles",
    fileName: "local_profiles.json",
    table: "xmum_profiles",
    localProfileMode: true,
    transformRows: rows => collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase)
  });
  registerSyncRoute({
    getPath: "/api/hangouts",
    postPath: "/api/hangouts/sync",
    payloadKey: "hangouts",
    fileName: LOCAL_HANGOUTS_FILE,
    table: "xmum_hangouts",
    transformRows: rows => prepareHangoutRowsForPersistence(rows)
  });
  registerSyncRoute({
    getPath: "/api/comments",
    postPath: "/api/comments/sync",
    payloadKey: "comments",
    fileName: LOCAL_COMMENTS_FILE,
    table: "xmum_comments",
    transformRows: rows => rows.map(sanitizeCommentForDatabase)
  });
  registerSyncRoute({
    getPath: "/api/applications",
    postPath: "/api/applications/sync",
    payloadKey: "applications",
    fileName: LOCAL_APPLICATIONS_FILE,
    table: "xmum_applications"
  });
  registerSyncRoute({
    getPath: "/api/likes",
    postPath: "/api/likes/sync",
    payloadKey: "likes",
    fileName: LOCAL_LIKES_FILE,
    table: "xmum_likes"
  });
  registerSyncRoute({
    getPath: "/api/messages",
    postPath: "/api/messages/sync",
    payloadKey: "messages",
    fileName: LOCAL_MESSAGES_FILE,
    table: "xmum_messages"
  });
  registerSyncRoute({
    getPath: "/api/chats",
    postPath: "/api/chats/sync",
    payloadKey: "chats",
    fileName: LOCAL_CHATS_FILE,
    table: "xmum_chats"
  });
  registerSyncRoute({
    getPath: "/api/reports",
    postPath: "/api/reports/sync",
    payloadKey: "reports",
    fileName: LOCAL_REPORTS_FILE,
    table: "xmum_reports"
  });
  registerSyncRoute({
    getPath: "/api/appeals",
    postPath: "/api/appeals/sync",
    payloadKey: "appeals",
    fileName: LOCAL_APPEALS_FILE,
    table: "xmum_appeals"
  });
  registerSyncRoute({
    getPath: "/api/blocks",
    postPath: "/api/blocks/sync",
    payloadKey: "blocks",
    fileName: LOCAL_BLOCKS_FILE,
    table: "xmum_blocks",
    transformRows: rows => sanitizeBlocks(rows),
    removedIdsKey: "removed_block_ids"
  });
  registerSyncRoute({
    getPath: "/api/notifications",
    postPath: "/api/notifications/sync",
    payloadKey: "notifications",
    fileName: LOCAL_NOTIFICATIONS_FILE,
    table: "xmum_notifications"
  });

  app.get("/api/push/public-key", (req, res) => {
    setCors(req, res, "GET,OPTIONS", "Content-Type, Authorization, X-Local-Auth");
    const publicKey = getVapidPublicKey();
    return publicKey
      ? res.status(200).json({ publicKey })
      : res.status(503).json({ error: "Push notifications are not configured yet." });
  });

  app.post("/api/push/:action", async (req, res) => {
    setCors(req, res, "POST,OPTIONS", "Content-Type, Authorization, X-Local-Auth");
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Push notifications require the server database connection." });
    }
    if (req.params.action === "process-reminders") {
      const cronSecret = (process.env.CRON_SECRET || "").trim();
      if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: "Invalid reminder scheduler credentials." });
      }
      try {
        const result = await processScheduledReminders(supabaseAdmin);
        return res.status(200).json({ success: true, ...result });
      } catch (error) {
        console.error("Scheduled reminder processing failed:", error);
        return res.status(500).json({ error: "Scheduled reminders could not be processed." });
      }
    }
    const identity = await resolveExpressRequestIdentity(req);
    if (!identity) {
      return res.status(401).json({ error: "Please sign in again to manage notifications." });
    }

    try {
      if (req.params.action === "subscribe") {
        if (!isPushConfigured()) return res.status(503).json({ error: "Push notifications are not configured yet." });
        await savePushSubscription(supabaseAdmin, identity, req.body?.subscription, req.headers["user-agent"] || "");
        return res.status(200).json({ success: true });
      }
      if (req.params.action === "unsubscribe") {
        const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
        if (!endpoint) return res.status(400).json({ error: "A subscription endpoint is required." });
        await removePushSubscription(supabaseAdmin, identity, endpoint);
        return res.status(200).json({ success: true });
      }
      if (req.params.action === "dispatch") {
        if (!isPushConfigured()) return res.status(503).json({ error: "Push notifications are not configured yet." });
        const requestedIds = Array.isArray(req.body?.notification_ids)
          ? req.body.notification_ids.filter((id: unknown) => typeof id === "string")
          : [];
        const profile = await resolveBestProfileByEmail(identity.email);
        const isAdmin = Boolean(profile?.is_admin && isConfiguredAdminEmail(profile.email));
        const { data: requestedNotifications, error } = requestedIds.length
          ? await supabaseAdmin.from("xmum_notifications").select("id,user_id,payload").in("id", requestedIds.slice(0, 50))
          : { data: [], error: null };
        if (error) throw error;
        const notificationIds = (requestedNotifications || [])
          .filter((notification: any) => isAdmin || notification.user_id === identity.userId || notification.payload?.actor_user_id === identity.userId)
          .map((notification: any) => notification.id);
        const result = await dispatchPushNotifications(supabaseAdmin, notificationIds);
        return res.status(200).json({ success: true, ...result });
      }
      return res.status(404).json({ error: "Route not found" });
    } catch (error) {
      console.error(`Push route ${req.params.action} failed:`, error);
      return res.status(500).json({ error: "We couldn't complete the notification request." });
    }
  });

  app.post("/api/account/delete", async (req, res) => {
    setCors(req, res, "OPTIONS,POST", "Content-Type, Authorization, X-Local-Auth");
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({
          error: "Permanent account deletion needs SUPABASE_SERVICE_ROLE_KEY in the server environment."
        });
      }

      const authHeader = req.headers.authorization || "";
      const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const localAuth = verifyLocalAuthToken(
        typeof req.headers["x-local-auth"] === "string" ? req.headers["x-local-auth"] : undefined
      );

      let resolvedUserId = "";
      let normalizedEmail = "";

      if (accessToken) {
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser(accessToken);

        if (authError || !user?.id || !user.email) {
          return res.status(401).json({ error: "We couldn't verify your account for deletion." });
        }

        resolvedUserId = user.id;
        normalizedEmail = normalizeProfileEmail(user.email);
      } else if (localAuth) {
        resolvedUserId = localAuth.profileId;
        normalizedEmail = localAuth.email;
      } else {
        return res.status(401).json({ error: "Please sign in again before deleting your account." });
      }

      const nowIso = new Date().toISOString();

      const [
        remoteProfilesRes,
        remoteHangoutsRes,
        remoteApplicationsRes,
        remoteLikesRes,
        remoteCommentsRes,
        remoteChatsRes,
        remoteMessagesRes,
        remoteReportsRes,
        remoteAppealsRes,
        remoteBlocksRes,
        remoteNotificationsRes
      ] = await Promise.all([
        supabaseAdmin.from("xmum_profiles").select("*"),
        supabaseAdmin.from("xmum_hangouts").select("*"),
        supabaseAdmin.from("xmum_applications").select("*"),
        supabaseAdmin.from("xmum_likes").select("*"),
        supabaseAdmin.from("xmum_comments").select("*"),
        supabaseAdmin.from("xmum_chats").select("*"),
        supabaseAdmin.from("xmum_messages").select("*"),
        supabaseAdmin.from("xmum_reports").select("*"),
        supabaseAdmin.from("xmum_appeals").select("*"),
        supabaseAdmin.from("xmum_blocks").select("*"),
        supabaseAdmin.from("xmum_notifications").select("*")
      ]);

      const profiles = mergeById((remoteProfilesRes.data as any[]) || [], getLocalProfiles());
      const hangouts = mergeById((remoteHangoutsRes.data as any[]) || [], getLocalData(LOCAL_HANGOUTS_FILE));
      const applications = mergeById((remoteApplicationsRes.data as any[]) || [], getLocalData(LOCAL_APPLICATIONS_FILE));
      const likes = mergeById((remoteLikesRes.data as any[]) || [], getLocalData(LOCAL_LIKES_FILE));
      const comments = mergeById((remoteCommentsRes.data as any[]) || [], getLocalData(LOCAL_COMMENTS_FILE));
      const chats = mergeById((remoteChatsRes.data as any[]) || [], getLocalData(LOCAL_CHATS_FILE));
      const messages = mergeById((remoteMessagesRes.data as any[]) || [], getLocalData(LOCAL_MESSAGES_FILE));
      const reports = mergeById((remoteReportsRes.data as any[]) || [], getLocalData(LOCAL_REPORTS_FILE));
      const appeals = mergeById((remoteAppealsRes.data as any[]) || [], getLocalData(LOCAL_APPEALS_FILE));
      const blocks = mergeById((remoteBlocksRes.data as any[]) || [], getLocalData(LOCAL_BLOCKS_FILE));
      const notifications = mergeById((remoteNotificationsRes.data as any[]) || [], getLocalData(LOCAL_NOTIFICATIONS_FILE));

      const matchingProfiles = profiles.filter(
        (profile: any) =>
          profile.id === resolvedUserId ||
          normalizeProfileEmail(profile.email || "") === normalizedEmail
      );
      const userIds = new Set<string>([resolvedUserId, ...matchingProfiles.map((profile: any) => profile.id)]);

      const deletedUserProfile = buildDeletedUserProfile();
      const activeOrPendingHangouts = hangouts.filter(
        (hangout: any) => userIds.has(hangout.creator_id) && hangout.status !== "expired" && hangout.status !== "cancelled"
      );

      const participantNotifications = applications
        .filter(
          (application: any) =>
            activeOrPendingHangouts.some((hangout: any) => hangout.id === application.hangout_id) &&
            !userIds.has(application.applicant_id) &&
            (application.status === "pending" || application.status === "accepted")
        )
        .map((application: any) => {
          const relatedHangout = activeOrPendingHangouts.find((hangout: any) => hangout.id === application.hangout_id);
          return {
            id: "notif_" + Math.random().toString(36).substring(2, 11),
            user_id: application.applicant_id,
            type: "admin_message",
            payload: {
              hangout_id: application.hangout_id,
              custom_text: `Heads up: "${relatedHangout?.intention || "A hangout"}" has been closed because the host account was removed.`
            },
            is_read: false,
            created_at: nowIso
          };
        });

      const nextProfiles = [
        ...profiles.filter(
          (profile: any) =>
            !userIds.has(profile.id) &&
            normalizeProfileEmail(profile.email || "") !== normalizedEmail
        ),
        deletedUserProfile
      ];

      const nextHangouts = hangouts.map((hangout: any) => {
        if (!userIds.has(hangout.creator_id)) {
          return hangout;
        }

        return {
          ...hangout,
          creator_id: SYSTEM_DELETED_USER_ID,
          status: "expired",
          updated_at: nowIso
        };
      });

      const nextComments = comments.flatMap((comment: any) => {
        if (!userIds.has(comment.user_id)) {
          return [comment];
        }

        const relatedHangout = nextHangouts.find((hangout: any) => hangout.id === comment.hangout_id);
        if (relatedHangout?.status === "expired") {
          return [
            {
              ...comment,
              user_id: SYSTEM_DELETED_USER_ID
            }
          ];
        }

        return [];
      });

      const nextApplications = applications.filter((application: any) => !userIds.has(application.applicant_id));
      const nextLikes = likes.filter((like: any) => !userIds.has(like.user_id));
      const nextBlocks = blocks.filter((block: any) => !userIds.has(block.blocker_id) && !userIds.has(block.blocked_id));
      const nextReports = reports.filter((report: any) => !userIds.has(report.reporter_id) && !userIds.has(report.reported_user_id));
      const remainingReportIds = new Set(nextReports.map((report: any) => report.id));
      const nextAppeals = appeals.filter((appeal: any) => remainingReportIds.has(appeal.report_id));
      const nextChats = chats.filter((chat: any) => !userIds.has(chat.user_a_id) && !userIds.has(chat.user_b_id));
      const keptChatIds = new Set(nextChats.map((chat: any) => chat.id));
      const nextMessages = messages.filter((message: any) => keptChatIds.has(message.chat_id) && !userIds.has(message.sender_id));
      const nextNotifications = [
        ...notifications.filter((notification: any) => !userIds.has(notification.user_id)),
        ...participantNotifications
      ];

      saveLocalProfiles(nextProfiles);
      const persistedHangouts = await prepareHangoutRowsForPersistence(nextHangouts);
      const persistedComments = nextComments.map(sanitizeCommentForDatabase);

      saveLocalData(LOCAL_HANGOUTS_FILE, persistedHangouts);
      saveLocalData(LOCAL_APPLICATIONS_FILE, nextApplications);
      saveLocalData(LOCAL_LIKES_FILE, nextLikes);
      saveLocalData(LOCAL_COMMENTS_FILE, persistedComments);
      saveLocalData(LOCAL_CHATS_FILE, nextChats);
      saveLocalData(LOCAL_MESSAGES_FILE, nextMessages);
      saveLocalData(LOCAL_REPORTS_FILE, nextReports);
      saveLocalData(LOCAL_APPEALS_FILE, nextAppeals);
      saveLocalData(LOCAL_BLOCKS_FILE, nextBlocks);
      saveLocalData(LOCAL_NOTIFICATIONS_FILE, nextNotifications);

      await supabaseAdmin.from("xmum_profiles").upsert([sanitizeProfileForDatabase(deletedUserProfile)]);
      await supabaseAdmin.from("xmum_hangouts").upsert(persistedHangouts);
      await upsertToSupabase("xmum_comments", persistedComments);
      await supabaseAdmin.from("xmum_notifications").upsert(nextNotifications);

      await deleteRowsByIds(
        "xmum_messages",
        messages.filter((message: any) => !nextMessages.some((item: any) => item.id === message.id)).map((message: any) => message.id)
      );
      await deleteRowsByIds(
        "xmum_chats",
        chats.filter((chat: any) => !nextChats.some((item: any) => item.id === chat.id)).map((chat: any) => chat.id)
      );
      await deleteRowsByIds(
        "xmum_likes",
        likes.filter((like: any) => !nextLikes.some((item: any) => item.id === like.id)).map((like: any) => like.id)
      );
      await deleteRowsByIds(
        "xmum_applications",
        applications.filter((application: any) => !nextApplications.some((item: any) => item.id === application.id)).map((application: any) => application.id)
      );
      await deleteRowsByIds(
        "xmum_appeals",
        appeals.filter((appeal: any) => !nextAppeals.some((item: any) => item.id === appeal.id)).map((appeal: any) => appeal.id)
      );
      await deleteRowsByIds(
        "xmum_reports",
        reports.filter((report: any) => !nextReports.some((item: any) => item.id === report.id)).map((report: any) => report.id)
      );
      await deleteRowsByIds(
        "xmum_blocks",
        blocks.filter((block: any) => !nextBlocks.some((item: any) => item.id === block.id)).map((block: any) => block.id)
      );
      await deleteRowsByIds(
        "xmum_notifications",
        notifications
          .filter((notification: any) => !nextNotifications.some((item: any) => item.id === notification.id))
          .map((notification: any) => notification.id)
      );
      await deleteRowsByIds(
        "xmum_comments",
        comments.filter((comment: any) => !nextComments.some((item: any) => item.id === comment.id)).map((comment: any) => comment.id)
      );
      await deleteRowsByIds(
        "xmum_profiles",
        matchingProfiles.map((profile: any) => profile.id).filter((id: string) => id !== SYSTEM_DELETED_USER_ID)
      );

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(resolvedUserId);
      if (authDeleteError) {
        console.error("Supabase auth user deletion failed:", authDeleteError);
      }

      return res.status(200).json({
        success: true,
        profiles: nextProfiles,
        hangouts: persistedHangouts,
        applications: nextApplications,
        likes: nextLikes,
        comments: persistedComments,
        chats: nextChats,
        messages: nextMessages,
        reports: nextReports,
        appeals: nextAppeals,
        blocks: nextBlocks,
        notifications: nextNotifications
      });
    } catch (err) {
      console.error("Account deletion endpoint failed:", err);
      return res.status(500).json({ error: "We couldn't finish deleting this account." });
    }
  });

  app.post("/api/bug-report", async (req, res) => {
    setCors(req, res);
    try {
      const { reporter, kind, subject, description, sourcePage, submittedAt } = req.body || {};
      const requestKind = kind === "feature" ? "feature" : "bug";
      const requestLabel = requestKind === "feature" ? "Feature Request" : "Bug Report";
      const trimmedDescription = typeof description === "string" ? description.trim() : "";
      const trimmedSubject =
        typeof subject === "string" && subject.trim()
          ? subject.trim().slice(0, 120)
          : requestKind === "feature"
            ? "General feature request"
            : "General bug report";
      const trimmedPage = typeof sourcePage === "string" ? sourcePage.trim().slice(0, 120) : "XMUM Hangouts";
      const reporterEmail = typeof reporter?.email === "string" ? reporter.email.trim().toLowerCase() : "";

      if (!reporterEmail.endsWith("@xmu.edu.my")) {
        return res.status(400).json({ error: "Only XMUM student accounts can submit support requests." });
      }

      if (trimmedDescription.length < 10) {
        return res.status(400).json({ error: `${requestLabel} details must be at least 10 characters long.` });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey || !ADMIN_ACCOUNT_EMAIL) {
        return res.status(200).json({
          success: true,
          warning: "The in-app admin ticket was created, but the support email route is not fully configured yet."
        });
      }

      const safeSubject = escapeHtml(trimmedSubject);
      const safeDescription = escapeHtml(trimmedDescription).replace(/\n/g, "<br />");
      const safePage = escapeHtml(trimmedPage);
      const safeReporterName = escapeHtml(reporter?.name || "XMUM student");
      const safeReporterEmail = escapeHtml(reporterEmail);
      const safeSubmittedAt = escapeHtml(submittedAt || new Date().toISOString());

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <h2 style="margin: 0 0 16px; color: #e11d48;">XMUM Hangouts ${escapeHtml(requestLabel)}</h2>
          <p style="margin: 0 0 12px;"><strong>Reporter:</strong> ${safeReporterName} (${safeReporterEmail})</p>
          <p style="margin: 0 0 12px;"><strong>Page:</strong> ${safePage}</p>
          <p style="margin: 0 0 12px;"><strong>Subject:</strong> ${safeSubject}</p>
          <p style="margin: 0 0 12px;"><strong>Submitted:</strong> ${safeSubmittedAt}</p>
          <div style="margin-top: 20px; padding: 16px; border: 1px solid #fecdd3; border-radius: 12px; background: #fff1f2;">
            <strong style="display: block; margin-bottom: 8px;">Details</strong>
            <div style="line-height: 1.6;">${safeDescription}</div>
          </div>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "XMUM Hangouts <noreply@xmum-hangouts.reyanzaman.com>",
          to: ADMIN_ACCOUNT_EMAIL,
          reply_to: reporterEmail,
          subject: `[XMUM Hangouts ${requestLabel}] ${trimmedSubject}`,
          html: emailHtml
        })
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        console.error("Support request email delivery failed:", errorText);
        return res.status(502).json({ error: `${requestLabel} email could not be delivered.` });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Support request endpoint failed:", err);
      return res.status(500).json({ error: "Failed to send the support email." });
    }
  });

  // --- Vite & Frontend Static Serving ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML page with correct client fallback SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Active listener bind
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Production App Backend] XMUM Hangouts Server listening securely on port ${PORT}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other XMUM Hangouts dev server before starting a new one.`);
      process.exit(1);
    }

    throw error;
  });
}

startServer();
