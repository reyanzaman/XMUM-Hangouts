import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const SYSTEM_DELETED_USER_ID = "deleted_user";
const SYSTEM_DELETED_USER_EMAIL = "deleted.user@system.local";

const normalizeProfileEmail = (email: string) => email.trim().toLowerCase();

const getLocalAuthSecret = () => {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "xmum-local-dev-secret-change-me" : "");

  if (!secret) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return secret;
};

const verifyLocalAuthToken = (token: string | undefined | null) => {
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
};

const buildDeletedUserProfile = () => ({
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
  is_demo_profile: true
});

async function deleteRowsByIds(table: string, ids: string[]) {
  if (!supabaseAdmin || ids.length === 0) return;

  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100);
    const { error } = await supabaseAdmin.from(table).delete().in("id", chunk);
    if (error) throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Local-Auth");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    const profiles = (profilesRes.data as any[]) || [];
    const hangouts = (hangoutsRes.data as any[]) || [];
    const applications = (applicationsRes.data as any[]) || [];
    const likes = (likesRes.data as any[]) || [];
    const comments = (commentsRes.data as any[]) || [];
    const chats = (chatsRes.data as any[]) || [];
    const messages = (messagesRes.data as any[]) || [];
    const reports = (reportsRes.data as any[]) || [];
    const appeals = (appealsRes.data as any[]) || [];
    const blocks = (blocksRes.data as any[]) || [];
    const notifications = (notificationsRes.data as any[]) || [];

    const matchingProfiles = profiles.filter(
      (profile: any) =>
        profile.id === authUserId ||
        normalizeProfileEmail(profile.email || "") === normalizedEmail
    );
    const userIds = new Set<string>([authUserId, ...matchingProfiles.map((profile: any) => profile.id)]);

    const deletedUserProfile = buildDeletedUserProfile();
    const affectedHangouts = hangouts.filter(
      (hangout: any) => userIds.has(hangout.creator_id) && hangout.status !== "expired"
    );

    const participantNotifications = applications
      .filter(
        (application: any) =>
          affectedHangouts.some((hangout: any) => hangout.id === application.hangout_id) &&
          !userIds.has(application.applicant_id) &&
          (application.status === "pending" || application.status === "accepted")
      )
      .map((application: any) => {
        const relatedHangout = affectedHangouts.find((hangout: any) => hangout.id === application.hangout_id);
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
      if (!userIds.has(hangout.creator_id)) return hangout;
      return {
        ...hangout,
        creator_id: SYSTEM_DELETED_USER_ID,
        status: "expired",
        updated_at: nowIso
      };
    });

    const nextComments = comments.flatMap((comment: any) => {
      if (!userIds.has(comment.user_id)) return [comment];

      const relatedHangout = nextHangouts.find((hangout: any) => hangout.id === comment.hangout_id);
      if (relatedHangout?.status === "expired") {
        return [{ ...comment, user_id: SYSTEM_DELETED_USER_ID }];
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

    await supabaseAdmin.from("xmum_profiles").upsert([deletedUserProfile]);
    await supabaseAdmin.from("xmum_hangouts").upsert(nextHangouts);
    await supabaseAdmin.from("xmum_comments").upsert(nextComments);
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
  } catch (error) {
    console.error("Account deletion endpoint failed:", error);
    return res.status(500).json({ error: "We couldn't finish deleting this account." });
  }
};
