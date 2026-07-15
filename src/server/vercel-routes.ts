import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { collapseProfilesByEmail, normalizeProfileEmail, pickCanonicalProfile } from "../lib/profiles.js";
import { hashPassword, isModernPasswordHash, matchesStoredPassword } from "../lib/security.js";
import type {
  AppNotification,
  Block,
  Chat,
  HangoutApplication,
  HangoutComment,
  HangoutLike,
  Profile,
  Report,
  ReportAppeal
} from "../types.js";
import { deleteOtpRecord, getOtpRecord, OtpStorageConfigurationError, saveOtpRecord } from "./otp-store.js";
import { generateOtpCode, hashOtpCode, isXmumEmail, matchesOtpCode, OTP_TTL_MS, validatePassword } from "./auth-security.js";
import {
  dispatchPushNotifications,
  getVapidPublicKey,
  isPushConfigured,
  processScheduledReminders,
  removePushSubscription,
  savePushSubscription
} from "./push-service.js";

const ADMIN_ACCOUNT_EMAIL = normalizeProfileEmail(process.env.ADMIN_ACCOUNT_EMAIL || "");
const SYSTEM_DELETED_USER_ID = "deleted_user";
const SYSTEM_DELETED_USER_EMAIL = "deleted.user@system.local";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bssljvoorzotsiskhpcl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const backendProfileClient = supabaseAdmin || supabase;

const sanitizeProfileForClient = <T extends Record<string, any>>(profile: T) => {
  const { password, ...safeProfile } = profile;
  return {
    ...safeProfile,
    password_hash: profile.password_hash ? "configured" : null
  };
};

function escapeSupabaseLikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isConfiguredAdminEmail(email: string) {
  return normalizeProfileEmail(email) === ADMIN_ACCOUNT_EMAIL;
}

type SyncConfig = {
  payloadKey: string;
  table: string;
  transformRows?: (rows: any[]) => any[] | Promise<any[]>;
  removedIdsKey?: string;
};

const isMissingPasswordHashColumnError = (error: unknown) => {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes("password_hash") && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
};

const isMissingProfileColumnError = (error: unknown, columnName: string) => {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes(columnName) && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
};

const isMissingCommentColumnError = (error: unknown, columnName: string) => {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes(columnName) && message.includes("xmum_comments") && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
};

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

const markUnsupportedProfileColumns = (error: unknown) => {
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
};

const isMissingOptionalProfileColumnError = (error: unknown) =>
  isMissingPasswordHashColumnError(error) ||
  isMissingProfileColumnError(error, "birthdate") ||
  isMissingProfileColumnError(error, "companion_pet_count") ||
  isMissingProfileColumnError(error, "companion_selected_state_id") ||
  isMissingProfileColumnError(error, "gender_last_changed_at");

const markUnsupportedCommentColumns = (error: unknown) => {
  if (isMissingCommentColumnError(error, "is_anonymous")) {
    commentColumnSupport.is_anonymous = false;
  }
};

const getProfileSelectColumns = () => {
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
};

const stripUnsupportedColumnsFromProfileRow = (row: Record<string, any>) => {
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
};

const stripUnsupportedProfileColumns = (rows: Array<Record<string, any>>, error: unknown) =>
  rows.map(row => {
    markUnsupportedProfileColumns(error);
    const nextRow = stripUnsupportedColumnsFromProfileRow(row);
    if (isMissingProfileColumnError(error, "birthdate")) delete nextRow.birthdate;
    if (isMissingPasswordHashColumnError(error)) delete nextRow.password_hash;
    if (isMissingProfileColumnError(error, "companion_pet_count")) delete nextRow.companion_pet_count;
    if (isMissingProfileColumnError(error, "companion_selected_state_id")) delete nextRow.companion_selected_state_id;
    if (isMissingProfileColumnError(error, "gender_last_changed_at")) delete nextRow.gender_last_changed_at;
    return nextRow;
  });

const sanitizeProfileForDatabase = (profile: any) => stripUnsupportedColumnsFromProfileRow({
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

const sanitizeBlocks = (rows: any[]) => {
  const latestByPair = new Map<string, any>();

  rows.forEach(block => {
    if (!block?.id || !block?.blocker_id || !block?.blocked_id) return;
    if (block.blocker_id === block.blocked_id) return;

    latestByPair.set(`${block.blocker_id}::${block.blocked_id}`, block);
  });

  return Array.from(latestByPair.values());
};

const LOCKED_MEETING_POINT_MARKERS = [
  "apply and get accepted to unlock",
  "visible after the host approves your request"
];

const isLockedMeetingPointPlaceholder = (value: unknown) => {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  return LOCKED_MEETING_POINT_MARKERS.some(marker => normalizedValue.includes(marker));
};

const sanitizeHangoutRestrictions = (restrictions: any) => {
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
};

const sanitizeHangoutForDatabase = (hangout: any) => ({
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
});

const sanitizeCommentForDatabase = (comment: any) => {
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
  }

  return row;
};

const prepareHangoutRowsForPersistence = async (rows: any[]) => {
  const sanitizedRows = rows.map(sanitizeHangoutForDatabase).filter(row => row?.id);
  if (!supabaseAdmin || sanitizedRows.length === 0) {
    return sanitizedRows;
  }

  const ids = Array.from(new Set(sanitizedRows.map(row => row.id).filter(Boolean)));
  const existingById = new Map<string, any>();

  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabaseAdmin.from("xmum_hangouts").select("*").in("id", chunk);
    if (error) throw error;

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
};

const syncConfigs: Record<string, SyncConfig> = {
  profiles: {
    payloadKey: "profiles",
    table: "xmum_profiles",
    transformRows: rows => collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase)
  },
  hangouts: {
    payloadKey: "hangouts",
    table: "xmum_hangouts",
    transformRows: rows => prepareHangoutRowsForPersistence(rows)
  },
  comments: {
    payloadKey: "comments",
    table: "xmum_comments",
    transformRows: rows => rows.map(sanitizeCommentForDatabase)
  },
  applications: { payloadKey: "applications", table: "xmum_applications" },
  likes: { payloadKey: "likes", table: "xmum_likes" },
  chats: { payloadKey: "chats", table: "xmum_chats" },
  messages: { payloadKey: "messages", table: "xmum_messages" },
  reports: { payloadKey: "reports", table: "xmum_reports" },
  appeals: { payloadKey: "appeals", table: "xmum_appeals" },
  blocks: {
    payloadKey: "blocks",
    table: "xmum_blocks",
    transformRows: rows => sanitizeBlocks(rows),
    removedIdsKey: "removed_block_ids"
  },
  notifications: { payloadKey: "notifications", table: "xmum_notifications" }
};

