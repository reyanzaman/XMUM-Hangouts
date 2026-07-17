import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHangoutEligibility } from "../src/lib/hangouts.js";
import type { Hangout, Profile } from "../src/types.js";

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "student-1",
  email: "student@xmu.edu.my",
  student_id: "student",
  name: "Student",
  name_last_changed_at: null,
  country: "Malaysia",
  country_last_changed_at: null,
  languages: ["English", "Mandarin Chinese"],
  age: 20,
  program: "Software Engineering",
  year_of_study: "Year 2",
  gender: "Female",
  student_type: "degree",
  about_me: "Test profile",
  avatar_id: "panda",
  is_profile_complete: true,
  hide_details: false,
  is_admin: false,
  is_blocked_globally: false,
  flag_status: "none",
  appeal_count: 0,
  ...overrides
});

const hangout = (restrictionOverrides: Partial<Hangout["restrictions"]> = {}): Hangout => ({
  id: "hangout-1",
  creator_id: "student-2",
  intention: "study together",
  location: "Library",
  event_datetime: "2030-01-01T10:00:00.000Z",
  meeting_point: "Entrance",
  additional_info: "",
  max_participants: null,
  restrictions: {
    countries: [],
    languages: [],
    programs: [],
    years: [],
    student_types: [],
    age_min: null,
    age_max: null,
    genders: [],
    ...restrictionOverrides
  },
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z"
});

test("eligibility matching ignores harmless casing and whitespace differences", () => {
  const result = evaluateHangoutEligibility(profile(), hangout({
    countries: [" malaysia "],
    languages: ["english"],
    programs: ["SOFTWARE ENGINEERING"],
    years: ["year 2"],
    student_types: ["Degree"],
    genders: ["female"]
  }));

  assert.deepEqual(result, { eligible: true, reasons: [] });
});

test("sharing any required language is sufficient", () => {
  assert.equal(evaluateHangoutEligibility(profile(), hangout({ languages: ["Malay", "Mandarin Chinese"] })).eligible, true);
  assert.equal(evaluateHangoutEligibility(profile(), hangout({ languages: ["Malay", "Japanese"] })).eligible, false);
});

test("every active restriction contributes to eligibility", () => {
  const result = evaluateHangoutEligibility(profile(), hangout({
    countries: ["China"],
    programs: ["Finance"],
    years: ["Year 4"],
    student_types: ["postgraduate"],
    age_min: 21,
    genders: ["Male"]
  }));

  assert.equal(result.eligible, false);
  assert.equal(result.reasons.length, 6);
});

test("profiles without a language list do not crash the filter", () => {
  const result = evaluateHangoutEligibility(profile({ languages: undefined }), hangout({ languages: ["English"] }));
  assert.equal(result.eligible, false);
  assert.match(result.reasons[0], /language/i);
});
