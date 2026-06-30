import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { hashPassword, matchesStoredPassword } from "../../src/lib/security";
import { normalizeProfileEmail, pickCanonicalProfile } from "../../src/lib/profiles";
import type { Profile } from "../../src/types";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bssljvoorzotsiskhpcl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resolveBestProfileByEmail(email: string): Promise<Profile | null> {
  const formattedEmail = normalizeProfileEmail(email);
  const { data: profilesByEmail, error: profileError } = await supabase
    .from("xmum_profiles")
    .select("*")
    .eq("email", formattedEmail);

  if (profileError) {
    console.warn("Backend Supabase profile load failed on password login:", profileError);
  }

  return pickCanonicalProfile((profilesByEmail || []) as Profile[], { email: formattedEmail });
}

function getDeterministicPassword(email: string): string {
  const secretSalt =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "xmum-local-dev-secret-change-me" : "");

  if (!secretSalt) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return crypto.createHmac("sha256", secretSalt).update(email).digest("hex");
}

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
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

    if (!profile.password_hash && !profile.password) {
      return res.status(400).json({
        error: "No password has been configured for this account. Please log in with a verification code to set your password."
      });
    }

    if (!matchesStoredPassword(formattedEmail, password, profile)) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    if (!profile.password_hash) {
      profile.password_hash = hashPassword(formattedEmail, password);
      delete profile.password;
      await supabase.from("xmum_profiles").upsert([profile]);
    }

    if (profile.is_blocked_globally) {
      return res.status(400).json({
        error: "Your account is permanently locked due to security reviews."
      });
    }

    const deterministicPassword = getDeterministicPassword(formattedEmail);
    const ret = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: deterministicPassword
    });

    if (ret.error || !ret.data?.session) {
      return res.status(200).json({
        success: true,
        message: "Logged in successfully (Resilient fallback profile session)!",
        is_fallback: true,
        profile,
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
      session: {
        access_token: ret.data.session.access_token,
        refresh_token: ret.data.session.refresh_token,
        expires_at: ret.data.session.expires_at,
        user: ret.data.user
      }
    });
  } catch (err) {
    console.error("Password login exception:", err);
    return res.status(500).json({ error: "An error occurred during password authentication." });
  }
};