function isLocalhostHost(host: string) {
  return host.includes("localhost") || host.includes("127.0.0.1");
}

function getRequestProtocol(req: VercelRequest) {
  const forwardedProto = getSingleQueryParam(req.headers["x-forwarded-proto"] as string | string[] | undefined);
  if (forwardedProto) {
    return forwardedProto;
  }

  const host = req.headers.host || "xmum-hangouts.vercel.app";
  return isLocalhostHost(host) ? "http" : "https";
}

function getRequestOrigin(req: VercelRequest) {
  const host = req.headers.host || "xmum-hangouts.vercel.app";
  return `${getRequestProtocol(req)}://${host}`;
}

function getConfiguredAppOrigin() {
  const rawValue = (process.env.APP_URL || "").trim();
  if (!rawValue) return "";

  try {
    const parsed = new URL(rawValue);
    if (isProduction && isLocalhostHost(parsed.host)) {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

function resolveAppUrl(req: VercelRequest) {
  return getConfiguredAppOrigin() || getRequestOrigin(req);
}

function setCors(req: VercelRequest, res: VercelResponse, methods = "GET,OPTIONS,PATCH,DELETE,POST,PUT", headers = "Authorization, X-Local-Auth, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version") {
  const requestOrigin = getRequestOrigin(req);
  const configuredOrigin = getConfiguredAppOrigin();
  const originHeader = typeof req.headers.origin === "string" ? req.headers.origin : "";
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

function consumePasswordLoginAttempt(req: VercelRequest, email: string) {
  const forwarded = typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : "unknown";
  const key = `${forwarded}:${email}`;
  const now = Date.now();
  const current = passwordLoginAttempts.get(key);
  const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + 15 * 60_000 } : { ...current, count: current.count + 1 };
  passwordLoginAttempts.set(key, next);
  return { allowed: next.count <= 8, key, retryAfterSeconds: Math.max(1, Math.ceil((next.resetAt - now) / 1000)) };
}

function getSingleQueryParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getLocalAuthSecret() {
  const secret =
    process.env.JWT_SECRET ||
    (!isProduction ? "xmum-local-dev-secret-change-me" : "");

  if (!secret) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return secret;
}

function generateLocalAuthToken(profile: { id: string; email: string }) {
  const payload = {
    profileId: profile.id,
    email: normalizeProfileEmail(profile.email),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 365
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getLocalAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
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

function mergeProfileWithAuthMetadata(profile: Profile, authUser?: any | null): Profile {
  const userMetadata = authUser?.user_metadata || {};
  const appMetadata = authUser?.app_metadata || {};
  const profileMetadata = userMetadata.xmum_profile || {};
  const passwordHash = appMetadata.xmum_password_hash || profile.password_hash || null;

  return {
    ...profile,
    birthdate: profile.birthdate ?? profileMetadata.birthdate ?? null,
    companion_pet_count: Math.max(
      0,
      Number(profile.companion_pet_count ?? profileMetadata.companion_pet_count ?? 0)
    ),
    companion_selected_state_id:
      profile.companion_selected_state_id ?? profileMetadata.companion_selected_state_id ?? null,
    password_hash: passwordHash
  };
}

async function mirrorProfileToAuthUser(profile: Profile, password?: string) {
  if (!supabaseAdmin || !profile?.email) return;

  try {
    let authUser = await findAuthUserByEmail(profile.email);
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

async function resolveRequestIdentity(req: VercelRequest) {
  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
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

async function resolveBestProfileByEmail(email: string): Promise<Profile | null> {
  const formattedEmail = normalizeProfileEmail(email);
  let { data: profilesByEmail, error: profileError } = await backendProfileClient
    .from("xmum_profiles")
    .select(getProfileSelectColumns())
    .eq("email", formattedEmail);

  if (
    profileError &&
    isMissingOptionalProfileColumnError(profileError)
  ) {
    markUnsupportedProfileColumns(profileError);
    ({ data: profilesByEmail, error: profileError } = await backendProfileClient
      .from("xmum_profiles")
      .select(getProfileSelectColumns())
      .eq("email", formattedEmail));
  }

  if (profileError) {
    console.warn("Backend Supabase profile load failed:", profileError);
    throw new Error("The existing profile could not be loaded from the database.");
  }

  let candidateProfiles = ((profilesByEmail || []) as unknown) as Profile[];

  if (candidateProfiles.length === 0) {
    let { data: insensitiveProfiles, error: insensitiveError } = await backendProfileClient
      .from("xmum_profiles")
      .select(getProfileSelectColumns())
      .ilike("email", escapeSupabaseLikePattern(formattedEmail));

    if (
      insensitiveError &&
      isMissingOptionalProfileColumnError(insensitiveError)
    ) {
      markUnsupportedProfileColumns(insensitiveError);
      ({ data: insensitiveProfiles, error: insensitiveError } = await backendProfileClient
        .from("xmum_profiles")
        .select(getProfileSelectColumns())
        .ilike("email", escapeSupabaseLikePattern(formattedEmail)));
    }

    if (insensitiveError) {
      console.warn("Backend case-insensitive profile load failed:", insensitiveError);
      throw new Error("The existing profile could not be loaded from the database.");
    } else if (insensitiveProfiles?.length) {
      candidateProfiles = ((insensitiveProfiles || []) as unknown as Profile[]).filter(
        profile => normalizeProfileEmail(profile.email) === formattedEmail
      );
    }
  }

  const profile = pickCanonicalProfile(candidateProfiles, { email: formattedEmail });
  if (!profile) return null;

  const authUser = await findAuthUserByEmail(formattedEmail);
  return mergeProfileWithAuthMetadata(profile, authUser);
}

async function upsertProfileWithFallback(profile: Profile, remoteFields: string[] = []) {
  const [preparedProfile] = await prepareProfileRowsForSupabase([profile], supabaseAdmin || supabase, remoteFields);
  if (!preparedProfile) return;

  const { error } = await backendProfileClient.from("xmum_profiles").upsert([preparedProfile]);
  if (error) {
    if (isMissingOptionalProfileColumnError(error)) {
      markUnsupportedProfileColumns(error);
      const [fallbackProfile] = stripUnsupportedProfileColumns([preparedProfile as Record<string, any>], error);
      const fallback = await backendProfileClient.from("xmum_profiles").upsert([fallbackProfile]);
      if (fallback.error) {
        throw fallback.error;
      }
      return;
    }

    throw error;
  }
}

async function prepareProfileRowsForSupabase(rows: Profile[], client = supabaseAdmin || supabase, remoteFields: string[] = []) {
  const collapsedRows = collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase);
  const emails = Array.from(new Set(collapsedRows.map(row => normalizeProfileEmail(row.email || "")).filter(Boolean)));
  const allowedRemoteFields = new Set(remoteFields);

  if (emails.length === 0) {
    return collapsedRows;
  }

  await Promise.all(
    collapsedRows.map(row =>
      mirrorProfileToAuthUser(row as Profile).catch(error => {
        console.warn("Auth metadata mirror during profile sync failed:", error);
      })
    )
  );

  let existingProfiles: Profile[] = [];
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
      console.warn("Existing profile lookup during Vercel sync failed:", error.message);
    } else {
      existingProfiles = ((data || []) as unknown) as Profile[];
    }
  } catch (error) {
    console.warn("Existing profile reconciliation failed before Vercel sync:", error);
  }

  return collapsedRows.map(row => {
    const existing = pickCanonicalProfile(existingProfiles, { email: row.email });
    if (!existing) {
      return row;
    }

    const mergedProfile: Profile = {
      ...existing,
      id: existing.id,
      email: normalizeProfileEmail(existing.email || row.email),
      is_profile_complete: allowedRemoteFields.has("is_profile_complete")
        ? Boolean(existing.is_profile_complete || row.is_profile_complete)
        : Boolean(existing.is_profile_complete)
    } as Profile;

    for (const field of allowedRemoteFields) {
      if (field === "id" || field === "email") continue;
      (mergedProfile as any)[field] = (row as any)[field];
    }

    if (allowedRemoteFields.has("companion_pet_count")) {
      mergedProfile.companion_pet_count = Math.max(
        Number(row.companion_pet_count || 0),
        Number(existing.companion_pet_count || 0)
      );
    }

    if (allowedRemoteFields.has("password_hash")) {
      mergedProfile.password_hash = row.password_hash ?? (existing as any).password_hash ?? null;
    }

    return sanitizeProfileForDatabase(mergedProfile);
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

async function deleteRowsByIds(table: string, ids: string[]) {
  if (!supabaseAdmin || ids.length === 0) return;

  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100);
    const { error } = await supabaseAdmin.from(table).delete().in("id", chunk);
    if (error) throw error;
  }
}

async function filterAuthorizedSyncRows(
  table: string,
  rows: any[],
  identity: { userId: string; email: string }
) {
  const profile = await resolveBestProfileByEmail(identity.email);
  const isAdmin = Boolean(profile?.is_admin && isConfiguredAdminEmail(profile.email));
  if (isAdmin) return rows;

  if (table === "xmum_profiles") {
    return rows.filter(row => row?.id === identity.userId || normalizeProfileEmail(row?.email || "") === identity.email).map(row => ({
      ...row,
      id: profile?.id || identity.userId,
      email: identity.email,
      is_admin: false,
      is_blocked_globally: Boolean(profile?.is_blocked_globally),
      flag_status: profile?.flag_status || "none",
      appeal_count: Number(profile?.appeal_count || 0),
      password_hash: profile?.password_hash || null
    }));
  }
  if (table === "xmum_hangouts") return rows.filter(row => row?.creator_id === identity.userId);
  if (table === "xmum_likes") return rows.filter(row => row?.user_id === identity.userId);
  if (table === "xmum_comments") return rows.filter(row => row?.user_id === identity.userId);
  if (table === "xmum_blocks") return rows.filter(row => row?.blocker_id === identity.userId);
  if (table === "xmum_chats") return rows.filter(row => row?.user_a_id === identity.userId || row?.user_b_id === identity.userId);
  if (table === "xmum_messages") {
    const chatIds = Array.from(new Set(rows.map(row => row?.chat_id).filter(Boolean)));
    const { data } = chatIds.length
      ? await backendProfileClient.from("xmum_chats").select("id,user_a_id,user_b_id").in("id", chatIds)
      : { data: [] as any[] };
    const participantChatIds = new Set((data || []).filter((chat: any) => chat.user_a_id === identity.userId || chat.user_b_id === identity.userId).map((chat: any) => chat.id));
    return rows.filter(row => row?.sender_id === identity.userId && participantChatIds.has(row?.chat_id));
  }
  if (table === "xmum_reports") {
    const ownedRows = rows.filter(row => row?.reporter_id === identity.userId);
    const ids = ownedRows.map(row => row?.id).filter(Boolean);
    const { data } = ids.length
      ? await backendProfileClient.from("xmum_reports").select("*").in("id", ids)
      : { data: [] as any[] };
    const existing = new Map((data || []).map((row: any) => [row.id, row]));
    return ownedRows.map(row => existing.get(row.id) || ({ ...row, reporter_id: identity.userId, status: "pending", reviewed_at: null }));
  }
  if (table === "xmum_notifications") {
    const actorGeneratedTypes = new Set(["hangout_like", "comment_reply", "new_application", "chat_message"]);
    return rows.filter(row => row?.user_id === identity.userId || (
      row?.payload?.actor_user_id === identity.userId && actorGeneratedTypes.has(row?.type)
    ));
  }
  if (table === "xmum_applications") {
    const hangoutIds = Array.from(new Set(rows.map(row => row?.hangout_id).filter(Boolean)));
    const { data } = hangoutIds.length
      ? await backendProfileClient.from("xmum_hangouts").select("id,creator_id").in("id", hangoutIds)
      : { data: [] as any[] };
    const hostedIds = new Set((data || []).filter((hangout: any) => hangout.creator_id === identity.userId).map((hangout: any) => hangout.id));
    return rows.filter(row => {
      if (hostedIds.has(row?.hangout_id)) return true;
      return row?.applicant_id === identity.userId && (row?.status === "pending" || row?.status === "retracted");
    });
  }
  if (table === "xmum_appeals") {
    const reportIds = Array.from(new Set(rows.map(row => row?.report_id).filter(Boolean)));
    const { data } = reportIds.length
      ? await backendProfileClient.from("xmum_reports").select("id,reported_user_id").in("id", reportIds)
      : { data: [] as any[] };
    const ownedReportIds = new Set((data || []).filter((report: any) => report.reported_user_id === identity.userId).map((report: any) => report.id));
    const ownedRows = rows.filter(row => ownedReportIds.has(row?.report_id));
    const ids = ownedRows.map(row => row?.id).filter(Boolean);
    const { data: existingRows } = ids.length
      ? await backendProfileClient.from("xmum_appeals").select("*").in("id", ids)
      : { data: [] as any[] };
    const existing = new Map((existingRows || []).map((row: any) => [row.id, row]));
    return ownedRows.map(row => existing.get(row.id) || ({ ...row, status: "pending", reviewed_at: null }));
  }
  return [];
}

async function filterReadableRows(table: string, rows: any[], identity: { userId: string; email: string } | null) {
  const profile = identity ? await resolveBestProfileByEmail(identity.email) : null;
  const isAdmin = Boolean(profile?.is_admin && isConfiguredAdminEmail(profile.email));
  const userId = identity?.userId || "";

  if (table === "xmum_profiles") {
    return rows.map(row => {
      const { password, password_hash, ...safeRow } = row || {};
      if (isAdmin || row?.id === userId || !row?.hide_details) return safeRow;
      return {
        ...safeRow,
        country: "Hidden",
        languages: [],
        age: 0,
        birthdate: null,
        program: "Hidden",
        year_of_study: "Hidden",
        gender: "Hidden",
        student_type: "Not Specified"
      };
    });
  }
  if (table === "xmum_hangouts") {
    let acceptedHangoutIds = new Set<string>();
    if (userId) {
      const { data } = await backendProfileClient.from("xmum_applications").select("hangout_id").eq("applicant_id", userId).eq("status", "accepted");
      acceptedHangoutIds = new Set((data || []).map((item: any) => item.hangout_id));
    }
    return rows.map(row => isAdmin || row?.creator_id === userId || acceptedHangoutIds.has(row?.id)
      ? row
      : { ...row, meeting_point: "Apply and get accepted to unlock" });
  }
  if (table === "xmum_comments" || table === "xmum_likes") return rows;
  if (!identity) return [];
  if (isAdmin) return rows;
  if (table === "xmum_blocks") return rows.filter(row => row?.blocker_id === userId || row?.blocked_id === userId);
  if (table === "xmum_chats") return rows.filter(row => row?.user_a_id === userId || row?.user_b_id === userId);
  if (table === "xmum_messages") {
    const { data } = await backendProfileClient.from("xmum_chats").select("id,user_a_id,user_b_id");
    const chatIds = new Set((data || []).filter((chat: any) => chat.user_a_id === userId || chat.user_b_id === userId).map((chat: any) => chat.id));
    return rows.filter(row => chatIds.has(row?.chat_id));
  }
  if (table === "xmum_applications") {
    const hangoutIds = Array.from(new Set(rows.map(row => row?.hangout_id).filter(Boolean)));
    const { data } = hangoutIds.length
      ? await backendProfileClient.from("xmum_hangouts").select("id,creator_id").in("id", hangoutIds)
      : { data: [] as any[] };
    const hostedIds = new Set((data || []).filter((hangout: any) => hangout.creator_id === userId).map((hangout: any) => hangout.id));
    return rows.filter(row => row?.applicant_id === userId || hostedIds.has(row?.hangout_id));
  }
  if (table === "xmum_reports") return rows.filter(row => row?.reporter_id === userId || row?.reported_user_id === userId);
  if (table === "xmum_appeals") {
    const { data } = await backendProfileClient.from("xmum_reports").select("id").eq("reported_user_id", userId);
    const reportIds = new Set((data || []).map((report: any) => report.id));
    return rows.filter(row => reportIds.has(row?.report_id));
  }
  if (table === "xmum_notifications") return rows.filter(row => row?.user_id === userId);
  return [];
}

async function handleSyncRequest(req: VercelRequest, res: VercelResponse, config: SyncConfig) {
  const { payloadKey, table, transformRows, removedIdsKey } = config;

  if (req.method === "GET") {
    if (!supabaseAdmin) return res.status(503).json({ error: "Server data connection is unavailable." });
    const { data, error } = await supabaseAdmin.from(table).select("*");
    if (error) return res.status(500).json({ error: `Failed to load ${payloadKey}.` });
    const readableRows = await filterReadableRows(table, data || [], await resolveRequestIdentity(req));
    return res.status(200).json({ [payloadKey]: readableRows });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const identity = await resolveRequestIdentity(req);
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

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: "SUPABASE_SERVICE_ROLE_KEY is required for server-side sync."
      });
    }

    const identityProfile = await resolveBestProfileByEmail(identity.email);
    const isAdmin = Boolean(identityProfile?.is_admin && isConfiguredAdminEmail(identityProfile.email));
    const authorizedData = await filterAuthorizedSyncRows(table, data, identity);
    const rawRows = transformRows ? await transformRows(authorizedData) : authorizedData;
    let removedIds = Array.isArray(req.body?.[removedIdsKey || ""])
      ? req.body[removedIdsKey || ""].filter((id: unknown) => typeof id === "string" && id.trim().length > 0)
      : [];
    if (!isAdmin && removedIds.length > 0) {
      if (table === "xmum_blocks") {
        const { data: removableRows } = await backendProfileClient.from(table).select("id,blocker_id").in("id", removedIds);
        const allowedIds = new Set((removableRows || []).filter((row: any) => row.blocker_id === identity.userId).map((row: any) => row.id));
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
    const rows = table === "xmum_profiles" ? await prepareProfileRowsForSupabase(rawRows as Profile[], supabaseAdmin, profileRemoteFields) : rawRows;
    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from(table).upsert(rows);
      if (error) {
        if (
          table === "xmum_profiles" &&
          isMissingOptionalProfileColumnError(error)
        ) {
          markUnsupportedProfileColumns(error);
          const fallbackRows = stripUnsupportedProfileColumns(rows as Array<Record<string, any>>, error);
          const fallback = await supabaseAdmin.from(table).upsert(fallbackRows);
          if (fallback.error) {
            console.error(`Supabase sync failed for ${table}:`, fallback.error);
            return res.status(500).json({ error: `Failed to sync ${payloadKey} to Supabase.` });
          }
        } else if (table === "xmum_comments" && isMissingCommentColumnError(error, "is_anonymous")) {
          markUnsupportedCommentColumns(error);
          const fallbackRows = (rows as Array<Record<string, any>>).map(sanitizeCommentForDatabase);
          const fallback = await supabaseAdmin.from(table).upsert(fallbackRows);
          if (fallback.error) {
            console.error(`Supabase sync failed for ${table}:`, fallback.error);
            return res.status(500).json({ error: `Failed to sync ${payloadKey} to Supabase.` });
          }
        } else {
          console.error(`Supabase sync failed for ${table}:`, error);
          return res.status(500).json({ error: `Failed to sync ${payloadKey} to Supabase.` });
        }
      }
    }

    if (removedIds.length > 0) {
      await deleteRowsByIds(table, removedIds);
    }

    return res.status(200).json({ success: true, count: data.length });
  } catch (error) {
    console.error(`Failed to sync ${payloadKey}:`, error);
    return res.status(500).json({ error: `Failed to sync ${payloadKey}` });
  }
}

async function upsertCommentsWithFallback(rows: any[]) {
  if (!supabaseAdmin || rows.length === 0) return;

  const sanitizedRows = rows.map(sanitizeCommentForDatabase);
  let { error } = await supabaseAdmin.from("xmum_comments").upsert(sanitizedRows);
  if (error && isMissingCommentColumnError(error, "is_anonymous")) {
    markUnsupportedCommentColumns(error);
    ({ error } = await supabaseAdmin.from("xmum_comments").upsert(rows.map(sanitizeCommentForDatabase)));
  }
  if (error) {
    throw error;
  }
}

async function handleBugReportRequest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    const trimmedPage = typeof sourcePage === "string" && sourcePage.trim() ? sourcePage.trim().slice(0, 120) : "XMUM Hangouts";
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

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "XMUM Hangouts <noreply@xmum-hangouts.reyanzaman.com>",
        to: ADMIN_ACCOUNT_EMAIL,
        reply_to: reporterEmail,
        subject: `[XMUM Hangouts ${requestLabel}] ${trimmedSubject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #0f172a;">
            <h2 style="margin: 0 0 16px; color: #e11d48;">XMUM Hangouts ${escapeHtml(requestLabel)}</h2>
            <p style="margin: 0 0 12px;"><strong>Reporter:</strong> ${escapeHtml(reporter?.name || "XMUM student")} (${escapeHtml(reporterEmail)})</p>
            <p style="margin: 0 0 12px;"><strong>Page:</strong> ${escapeHtml(trimmedPage)}</p>
            <p style="margin: 0 0 12px;"><strong>Subject:</strong> ${escapeHtml(trimmedSubject)}</p>
            <p style="margin: 0 0 12px;"><strong>Submitted:</strong> ${escapeHtml(submittedAt || new Date().toISOString())}</p>
            <div style="margin-top: 20px; padding: 16px; border: 1px solid #fecdd3; border-radius: 12px; background: #fff1f2;">
              <strong style="display: block; margin-bottom: 8px;">Details</strong>
              <div style="line-height: 1.6;">${escapeHtml(trimmedDescription).replace(/\n/g, "<br />")}</div>
            </div>
          </div>
        `
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Support request email delivery failed:", errorText);
      return res.status(502).json({ error: `${requestLabel} email could not be delivered.` });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Support request endpoint failed:", error);
    return res.status(500).json({ error: "Failed to send the support email." });
  }
}

async function handleSendOtp(req: VercelRequest, res: VercelResponse) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Student email is required." });
  }

  const formattedEmail = normalizeProfileEmail(email);
  if (!isXmumEmail(formattedEmail)) {
    return res.status(400).json({
      error: "Only official Xiamen University Malaysia student emails (@xmu.edu.my) are permitted to login or register."
    });
  }

  let isRegistered = false;
  try {
    isRegistered = Boolean(await resolveBestProfileByEmail(formattedEmail));
  } catch (error) {
    console.warn("Backend Supabase registered check returned an error:", error);
    isRegistered = true;
  }

  const now = Date.now();
  const existingOtpState = await getOtpRecord(formattedEmail);
  const requestHistory = existingOtpState?.requestHistory || [];
  const recentRequests = requestHistory.filter(ts => ts > now - 15 * 60 * 1000);

  if (isProduction && recentRequests.length >= 3) {
    return res.status(429).json({
      error: "Security limit reached: You can request at most 3 verification codes every 15 minutes. Please try again later, continue with Microsoft sign-in, or use your password if you already set one.",
      rate_limited: true,
      requires_microsoft: true,
      allows_password_login: true
    });
  }

  const lastRequested = existingOtpState?.lastRequestedAt || null;
  if (isProduction && lastRequested && now - lastRequested < 45000) {
    const waitTime = Math.ceil((45000 - (now - lastRequested)) / 1000);
    return res.status(429).json({
      error: `Please wait ${waitTime} seconds before requesting another verification code, or continue with Microsoft sign-in if you need immediate access.`,
      rate_limited: true,
      requires_microsoft: true,
      allows_password_login: true
    });
  }

  const otp = generateOtpCode();
  if (!isProduction) console.log(`[DEV-OTP] Generated code ${otp} for student: ${formattedEmail}`);

  await saveOtpRecord({
    email: formattedEmail,
    otp: hashOtpCode(formattedEmail, otp, getLocalAuthSecret()),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastRequestedAt: now,
    requestHistory: [...recentRequests, now]
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    if (isProduction) {
      return res.status(500).json({
        error: "Email service is not properly configured. Please try again later."
      });
    }

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
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "XMUM Hangouts <noreply@xmum-hangouts.reyanzaman.com>",
      to: formattedEmail,
      subject: `${otp} is your XMUM Hangouts verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 8px 0 0; letter-spacing: -0.025em;">XMUM Hangouts</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Sepang Campus Meetups & Student Activities</p>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.5; margin-bottom: 20px; text-align: center;">
            Hello student! Here is your one-time verification coordinate to access your profile.
          </p>
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
        </div>
      `
    })
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    console.error("Resend API delivery failure:", errorText);

    if (!isRegistered) {
      return res.status(400).json({
        error: "OTP daily email limit has been reached. New registrations must continue with Microsoft sign-in today.",
        resend_expired: true,
        otp_limit_reached: true,
        requires_microsoft: true,
        allows_password_login: false,
        is_registered: false
      });
    }

    return res.status(429).json({
      error: "OTP daily email limit has been reached. Please sign in with Microsoft or use your password instead.",
      resend_expired: true,
      otp_limit_reached: true,
      requires_microsoft: true,
      allows_password_login: true,
      is_registered: true
    });
  }

  const resendResult = await resendResponse.json();
  return res.status(200).json({
    success: true,
    message: "Code dispatched! Head to your @xmu.edu.my inbox shortly.",
    id: resendResult.id
  });
}

