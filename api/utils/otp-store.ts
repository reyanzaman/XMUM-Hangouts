import { createClient } from "@supabase/supabase-js";

export interface OtpRecord {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  lastRequestedAt: number | null;
  requestHistory: number[];
}

const OTP_TABLE = "xmum_otp_codes";
const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const memoryOtpStore = new Map<string, OtpRecord>();

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

export class OtpStorageConfigurationError extends Error {}

const isMissingTableError = (error: any) =>
  error?.code === "PGRST205" ||
  typeof error?.message === "string" && error.message.includes(`public.${OTP_TABLE}`);

const parseHistory = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => {
      if (typeof entry === "number") return entry;
      const parsed = Date.parse(String(entry));
      return Number.isFinite(parsed) ? parsed : NaN;
    })
    .filter(Number.isFinite);
};

const mapRowToRecord = (row: any): OtpRecord => ({
  email: String(row.email || "").trim().toLowerCase(),
  otp: String(row.otp || ""),
  expiresAt: Date.parse(String(row.expires_at || 0)),
  attempts: Number(row.attempts || 0),
  lastRequestedAt: row.last_requested_at ? Date.parse(String(row.last_requested_at)) : null,
  requestHistory: parseHistory(row.request_history)
});

const mapRecordToRow = (record: OtpRecord) => ({
  email: record.email,
  otp: record.otp,
  expires_at: new Date(record.expiresAt).toISOString(),
  attempts: record.attempts,
  last_requested_at: record.lastRequestedAt ? new Date(record.lastRequestedAt).toISOString() : null,
  request_history: record.requestHistory.map(timestamp => new Date(timestamp).toISOString())
});

async function readOtpRow(email: string): Promise<OtpRecord | null> {
  if (!supabaseAdmin) {
    if (isProduction) {
      throw new OtpStorageConfigurationError("SUPABASE_SERVICE_ROLE_KEY is required for OTP login in production.");
    }
    return memoryOtpStore.get(email) || null;
  }

  const { data, error } = await supabaseAdmin
    .from(OTP_TABLE)
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      if (isProduction) {
        throw new OtpStorageConfigurationError(
          `Supabase table ${OTP_TABLE} is missing. Run the OTP migration before deploying OTP login.`
        );
      }

      return memoryOtpStore.get(email) || null;
    }

    throw error;
  }

  return data ? mapRowToRecord(data) : null;
}

async function writeOtpRow(record: OtpRecord): Promise<void> {
  if (!supabaseAdmin) {
    if (isProduction) {
      throw new OtpStorageConfigurationError("SUPABASE_SERVICE_ROLE_KEY is required for OTP login in production.");
    }
    memoryOtpStore.set(record.email, record);
    return;
  }

  const { error } = await supabaseAdmin.from(OTP_TABLE).upsert(mapRecordToRow(record));
  if (error) {
    if (isMissingTableError(error)) {
      if (isProduction) {
        throw new OtpStorageConfigurationError(
          `Supabase table ${OTP_TABLE} is missing. Run the OTP migration before deploying OTP login.`
        );
      }

      memoryOtpStore.set(record.email, record);
      return;
    }

    throw error;
  }
}

async function deleteOtpRow(email: string): Promise<void> {
  if (!supabaseAdmin) {
    memoryOtpStore.delete(email);
    return;
  }

  const { error } = await supabaseAdmin.from(OTP_TABLE).delete().eq("email", email);
  if (error) {
    if (isMissingTableError(error) && !isProduction) {
      memoryOtpStore.delete(email);
      return;
    }

    throw error;
  }
}

export async function getOtpRecord(email: string): Promise<OtpRecord | null> {
  return readOtpRow(email);
}

export async function saveOtpRecord(record: OtpRecord): Promise<void> {
  await writeOtpRow(record);
}

export async function deleteOtpRecord(email: string): Promise<void> {
  await deleteOtpRow(email);
}
