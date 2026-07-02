import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { collapseProfilesByEmail, normalizeProfileEmail, pickCanonicalProfile } from "../lib/profiles.js";
import { hashPassword, matchesStoredPassword } from "../lib/security.js";
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

function escapeSupabaseLikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isConfiguredAdminEmail(email: string) {
  return normalizeProfileEmail(email) === ADMIN_ACCOUNT_EMAIL;
}

type SyncConfig = {
  payloadKey: string;
  table: string;
  transformRows?: (rows: any[]) => any[];
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

const profileColumnSupport = {
  birthdate: true,
  password_hash: true,
  companion_pet_count: true,
  companion_selected_state_id: true
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

const syncConfigs: Record<string, SyncConfig> = {
  profiles: {
    payloadKey: "profiles",
    table: "xmum_profiles",
    transformRows: rows => collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase)
  },
  hangouts: { payloadKey: "hangouts", table: "xmum_hangouts" },
  comments: { payloadKey: "comments", table: "xmum_comments" },
  applications: { payloadKey: "applications", table: "xmum_applications" },
  likes: { payloadKey: "likes", table: "xmum_likes" },
  chats: { payloadKey: "chats", table: "xmum_chats" },
  messages: { payloadKey: "messages", table: "xmum_messages" },
  reports: { payloadKey: "reports", table: "xmum_reports" },
  appeals: { payloadKey: "appeals", table: "xmum_appeals" },
  blocks: { payloadKey: "blocks", table: "xmum_blocks" },
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

function setCors(req: VercelRequest, res: VercelResponse, methods = "GET,OPTIONS,PATCH,DELETE,POST,PUT", headers = "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version") {
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

function getDeterministicPassword(email: string): string {
  return crypto.createHmac("sha256", getLocalAuthSecret()).update(email).digest("hex");
}

function generateLocalAuthToken(profile: { id: string; email: string }) {
  const payload = {
    profileId: profile.id,
    email: normalizeProfileEmail(profile.email),
    exp: Date.now() + 1000 * 60 * 15
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getLocalAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyLocalAuthToken(token: string | undefined | null) {
  if (!token || !token.includes(".")) return null;

  const [encodedPayload, providedSignature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", getLocalAuthSecret()).update(encodedPayload).digest("base64url");
  if (providedSignature !== expectedSignature) {
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

async function resolveBestProfileByEmail(email: string): Promise<Profile | null> {
  const formattedEmail = normalizeProfileEmail(email);
  let { data: profilesByEmail, error: profileError } = await backendProfileClient
    .from("xmum_profiles")
    .select(getProfileSelectColumns())
    .eq("email", formattedEmail);

  if (
    profileError &&
    (
      isMissingPasswordHashColumnError(profileError) ||
      isMissingProfileColumnError(profileError, "companion_pet_count") ||
      isMissingProfileColumnError(profileError, "companion_selected_state_id") || isMissingProfileColumnError(profileError, "birthdate")
    )
  ) {
    markUnsupportedProfileColumns(profileError);
    ({ data: profilesByEmail, error: profileError } = await backendProfileClient
      .from("xmum_profiles")
      .select(getProfileSelectColumns())
      .eq("email", formattedEmail));
  }

  if (profileError) {
    console.warn("Backend Supabase profile load failed:", profileError);
  }

  let candidateProfiles = ((profilesByEmail || []) as unknown) as Profile[];

  if (candidateProfiles.length === 0) {
    let { data: insensitiveProfiles, error: insensitiveError } = await backendProfileClient
      .from("xmum_profiles")
      .select(getProfileSelectColumns())
      .ilike("email", escapeSupabaseLikePattern(formattedEmail));

    if (
      insensitiveError &&
      (
        isMissingPasswordHashColumnError(insensitiveError) ||
        isMissingProfileColumnError(insensitiveError, "companion_pet_count") ||
        isMissingProfileColumnError(insensitiveError, "companion_selected_state_id") || isMissingProfileColumnError(insensitiveError, "birthdate")
      )
    ) {
      markUnsupportedProfileColumns(insensitiveError);
      ({ data: insensitiveProfiles, error: insensitiveError } = await backendProfileClient
        .from("xmum_profiles")
        .select(getProfileSelectColumns())
        .ilike("email", escapeSupabaseLikePattern(formattedEmail)));
    }

    if (insensitiveError) {
      console.warn("Backend case-insensitive profile load failed:", insensitiveError);
    } else if (insensitiveProfiles?.length) {
      candidateProfiles = ((insensitiveProfiles || []) as unknown as Profile[]).filter(
        profile => normalizeProfileEmail(profile.email) === formattedEmail
      );
    }
  }

  return pickCanonicalProfile(candidateProfiles, { email: formattedEmail });
}

async function upsertProfileWithFallback(profile: Profile) {
  const [preparedProfile] = await prepareProfileRowsForSupabase([profile], supabaseAdmin || supabase);
  if (!preparedProfile) return;

  const { error } = await backendProfileClient.from("xmum_profiles").upsert([preparedProfile]);
  if (error) {
    if (
      isMissingPasswordHashColumnError(error) ||
      isMissingProfileColumnError(error, "companion_pet_count") ||
      isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
    ) {
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

async function prepareProfileRowsForSupabase(rows: Profile[], client = supabaseAdmin || supabase) {
  const collapsedRows = collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase);
  const emails = Array.from(new Set(collapsedRows.map(row => normalizeProfileEmail(row.email || "")).filter(Boolean)));

  if (emails.length === 0) {
    return collapsedRows;
  }

  let existingProfiles: Profile[] = [];
  try {
    let { data, error } = await client.from("xmum_profiles").select(getProfileSelectColumns()).in("email", emails);
    if (
      error &&
      (
        isMissingPasswordHashColumnError(error) ||
        isMissingProfileColumnError(error, "companion_pet_count") ||
        isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
      )
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

    return sanitizeProfileForDatabase({
      ...existing,
      ...row,
      id: existing.id,
      email: normalizeProfileEmail(existing.email || row.email),
      is_profile_complete: Boolean(existing.is_profile_complete || row.is_profile_complete),
      companion_pet_count: Math.max(Number(row.companion_pet_count || 0), Number(existing.companion_pet_count || 0)),
      companion_selected_state_id: row.companion_selected_state_id ?? existing.companion_selected_state_id ?? null,
      password_hash: row.password_hash ?? (existing as any).password_hash ?? null
    });
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

async function handleSyncRequest(req: VercelRequest, res: VercelResponse, config: SyncConfig) {
  const { payloadKey, table, transformRows } = config;

  if (req.method === "GET") {
    return res.status(200).json({ [payloadKey]: [] });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body?.[payloadKey];
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid payload: must be array." });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: "SUPABASE_SERVICE_ROLE_KEY is required for server-side sync."
      });
    }

    const rawRows = transformRows ? transformRows(data) : data;
    const rows = table === "xmum_profiles" ? await prepareProfileRowsForSupabase(rawRows as Profile[], supabaseAdmin) : rawRows;
    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from(table).upsert(rows);
      if (error) {
        if (
          table === "xmum_profiles" &&
          (
            isMissingPasswordHashColumnError(error) ||
            isMissingProfileColumnError(error, "companion_pet_count") ||
            isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
          )
        ) {
          markUnsupportedProfileColumns(error);
          const fallbackRows = stripUnsupportedProfileColumns(rows as Array<Record<string, any>>, error);
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

    return res.status(200).json({ success: true, count: data.length });
  } catch (error) {
    console.error(`Failed to sync ${payloadKey}:`, error);
    return res.status(500).json({ error: `Failed to sync ${payloadKey}` });
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
  if (!formattedEmail.endsWith("@xmu.edu.my")) {
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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[SECURITY-OTP] Generated code ${otp} for student: ${formattedEmail}`);

  await saveOtpRecord({
    email: formattedEmail,
    otp,
    expiresAt: now + 60 * 60 * 1000,
    attempts: 0,
    lastRequestedAt: now,
    requestHistory: [...recentRequests, now]
  });

  const baseUrl = getRequestOrigin(req);
  const magicLink = `${baseUrl}/api/auth/login-backup?email=${encodeURIComponent(formattedEmail)}&otp=${otp}`;

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
              This code will expire in 60 minutes.
            </p>
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; margin-top: 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
              Alternatively, use this secondary auto-login option:
            </p>
            <a href="${magicLink}" target="_blank" style="display: inline-block; background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-align: center; cursor: pointer;">
              Fast Sign In
            </a>
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

  if (enteredOtp !== storedOtpData.otp) {
    storedOtpData.attempts += 1;
    await saveOtpRecord(storedOtpData);
    return res.status(400).json({
      error: `Incorrect verification code. Attempts remaining: ${5 - storedOtpData.attempts}.`
    });
  }

  await deleteOtpRecord(formattedEmail);

  const deterministicPassword = getDeterministicPassword(formattedEmail);
  let authResponse = await supabase.auth.signInWithPassword({
    email: formattedEmail,
    password: deterministicPassword
  });

  if (authResponse.error || !authResponse.data?.session) {
    const signUpResponse = await supabase.auth.signUp({
      email: formattedEmail,
      password: deterministicPassword
    });

    if (!signUpResponse.error) {
      authResponse = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: deterministicPassword
      });
    }
  }

  const { data: matchedProfiles } = await backendProfileClient
    .from("xmum_profiles")
    .select("*")
    .eq("email", formattedEmail);

  let profile = pickCanonicalProfile((matchedProfiles || []) as Profile[], {
    email: formattedEmail,
    authUserId: authResponse.data?.user?.id
  });

  if (!profile) {
    const studentId = formattedEmail.split("@")[0];
    profile = {
      id: authResponse.data?.user?.id || `user_${Math.random().toString(36).slice(2, 11)}`,
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
      is_admin: isConfiguredAdminEmail(formattedEmail) || formattedEmail.startsWith("admin"),
      is_blocked_globally: false,
      flag_status: "none",
      appeal_count: 0
    };

    await upsertProfileWithFallback(profile);
  }

  if (authResponse.error || !authResponse.data?.session) {
    return res.status(200).json({
      success: true,
      message: "Identity verified! (Validated fallback session)",
      is_fallback: true,
      profile,
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

  return res.status(200).json({
    success: true,
    message: "Identity verified! Authorizing app session.",
    is_fallback: false,
    profile,
    local_auth_token: generateLocalAuthToken(profile),
    session: {
      access_token: authResponse.data.session.access_token,
      refresh_token: authResponse.data.session.refresh_token,
      expires_at: authResponse.data.session.expires_at,
      user: authResponse.data.user
    }
  });
}

async function handlePasswordLogin(req: VercelRequest, res: VercelResponse) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email address and password are required parameters." });
  }

  const formattedEmail = normalizeProfileEmail(email);
  const profile = await resolveBestProfileByEmail(formattedEmail);

  if (!profile) {
    return res.status(404).json({
      error: "No registered profile found with this email. Registrations require a verified verification code first."
    });
  }

  if (!profile.password_hash && !(profile as any).password) {
    return res.status(400).json({
      error: "No password has been configured for this account. Please log in with a verification code to set your password."
    });
  }

  if (!matchesStoredPassword(formattedEmail, password, profile)) {
    return res.status(401).json({ error: "Incorrect password. Please try again." });
  }

  if (!profile.password_hash) {
    profile.password_hash = hashPassword(formattedEmail, password);
    delete (profile as any).password;
    await upsertProfileWithFallback(profile);
  }

  if (profile.is_blocked_globally) {
    return res.status(400).json({
      error: "Your account is permanently locked due to security reviews."
    });
  }

  const deterministicPassword = getDeterministicPassword(formattedEmail);
  const authResponse = await supabase.auth.signInWithPassword({
    email: formattedEmail,
    password: deterministicPassword
  });

  if (authResponse.error || !authResponse.data?.session) {
    return res.status(200).json({
      success: true,
      message: "Logged in successfully (Resilient fallback profile session)!",
      is_fallback: true,
      profile,
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

  return res.status(200).json({
    success: true,
    message: "Logged in successfully!",
    is_fallback: false,
    profile,
    local_auth_token: generateLocalAuthToken(profile),
    session: {
      access_token: authResponse.data.session.access_token,
      refresh_token: authResponse.data.session.refresh_token,
      expires_at: authResponse.data.session.expires_at,
      user: authResponse.data.user
    }
  });
}

async function handleLoginBackup(req: VercelRequest, res: VercelResponse) {
  const email = getSingleQueryParam(req.query.email as string | string[] | undefined);
  const otp = getSingleQueryParam(req.query.otp as string | string[] | undefined);

  if (!email || !otp) {
    return res.status(400).send("<h3>Missing backup query parameters</h3>");
  }

  const formattedEmail = normalizeProfileEmail(email);
  const codeStr = otp.trim();

  try {
    const entry = await getOtpRecord(formattedEmail);
    if (!entry || entry.otp !== codeStr || Date.now() > entry.expiresAt) {
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h3>Invalid or Expired Backup Verification Link</h3>
          <p style="color: #64748b;">The code has already been verified or the session expired. Please return to the app and request a fresh login link.</p>
        </div>
      `);
    }

    await deleteOtpRecord(formattedEmail);

    const deterministicPassword = getDeterministicPassword(formattedEmail);
    let sessionData: any = null;
    let sessionErr: any = null;

    const loginResult = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: deterministicPassword
    });
    sessionData = loginResult.data;
    sessionErr = loginResult.error;

    if (sessionErr) {
      const signUpResult = await supabase.auth.signUp({
        email: formattedEmail,
        password: deterministicPassword
      });

      if (!signUpResult.error) {
        const retrySession = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: deterministicPassword
        });
        sessionData = retrySession.data;
        sessionErr = retrySession.error;
      }
    }

    if (sessionErr || !sessionData?.session) {
      return res.status(500).send("<h3>Authentication service is temporarily busy. Try logging in normally.</h3>");
    }

    const accessToken = sessionData.session.access_token;
    const refreshToken = sessionData.session.refresh_token;
    const appUrl = resolveAppUrl(req);
    return res.redirect(`${appUrl}/#access_token=${accessToken}&refresh_token=${refreshToken}`);
  } catch (error) {
    if (error instanceof OtpStorageConfigurationError) {
      return res.status(503).send("<h3>Verification-code sign-in is still being finalized for deployment. Please return to the app and use Microsoft sign-in or password login.</h3>");
    }

    console.error("Backup Login exception:", error);
    return res.status(500).send("<h3>Internal server validation error</h3>");
  }
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
  await supabaseAdmin.from("xmum_hangouts").upsert(nextHangouts);
  await supabaseAdmin.from("xmum_comments").upsert(nextComments);
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
    hangouts: nextHangouts,
    applications: nextApplications,
    likes: nextLikes,
    comments: nextComments,
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