async function handleVerifyOtp(req: VercelRequest, res: VercelResponse) {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP code are required." });
  }

  const formattedEmail = normalizeProfileEmail(email);
  const enteredOtp = String(otp).trim();
  if (!isXmumEmail(formattedEmail)) {
    return res.status(400).json({ error: "Please use your official @xmu.edu.my student email." });
  }
  const storedOtpData = await getOtpRecord(formattedEmail);

  if (!storedOtpData) {
    return res.status(400).json({ error: "No verification code found. Please request a new one." });
  }

  if (Date.now() > storedOtpData.expiresAt) {
    await deleteOtpRecord(formattedEmail);
    return res.status(400).json({ error: "Your verification code has expired. Please request a new one." });
  }

  if (storedOtpData.attempts >= 5) {
    await deleteOtpRecord(formattedEmail);
    return res.status(429).json({ error: "Too many failed verification attempts. Please request a new code." });
  }

  if (!matchesOtpCode(storedOtpData.otp, formattedEmail, enteredOtp, getLocalAuthSecret())) {
    storedOtpData.attempts += 1;
    await saveOtpRecord(storedOtpData);
    return res.status(400).json({
      error: `Incorrect verification code. Attempts remaining: ${5 - storedOtpData.attempts}.`
    });
  }

  await deleteOtpRecord(formattedEmail);

  let profile = await resolveBestProfileByEmail(formattedEmail);

  if (!profile) {
    const studentId = formattedEmail.split("@")[0];
    profile = {
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

    await upsertProfileWithFallback(profile);
  }

  profile = mergeProfileWithAuthMetadata(profile);
  await mirrorProfileToAuthUser(profile);
  return res.status(200).json({
    success: true,
    message: "Identity verified!",
    is_fallback: true,
    profile: sanitizeProfileForClient(profile),
    local_auth_token: generateLocalAuthToken(profile),
    session: {
      access_token: "local_verified_session",
      refresh_token: "local_verified_session",
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      user: { id: profile.id, email: formattedEmail }
    }
  });
}

