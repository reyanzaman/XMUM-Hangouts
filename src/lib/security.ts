import CryptoJS from "crypto-js";

export function hashPassword(email: string, password: string): string {
  return CryptoJS.SHA256(`${email.trim().toLowerCase()}::${password}`).toString();
}

export function matchesStoredPassword(
  email: string,
  plainTextPassword: string,
  profile: { password?: string | null; password_hash?: string | null }
): boolean {
  if (profile.password_hash) {
    return hashPassword(email, plainTextPassword) === profile.password_hash;
  }

  return typeof profile.password === "string" && profile.password === plainTextPassword;
}
