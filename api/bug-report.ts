import { VercelRequest, VercelResponse } from "@vercel/node";

const ADMIN_EMAIL = "mcs2509008@xmu.edu.my";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { reporter, subject, description, sourcePage, submittedAt } = req.body || {};
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    const trimmedSubject = typeof subject === "string" && subject.trim() ? subject.trim().slice(0, 120) : "General bug report";
    const trimmedPage = typeof sourcePage === "string" && sourcePage.trim() ? sourcePage.trim().slice(0, 120) : "XMUM Hangouts";
    const reporterEmail = typeof reporter?.email === "string" ? reporter.email.trim().toLowerCase() : "";

    if (!reporterEmail.endsWith("@xmu.edu.my")) {
      return res.status(400).json({ error: "Only XMUM student accounts can submit bug reports." });
    }

    if (trimmedDescription.length < 10) {
      return res.status(400).json({ error: "Bug description must be at least 10 characters long." });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(200).json({
        success: true,
        warning: "Admin chat was created, but RESEND_API_KEY is not configured for email delivery."
      });
    }

    const safeSubject = escapeHtml(trimmedSubject);
    const safeDescription = escapeHtml(trimmedDescription).replace(/\n/g, "<br />");
    const safePage = escapeHtml(trimmedPage);
    const safeReporterName = escapeHtml(reporter?.name || "XMUM student");
    const safeReporterEmail = escapeHtml(reporterEmail);
    const safeSubmittedAt = escapeHtml(submittedAt || new Date().toISOString());

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "XMUM Hangouts <noreply@xmum-hangouts.reyanzaman.com>",
        to: ADMIN_EMAIL,
        reply_to: reporterEmail,
        subject: `[XMUM Hangouts Bug] ${trimmedSubject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #0f172a;">
            <h2 style="margin: 0 0 16px; color: #e11d48;">XMUM Hangouts Bug Report</h2>
            <p style="margin: 0 0 12px;"><strong>Reporter:</strong> ${safeReporterName} (${safeReporterEmail})</p>
            <p style="margin: 0 0 12px;"><strong>Page:</strong> ${safePage}</p>
            <p style="margin: 0 0 12px;"><strong>Subject:</strong> ${safeSubject}</p>
            <p style="margin: 0 0 12px;"><strong>Submitted:</strong> ${safeSubmittedAt}</p>
            <div style="margin-top: 20px; padding: 16px; border: 1px solid #fecdd3; border-radius: 12px; background: #fff1f2;">
              <strong style="display: block; margin-bottom: 8px;">Details</strong>
              <div style="line-height: 1.6;">${safeDescription}</div>
            </div>
          </div>
        `
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Bug report email delivery failed:", errorText);
      return res.status(502).json({ error: "Bug report email could not be delivered." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Bug report endpoint failed:", error);
    return res.status(500).json({ error: "Failed to send bug report email." });
  }
};