async function handlePasswordLogin(req: VercelRequest, res: VercelResponse) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email address and password are required parameters." });
  }

  const formattedEmail = normalizeProfileEmail(email);
  if (!isXmumEmail(formattedEmail)) {
    return res.status(400).json({ error: "Please use your official @xmu.edu.my student email." });
  }
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) return res.status(400).json({ error: "Email or password is incorrect." });
  const validatedPassword = passwordValidation.password;
  const attempt = consumePasswordLoginAttempt(req, formattedEmail);
  if (!attempt.allowed) {
    res.setHeader("Retry-After", String(attempt.retryAfterSeconds));
    return res.status(429).json({ error: "Too many login attempts. Please wait a few minutes and try again." });
  }
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
      password_hash: hashPassword(formattedEmail, password)
    };
    await upsertProfileWithFallback(profile);
    await mirrorProfileToAuthUser(profile, password);
  }

  let authResponse = await supabase.auth.signInWithPassword({
    email: formattedEmail,
    password: validatedPassword
  });

  const hasAppPassword = Boolean(profile.password_hash || (profile as any).password);
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
    delete (profile as any).password;
    await upsertProfileWithFallback(profile, ["password_hash"]);
  }

  if (profile.is_blocked_globally) {
    return res.status(400).json({
      error: "Your account is permanently locked due to security reviews."
    });
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
    return res.status(200).json({
      success: true,
      message: "Logged in successfully (Resilient fallback profile session)!",
      is_fallback: true,
      profile: sanitizeProfileForClient(profile),
      local_auth_token: generateLocalAuthToken(profile),
      session: {
        access_token: "resilient_fallback_session_token",
        refresh_token: "resilient_fallback_session_token",
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
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
}

async function handleSetPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  const nextProfile: Profile = {
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

  await upsertProfileWithFallback(nextProfile, ["password_hash"]);
  await mirrorProfileToAuthUser(nextProfile, password);

  return res.status(200).json({ success: true });
}

async function handleLoginBackup(req: VercelRequest, res: VercelResponse) {
  return res.status(410).send("<h3>This sign-in link has been retired for security. Return to XMUM Hangouts and enter the verification code from your email.</h3>");
}

async function handleAuthSession(req: VercelRequest, res: VercelResponse) {
  const identity = await resolveRequestIdentity(req);
  if (!identity) return res.status(401).json({ error: "Session expired." });
  const profile = await resolveBestProfileByEmail(identity.email);
  if (!profile || profile.is_blocked_globally) return res.status(401).json({ error: "Session expired." });
  return res.status(200).json({
    profile: sanitizeProfileForClient(profile),
    local_auth_token: generateLocalAuthToken(profile)
  });
}

async function handleDeleteAccount(req: VercelRequest, res: VercelResponse) {
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

  let authUserId = "";
  let normalizedEmail = "";

  if (accessToken) {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user?.id || !user.email) {
      return res.status(401).json({ error: "We couldn't verify your account for deletion." });
    }

    authUserId = user.id;
    normalizedEmail = normalizeProfileEmail(user.email);
  } else if (localAuth) {
    authUserId = localAuth.profileId;
    normalizedEmail = localAuth.email;
  } else {
    return res.status(401).json({ error: "Please sign in again before deleting your account." });
  }

  const nowIso = new Date().toISOString();

  const [
    profilesRes,
    hangoutsRes,
    applicationsRes,
    likesRes,
    commentsRes,
    chatsRes,
    messagesRes,
    reportsRes,
    appealsRes,
    blocksRes,
    notificationsRes
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

  const profiles = (profilesRes.data as Profile[]) || [];
  const hangouts = (hangoutsRes.data as any[]) || [];
  const applications = (applicationsRes.data as HangoutApplication[]) || [];
  const likes = (likesRes.data as HangoutLike[]) || [];
  const comments = (commentsRes.data as HangoutComment[]) || [];
  const chats = (chatsRes.data as Chat[]) || [];
  const messages = (messagesRes.data as any[]) || [];
  const reports = (reportsRes.data as Report[]) || [];
  const appeals = (appealsRes.data as ReportAppeal[]) || [];
  const blocks = (blocksRes.data as Block[]) || [];
  const notifications = (notificationsRes.data as AppNotification[]) || [];

  const matchingProfiles = profiles.filter(
    profile => profile.id === authUserId || normalizeProfileEmail(profile.email || "") === normalizedEmail
  );
  const userIds = new Set<string>([authUserId, ...matchingProfiles.map(profile => profile.id)]);

  const deletedUserProfile = buildDeletedUserProfile();
  const affectedHangouts = hangouts.filter(hangout => userIds.has(hangout.creator_id) && hangout.status !== "expired");

  const participantNotifications = applications
    .filter(
      application =>
        affectedHangouts.some(hangout => hangout.id === application.hangout_id) &&
        !userIds.has(application.applicant_id) &&
        (application.status === "pending" || application.status === "accepted")
    )
    .map(application => {
      const relatedHangout = affectedHangouts.find(hangout => hangout.id === application.hangout_id);
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
      profile => !userIds.has(profile.id) && normalizeProfileEmail(profile.email || "") !== normalizedEmail
    ),
    deletedUserProfile
  ];
  const nextHangouts = hangouts.map(hangout =>
    !userIds.has(hangout.creator_id)
      ? hangout
      : { ...hangout, creator_id: SYSTEM_DELETED_USER_ID, status: "expired", updated_at: nowIso }
  );
  const nextComments = comments.flatMap(comment => {
    if (!userIds.has(comment.user_id)) return [comment];

    const relatedHangout = nextHangouts.find(hangout => hangout.id === comment.hangout_id);
    if (relatedHangout?.status === "expired") {
      return [{ ...comment, user_id: SYSTEM_DELETED_USER_ID }];
    }

    return [];
  });
  const nextApplications = applications.filter(application => !userIds.has(application.applicant_id));
  const nextLikes = likes.filter(like => !userIds.has(like.user_id));
  const nextBlocks = blocks.filter(block => !userIds.has(block.blocker_id) && !userIds.has(block.blocked_id));
  const nextReports = reports.filter(report => !userIds.has(report.reporter_id) && !userIds.has(report.reported_user_id));
  const remainingReportIds = new Set(nextReports.map(report => report.id));
  const nextAppeals = appeals.filter(appeal => remainingReportIds.has(appeal.report_id));
  const nextChats = chats.filter(chat => !userIds.has(chat.user_a_id) && !userIds.has(chat.user_b_id));
  const keptChatIds = new Set(nextChats.map(chat => chat.id));
  const nextMessages = messages.filter(message => keptChatIds.has(message.chat_id) && !userIds.has(message.sender_id));
  const nextNotifications = [
    ...notifications.filter(notification => !userIds.has(notification.user_id)),
    ...participantNotifications
  ];

  await supabaseAdmin.from("xmum_profiles").upsert([sanitizeProfileForDatabase(deletedUserProfile)]);
  const persistedHangouts = await prepareHangoutRowsForPersistence(nextHangouts);
  const persistedComments = nextComments.map(sanitizeCommentForDatabase);

  await supabaseAdmin.from("xmum_hangouts").upsert(persistedHangouts);
  await upsertCommentsWithFallback(persistedComments);
  await supabaseAdmin.from("xmum_notifications").upsert(nextNotifications);

  await deleteRowsByIds("xmum_messages", messages.filter(message => !nextMessages.some(item => item.id === message.id)).map(message => message.id));
  await deleteRowsByIds("xmum_chats", chats.filter(chat => !nextChats.some(item => item.id === chat.id)).map(chat => chat.id));
  await deleteRowsByIds("xmum_likes", likes.filter(like => !nextLikes.some(item => item.id === like.id)).map(like => like.id));
  await deleteRowsByIds("xmum_applications", applications.filter(application => !nextApplications.some(item => item.id === application.id)).map(application => application.id));
  await deleteRowsByIds("xmum_appeals", appeals.filter(appeal => !nextAppeals.some(item => item.id === appeal.id)).map(appeal => appeal.id));
  await deleteRowsByIds("xmum_reports", reports.filter(report => !nextReports.some(item => item.id === report.id)).map(report => report.id));
  await deleteRowsByIds("xmum_blocks", blocks.filter(block => !nextBlocks.some(item => item.id === block.id)).map(block => block.id));
  await deleteRowsByIds(
    "xmum_notifications",
    notifications.filter(notification => !nextNotifications.some(item => item.id === notification.id)).map(notification => notification.id)
  );
  await deleteRowsByIds("xmum_comments", comments.filter(comment => !nextComments.some(item => item.id === comment.id)).map(comment => comment.id));
  await deleteRowsByIds("xmum_profiles", matchingProfiles.map(profile => profile.id).filter(id => id !== SYSTEM_DELETED_USER_ID));

  if (accessToken) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (authDeleteError) {
      console.error("Supabase auth user deletion failed:", authDeleteError);
    }
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
}

export async function handleResourceRootRoute(req: VercelRequest, res: VercelResponse, resource: string) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (resource === "bug-report") {
    return handleBugReportRequest(req, res);
  }

  const config = syncConfigs[resource];
  if (!config) {
    return res.status(404).json({ error: "Route not found" });
  }

  return handleSyncRequest(req, res, config);
}

export async function handleResourceSyncRoute(req: VercelRequest, res: VercelResponse, resource: string) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const config = syncConfigs[resource];
  if (!config) {
    return res.status(404).json({ error: "Route not found" });
  }

  return handleSyncRequest(req, res, config);
}

export async function handleAuthRoute(req: VercelRequest, res: VercelResponse, action: string) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    if (action === "send-otp") {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      return await handleSendOtp(req, res);
    }

    if (action === "verify-otp") {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      return await handleVerifyOtp(req, res);
    }

    if (action === "login-password") {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      return await handlePasswordLogin(req, res);
    }

    if (action === "set-password") {
      return await handleSetPassword(req, res);
    }

    if (action === "session") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      return await handleAuthSession(req, res);
    }

    if (action === "login-backup") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      return await handleLoginBackup(req, res);
    }

    return res.status(404).json({ error: "Route not found" });
  } catch (error) {
    console.error(`Auth route failed for action ${action}:`, error);
    if (error instanceof OtpStorageConfigurationError) {
      return res.status(503).json({
        error: "Verification-code sign-in is still being finalized for deployment. Please continue with Microsoft sign-in or password login for now.",
        requires_microsoft: true,
        allows_password_login: true
      });
    }
    return res.status(500).json({ error: "Internal security gateway execution error." });
  }
}

