import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getOtpRecord, OtpStorageConfigurationError, saveOtpRecord } from '../utils/otp-store';
import { normalizeProfileEmail, pickCanonicalProfile } from '../../src/lib/profiles';
import type { Profile } from '../../src/types';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bssljvoorzotsiskhpcl.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_bcss09rrbiJbwHx03f5A1g_QViwGFFI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async (req: VercelRequest, res: VercelResponse) => {
  const isProduction = process.env.NODE_ENV === "production";
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Student email is required." });
    }

    const formattedEmail = normalizeProfileEmail(email);

    // Server-side validation of email domain restriction
    if (!formattedEmail.endsWith("@xmu.edu.my")) {
      return res.status(400).json({
        error: "Only official Xiamen University Malaysia student emails (@xmu.edu.my) are permitted to login or register."
      });
    }

    // Check if user is already registered (profile exists)
    let isRegistered = false;
    try {
      const { data, error } = await supabase
        .from("xmum_profiles")
        .select("*")
        .eq("email", formattedEmail);
      if (error) {
        console.warn("Backend Supabase registered check returned an error:", error.message);
      }
      isRegistered = !!pickCanonicalProfile((data || []) as Profile[], { email: formattedEmail });
    } catch (dbErr) {
      console.warn("Backend Supabase fetch registered check errored:", dbErr);
      // Default to true to allow safer onboarding
      isRegistered = true;
    }

    const now = Date.now();
    const existingOtpState = await getOtpRecord(formattedEmail);
    const requestHistory = existingOtpState?.requestHistory || [];
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
    const lastRequested = existingOtpState?.lastRequestedAt || null;
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

    // Resolve dynamic baseUrl from headers
    const host = req.headers.host || "xmum-hangouts.vercel.app";
    const protocol = "https";
    const baseUrl = `${protocol}://${host}`;
    const magicLink = `${baseUrl}/api/auth/login-backup?email=${encodeURIComponent(formattedEmail)}&otp=${otp}`;

    // Email template
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px;">🌸</span>
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 8px 0 0; letter-spacing: -0.025em;">XMUM Hangouts</h2>
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
            This code will expire in 60 minutes.
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; margin-top: 20px;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
            Alternatively, use this secondary auto-login option:
          </p>
          
          <a href="${magicLink}" target="_blank" style="display: inline-block; background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.15s ease;">
            ⚡️ Fast Sign In (Magic Link)
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 10px; line-height: 1.4; margin-top: 32px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
          This security email was delivered via Resend. If you did not request this login attempt, you can safely ignore this message.
        </p>
      </div>
    `;

    // Resend API delivery
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      if (isProduction) {
        console.error("RESEND_API_KEY environment variable is not set");
        return res.status(500).json({
          error: "Email service is not properly configured. Please try again later."
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
    if (apiErr instanceof OtpStorageConfigurationError) {
      return res.status(503).json({
        error: "Verification-code sign-in is still being finalized for deployment. Please continue with Microsoft sign-in or password login for now.",
        requires_microsoft: true,
        allows_password_login: true
      });
    }
    return res.status(500).json({ error: "Internal security gateway execution error." });
  }
};
