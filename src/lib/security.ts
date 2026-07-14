import CryptoJS from "crypto-js";

const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 210_000;

export function hashPassword(email: string, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
  const hash = CryptoJS.PBKDF2(`${email.trim().toLowerCase()}::${password}`, CryptoJS.enc.Hex.parse(salt), {
    keySize: 256 / 32,
    iterations: PASSWORD_HASH_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  }).toString(CryptoJS.enc.Hex);
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

export function isModernPasswordHash(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

export function matchesStoredPassword(
  email: string,
  plainTextPassword: string,
  profile: { password?: string | null; password_hash?: string | null }
): boolean {
  if (profile.password_hash) {
    const parts = profile.password_hash.split("$");
    if (parts.length === 4 && parts[0] === PASSWORD_HASH_PREFIX) {
      const iterations = Number(parts[1]);
      const salt = parts[2];
      const expectedHash = parts[3];
      if (!Number.isInteger(iterations) || iterations < 100_000 || !salt || !expectedHash) return false;
      const candidateHash = CryptoJS.PBKDF2(`${email.trim().toLowerCase()}::${plainTextPassword}`, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256 / 32,
        iterations,
        hasher: CryptoJS.algo.SHA256
      }).toString(CryptoJS.enc.Hex);
      return candidateHash === expectedHash;
    }

    // Compatibility with legacy deterministic SHA-256 hashes. Successful
    // server logins immediately replace these with salted PBKDF2 hashes.
    const legacyHash = CryptoJS.SHA256(`${email.trim().toLowerCase()}::${plainTextPassword}`).toString();
    return legacyHash === profile.password_hash;
  }

  return typeof profile.password === "string" && profile.password === plainTextPassword;
}