export async function handlePushRoute(req: VercelRequest, res: VercelResponse, action: string) {
  setCors(req, res, "GET,OPTIONS,POST", "Content-Type, Authorization, X-Local-Auth");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (action === "public-key") {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const publicKey = getVapidPublicKey();
    return publicKey
      ? res.status(200).json({ publicKey })
      : res.status(503).json({ error: "Push notifications are not configured yet." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Push notifications require the server database connection." });
  }

  if (action === "process-reminders") {
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const cronSecret = (process.env.CRON_SECRET || "").trim();
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

  const identity = await resolveRequestIdentity(req);
  if (!identity) {
    return res.status(401).json({ error: "Please sign in again to manage notifications." });
  }

  try {
    if (action === "subscribe") {
      if (!isPushConfigured()) return res.status(503).json({ error: "Push notifications are not configured yet." });
      await savePushSubscription(supabaseAdmin, identity, req.body?.subscription, req.headers["user-agent"] || "");
      return res.status(200).json({ success: true });
    }
    if (action === "unsubscribe") {
      const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
      if (!endpoint) return res.status(400).json({ error: "A subscription endpoint is required." });
      await removePushSubscription(supabaseAdmin, identity, endpoint);
      return res.status(200).json({ success: true });
    }
    if (action === "dispatch") {
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
    console.error(`Push route ${action} failed:`, error);
    return res.status(500).json({ error: "We couldn't complete the notification request." });
  }
}

export async function handleAccountRoute(req: VercelRequest, res: VercelResponse, action: string) {
  setCors(req, res, "OPTIONS,POST", "Content-Type, Authorization, X-Local-Auth");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (action !== "delete") {
    return res.status(404).json({ error: "Route not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    return await handleDeleteAccount(req, res);
  } catch (error) {
    console.error("Account deletion endpoint failed:", error);
    return res.status(500).json({ error: "We couldn't finish deleting this account." });
  }
}
