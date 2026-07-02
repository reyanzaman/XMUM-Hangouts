/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Types representing the database schema for XMUM Hangouts

export interface Profile {
  id: string;
  email: string;
  student_id: string; // derived from email (locked)
  name: string;
  name_last_changed_at: string | null;
  country: string;
  country_last_changed_at: string | null;
  languages?: string[];
  age: number;
  birthdate?: string; // YYYY-MM-DD
  program?: string;
  year_of_study?: string; // e.g. "Year 1", "Year 2", etc.
  gender: string;
  student_type?: "foundation" | "degree" | "postgraduate" | "Not Specified" | "";
  about_me: string;
  avatar_id: string; // references bundled SVG
  is_profile_complete: boolean;
  hide_details: boolean; // if true, hides PII from general users
  is_admin: boolean;
  is_blocked_globally: boolean;
  flag_status: "none" | "potentially_unsafe" | "confirmed_unsafe";
  appeal_count: number;
  companion_pet_count?: number;
  companion_selected_state_id?: string | null;
  password?: string; // set during onboarding/profile update
  password_hash?: string;
  is_demo_profile?: boolean;
}

export interface HangoutRestrictions {
  countries: string[];
  languages: string[];
  programs: string[];
  years: string[];
  student_types: string[];
  age_min: number | null;
  age_max: number | null;
  genders: string[];
}

export type HangoutStatus = "active" | "expired" | "cancelled";

export interface Hangout {
  id: string;
  creator_id: string;
  intention: string; // completes "I want to ___"
  location: string; // completes "At ___"
  event_datetime: string; // completes "at [time] on [date]"
  meeting_point: string; // completes "Let's meetup at ___" (hidden until accepted)
  additional_info: string; // collapsible on card
  max_participants: number | null; // null = unlimited
  restrictions: HangoutRestrictions;
  status: HangoutStatus;
  created_at: string;
  updated_at: string;
  is_anonymous?: boolean;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "retracted";

export interface HangoutApplication {
  id: string;
  hangout_id: string;
  applicant_id: string;
  is_anonymous: boolean;
  status: ApplicationStatus;
  rejection_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface HangoutLike {
  id: string;
  hangout_id: string;
  user_id: string;
  created_at: string;
}

export interface HangoutComment {
  id: string;
  hangout_id: string;
  user_id: string;
  parent_comment_id: string | null; // for replies
  content: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
}

export interface ReportAppeal {
  id: string;
  report_id: string;
  appeal_description: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  appeal_number: number; // 1-5
  created_at: string;
  reviewed_at: string | null;
}

export interface Chat {
  id: string;
  user_a_id: string;
  user_b_id: string;
  hangout_id: string | null; // optional link to the dugout
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export type NotificationType =
  | "new_application"
  | "application_accepted"
  | "application_rejected"
  | "comment_reply"
  | "hangout_like"
  | "upcoming_hangout_reminder"
  | "report_approved"
  | "report_appeal_result"
  | "new_report_admin"
  | "admin_message";

export interface AppNotification {
  id: string;
  user_id: string; // recipient
  type: NotificationType;
  payload: {
    hangout_id?: string;
    comment_id?: string;
    chat_id?: string;
    report_id?: string;
    reporter_name?: string;
    hangout_title?: string;
    message?: string;
    custom_text?: string;
  };
  is_read: boolean;
  created_at: string;
}
