import crypto from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_HASH_PREFIX = "hmac-sha256$";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function isXmumEmail(email: string): boolean {
  return /^[^@\s]+@xmu\.edu\.my$/i.test(email.trim());
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1_000_000).toString();
}

export function hashOtpCode(email: string, otp: string, secret: string): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${normalizeEmail(email)}:${otp}`)
    .digest("base64url");
  return `${OTP_HASH_PREFIX}${digest}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function matchesOtpCode(storedValue: string, email: string, enteredOtp: string, secret: string): boolean {
  if (!/^\d{6}$/.test(enteredOtp)) return false;

  if (storedValue.startsWith(OTP_HASH_PREFIX)) {
    return safeEqual(storedValue, hashOtpCode(email, enteredOtp, secret));
  }

  // Temporary compatibility for codes issued before hashed OTP storage shipped.
  return safeEqual(storedValue, enteredOtp);
}

export function validatePassword(password: unknown): { valid: true; password: string } | { valid: false; error: string } {
  if (typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters." };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password must be no more than 128 characters." };
  }
  if (!/\S/.test(password)) {
    return { valid: false, error: "Password must contain at least one non-space character." };
  }
  return { valid: true, password };
}
