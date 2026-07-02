const PRIMARY_ADMIN_EMAIL_FINGERPRINT = "1a23b02f898033961ea26ddd8dfc59c864858875375ce21bcbddbe0c521538b7";

export async function matchesPrimaryAdminEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(normalizedEmail));
    const hash = Array.from(new Uint8Array(digest))
      .map(value => value.toString(16).padStart(2, "0"))
      .join("");
    return hash === PRIMARY_ADMIN_EMAIL_FINGERPRINT;
  } catch {
    return false;
  }
}
