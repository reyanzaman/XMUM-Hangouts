import assert from "node:assert/strict";
import test from "node:test";
import { generateOtpCode, hashOtpCode, isXmumEmail, matchesOtpCode, validatePassword } from "../src/server/auth-security.js";
import { pickCanonicalProfile, reconcileProfilesByEmail } from "../src/lib/profiles.js";
import type { Profile } from "../src/types.js";

const profile = (overrides: Partial<Profile>): Profile => ({
  id: "profile-1", email: "student@xmu.edu.my", student_id: "student", name: "student",
  name_last_changed_at: null, country: "Malaysia", country_last_changed_at: null,
  languages: ["English"], age: 18, program: "Software Engineering", year_of_study: "Year 1",
  gender: "Male", student_type: "degree", about_me: "", avatar_id: "panda",
  is_profile_complete: false, hide_details: false, is_admin: false, is_blocked_globally: false,
  flag_status: "none", appeal_count: 0, ...overrides
});

test("student email validation only accepts the exact XMUM domain", () => {
  assert.equal(isXmumEmail(" Student@xmu.edu.my "), true);
  assert.equal(isXmumEmail("student@sub.xmu.edu.my"), false);
  assert.equal(isXmumEmail("student@xmu.edu.my.attacker.test"), false);
});

test("OTP codes are six random digits and stored as keyed hashes", () => {
  const otp = generateOtpCode();
  const stored = hashOtpCode("student@xmu.edu.my", otp, "test-secret");
  assert.match(otp, /^\d{6}$/);
  assert.doesNotMatch(stored, new RegExp(otp));
  assert.equal(matchesOtpCode(stored, "student@xmu.edu.my", otp, "test-secret"), true);
  assert.equal(matchesOtpCode(stored, "other@xmu.edu.my", otp, "test-secret"), false);
  assert.equal(matchesOtpCode(stored, "student@xmu.edu.my", "000000", "test-secret"), false);
  assert.equal(matchesOtpCode(otp, "student@xmu.edu.my", otp, "test-secret"), true);
});

test("password validation preserves intentional whitespace and enforces safe bounds", () => {
  assert.deepEqual(validatePassword("  secret password  "), { valid: true, password: "  secret password  " });
  assert.equal(validatePassword("short").valid, false);
  assert.equal(validatePassword("        ").valid, false);
  assert.equal(validatePassword("x".repeat(129)).valid, false);
});

test("a completed profile wins over an incomplete duplicate auth row", () => {
  const complete = profile({ id: "legacy", name: "Real Student", is_profile_complete: true });
  const incomplete = profile({ id: "auth-id" });
  assert.equal(pickCanonicalProfile([incomplete, complete], { email: complete.email, authUserId: "auth-id" })?.id, "legacy");
  assert.equal(reconcileProfilesByEmail([incomplete, complete]).every(item => item.is_profile_complete), true);
});
