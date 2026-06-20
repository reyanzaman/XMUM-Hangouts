import CryptoJS from "crypto-js";

// Symmetric key of the platform
const ENCRYPTION_SECRET = "xmum_hangouts_aes_gcm_256_secret_key_prod";

// Signature to easily identify encrypted messages
const ENC_PREFIX = "__ENC__:";

/**
 * Encrypts a plaintext message content using AES.
 */
export function encryptMessage(content: string): string {
  if (!content) return "";
  try {
    const encrypted = CryptoJS.AES.encrypt(content, ENCRYPTION_SECRET).toString();
    return `${ENC_PREFIX}${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return content; // Fallback to raw content if encryption fails
  }
}

/**
 * Decrypts an encrypted message safely.
 * Returns the plain text message if successful, or safe fallbacks if compromised.
 */
export function decryptMessage(content: string): string {
  if (!content) return "";
  
  // Check if content is actually encrypted
  if (!content.startsWith(ENC_PREFIX)) {
    return content; // Graceful compatibility fallback
  }

  try {
    const rawCipher = content.substring(ENC_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(rawCipher, ENCRYPTION_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (decrypted) {
      return decrypted;
    }
    return "🔒 [Unable to decrypt message]";
  } catch (error) {
    console.error("Decryption failure:", error);
    return "🔒 [Encrypted message]";
  }
}
