/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { ShieldCheck, Lock, Heart, MessageSquare, Coffee, Clipboard, HelpCircle, Bug, Send } from "lucide-react";
import { Logo } from "./Logo";

const tngQrImage = new URL("../assets/images/touch_n_go_qr_solid_1781590124889.jpg", import.meta.url).href;
const supportRequestKindStorageKey = "xmum_support_request_kind";

interface StaticPageProps {
  pageName: "terms" | "privacy" | "safety" | "about" | "donation" | "bug-report";
  onNavigateToChats?: () => void;
  onNavigateToBugReport?: () => void;
}

export const StaticPages: React.FC<StaticPageProps> = ({ pageName, onNavigateToChats, onNavigateToBugReport }) => {
  const { currentUser, profiles, getOrCreateChat, sendChatMessage, submitBugReport, showToast } = useApp();
  const [supportRequestKind, setSupportRequestKind] = useState<"bug" | "feature">(() => {
    try {
      return sessionStorage.getItem(supportRequestKindStorageKey) === "feature" ? "feature" : "bug";
    } catch {
      return "bug";
    }
  });
  const [bugSubject, setBugSubject] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  const syncSupportRequestKind = (nextKind: "bug" | "feature") => {
    setSupportRequestKind(nextKind);
    try {
      sessionStorage.setItem(supportRequestKindStorageKey, nextKind);
    } catch {
      // Ignore storage issues and keep the page usable.
    }
  };

  const handleContactAdmin = (type: "general" | "feature" | "bug") => {
    if (!currentUser) {
      showToast("Please log in to contact our support administration team.", "error");
      return;
    }
    // Find designated admin profile
    const adminUser = profiles.find(p => p.is_admin);
    if (!adminUser) {
      showToast("System admin account is loading. Try again shortly.", "error");
      return;
    }

    try {
      const chat = getOrCreateChat(adminUser.id, null);

      let label = "General Support Inquiry";
      let text = "General Support Inquiry / Safety Report Coordinate Feedback";
      if (type === "feature") {
        label = "Feature Request Ticket";
        text = "Suggested feature request";
      } else if (type === "bug") {
        label = "Bug Report Ticket";
        text = "Registered bug report";
      }

      const adminNoticeMsg = `[SYSTEM HELPDESK ROUTER]\nThe student '${currentUser.name}' has initiated a support ticket by clicking: [${text}].\nPlease exchange messages below to coordinate details.`;
      sendChatMessage(chat.id, adminNoticeMsg);

      showToast(`Helpdesk page created for: ${label}!`, "success");
      if (onNavigateToChats) {
        onNavigateToChats();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleBugReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBug(true);

    const result = await submitBugReport({
      kind: supportRequestKind,
      subject: bugSubject,
      description: bugDescription,
      sourcePage: supportRequestKind === "feature" ? "Footer feature request page" : "Footer bug report page"
    });

    setIsSubmittingBug(false);

    if (result.success) {
      setBugSubject("");
      setBugDescription("");
      if (result.warning) {
        showToast(result.warning, "info");
      }
      return;
    }

    showToast(result.error || `${supportRequestKind === "feature" ? "Feature request" : "Bug report"} could not be sent.`, "error");
  };

  const getQRPlaceHolderSVG = () => {
    return (
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32 mx-auto border-4 border-rose-100 rounded-2xl bg-white p-2">
        <rect width="120" height="120" fill="none" />
        {/* Mock QR boxes */}
        <rect x="10" y="10" width="30" height="30" fill="#E11D48" />
        <rect x="15" y="15" width="20" height="20" fill="#FFFFFF" />
        <rect x="20" y="20" width="10" height="10" fill="#E11D48" />

        <rect x="80" y="10" width="30" height="30" fill="#E11D48" />
        <rect x="85" y="15" width="20" height="20" fill="#FFFFFF" />
        <rect x="90" y="90" width="10" height="10" fill="#E11D48" />

        <rect x="10" y="80" width="30" height="30" fill="#E11D48" />
        <rect x="15" y="85" width="20" height="20" fill="#FFFFFF" />
        <rect x="25" y="90" width="10" height="10" fill="#E11D48" />

        {/* Inner noise details */}
        <rect x="50" y="20" width="15" height="15" fill="#E11D48" />
        <rect x="55" y="55" width="20" height="10" fill="#111827" />
        <rect x="20" y="50" width="10" height="20" fill="#111827" />
        <rect x="80" y="50" width="15" height="15" fill="#1E293B" />
        <rect x="90" y="80" width="20" height="20" fill="#E11D48" />
        <rect x="95" y="85" width="10" height="10" fill="#FFFFFF" />
        <rect x="50" y="80" width="15" height="15" fill="#1E293B" />
      </svg>
    );
  };

  switch (pageName) {
    case "terms":
      return (
        <div id="terms-page" className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-sans">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Clipboard className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Terms of Service</h2>
          </div>
          
          <div className="space-y-5 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <div className="border-l-4 border-amber-500 bg-amber-50/45 rounded-r-2xl p-4 text-amber-900 text-xs leading-relaxed space-y-1">
              <span className="font-extrabold uppercase tracking-widest text-[9px] text-amber-700 block">⚠️ Crucial Notice</span>
              <p>
                This platform is an independent student-led initiative. It is <strong>not officially sponsored, endorsed, or managed</strong> by Xiamen University Malaysia (XMUM). XMUM bears zero responsibility, legal liability, or oversight for interactions, meetups, or outcomes resulting from using this platform.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">1. Acceptance of Terms & Eligibility</h4>
              <p>
                By accessing, registering, or utilizing XMUM Hangouts (the "Service"), you agree to abide entirely by these Terms of Service. Access is strictly limited to active students of Xiamen University Malaysia who hold a valid, active academic email domain ending with <code>@xmu.edu.my</code>.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">2. Peer-Led Code of Safe Conduct</h4>
              <p>
                You explicitly covenant to conduct all real-life coordination with utmost integrity and care. You agree to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-gray-500">
                <li>Coordinate, convene, and meet other students exclusively in public, well-lit, on-campus public venues with active student traffic.</li>
                <li>Immediately cease and desist any further unwanted contact or message coordination if another user requests you to do so.</li>
                <li>Uphold complete mutual respect. Harassment, stalking, commercial pitching, spamming, and toxic or fraudulent behavior are strictly prohibited.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">3. Disclaimer of Liability & Indemnity</h4>
              <p>
                To the maximum extent permitted by the laws of Malaysia, the platform developers, administrators, and contributors shall not be held liable for any claims, damages, physical injuries, mental distress, losses, or legal disputes arising from off-line meetups organized through this Service. You coordinate at your own absolute discretion and personal risk.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">4. Account Review & Administration Authority</h4>
              <p>
                To maintain campus community safety, platform administrators reserve absolute authority to suspend accounts, flag problematic profiles with caution labels, or permanently terminate access coordinates without prior warning, based on student complaints or safety reports. 
                Please note that <strong>vulgar, abusive, sexually explicit, or offensive posts are strictly prohibited</strong> and will result in your account being <strong>permanently banned</strong>, in which case you will never be able to access the application anymore under any circumstances.
              </p>
            </div>
          </div>
        </div>
      );

    case "privacy":
      return (
        <div id="privacy-page" className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-sans">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Lock className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Privacy Policy</h2>
          </div>

          <div className="space-y-5 text-xs sm:text-sm text-gray-650 leading-relaxed">
            <div className="border-l-4 border-rose-500 bg-rose-50/45 rounded-r-2xl p-4 text-gray-700 text-xs space-y-1">
              <span className="font-extrabold uppercase tracking-widest text-[9px] text-rose-600 block">🛡️ Student Data Integrity</span>
              <p>
                We do not integrate commercial trackers or sell student directories to third-party advertising companies. Your details are strictly utilized to run authentic student-peer verification.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-950 text-xs sm:text-sm">1. Personal Information Collected</h4>
              <p>
                To maintain a safe community, we store and map key account credentials verified via simulated or OAuth student credentials:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-gray-500">
                <li><strong>Student Identity Data:</strong> Full name, university email address (<code>@xmu.edu.my</code>), profile avatar choice, and user bio.</li>
                <li><strong>Optional Profile Meta-Attributes:</strong> Home region, active languages, and academic department details (which remain completely hidden from global browse feeds if the <em>"Hide Details"</em> preference toggle is enabled).</li>
                <li><strong>Coordination Activity logs:</strong> Hangouts you host or apply to, active application states, text discussion logs, feedback details, and support chat tickets.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-950 text-xs sm:text-sm">2. Information Visibility & Safe Sharing</h4>
              <p>
                When you list or apply to an on-campus hangout, certain details become visible:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-gray-500">
                <li>Hosts can view the student profile details, department, and safety parameters of applicants who apply to join, to foster informed trust.</li>
                <li>Other members can read your public comments and custom queries in discussion feeds.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-950 text-xs sm:text-sm">3. Data Retention & Deletion Process</h4>
              <p>
                Your session and active profile data remains on secure cloud servers. If you wish to delete your complete application profile, withdraw pending details, or wipe records from the system databases, you can submit an admin support request or disconnect your session immediately by signing out.
              </p>
            </div>
          </div>
        </div>
      );

    case "safety":
      return (
        <div id="safety-guidelines-page" className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-sans">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Safety Guidelines</h2>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p className="text-gray-500">
              XMUM Hangouts is powered by peer student trust. Please adhere closely to our safety protocols below to ensure every on-campus meetup is respectful, comfortable, and safe.
            </p>

            {/* Redesigned grid with premium minimalist designs, instead of weird/raw colored boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DO column */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm hover:border-gray-200 transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">✓</span>
                  <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm">Meet Responsibly (FAQs & Dos)</h4>
                </div>
                <ul className="space-y-3 text-xs text-gray-500 list-none pl-0">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Campus Public Areas ONLY:</strong> Meet at busy locations with other students nearby (e.g. Library, Block B, Lychee Cafeteria).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Notify Friends:</strong> Inform your trusted roommates or classmates about your plans, location, and whom you are meeting.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Platform chat tool:</strong> Discuss event coordinates in the application chat environment before sharing personal phone numbers.</span>
                  </li>
                </ul>
              </div>

              {/* DONT column */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm hover:border-gray-200 transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-xs">✗</span>
                  <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm">Avoid Risks (Don'ts)</h4>
                </div>
                <ul className="space-y-3 text-xs text-gray-500 list-none pl-0">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>No Quiet/Private Rooms:</strong> Never agree to meet or organize Hangouts inside residential hostels, private apartments, or secluded off-campus locations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>No Cash or Payments:</strong> Do not transfer deposits, loans, or pre-payments to other users. Authentic student hangouts do not require entry fees.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Never Ignore Instincts:</strong> If a classmate makes you feel uncomfortable, terminate the meetup immediately and leave. Your safety always comes first.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-2">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">How Reporting and Guardrails Work</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                If a user violates coordinates or exhibits unwanted contact, click <strong>"Report Profile"</strong> on their user page or contact the student moderator team immediately via our helpdesk support tool. Admin coordinators review all reported issues. Validated reports mark the user with warning indications to safeguard the rest of Sepang campus life.
              </p>
            </div>
          </div>
        </div>
      );

    case "about":
      return (
        <div id="about-page" className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-sans">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
            <Logo size="sm" />
            <h2 className="text-xl font-bold text-gray-900">About XMUM Hangouts</h2>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-gray-650 leading-relaxed">
            <div>
              <p className="text-gray-700 font-medium">
                This application was coded with ❤️ by a fellow student at <strong>Xiamen University Malaysia (XMUM)</strong> who realized how many students are wishing to find like-minded peers for group study, board game sessions, jogging, or weekend food hunting in Sepang, but had no safe and dedicated platform to do so.
              </p>
              <p className="italic text-rose-500 mt-2 font-medium">
                "We are thousands of students across the Sepang campus. Let's make campus life cozy, connected, and safe!"
              </p>
            </div>

            <div className="border-t border-gray-50 pt-4 space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">💡 How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-lg">📢</span>
                  <h4 className="font-bold text-slate-800 mt-1 mb-0.5">Post an Intention</h4>
                  <p className="text-slate-500">Create a hangout card announcing what you want to do, when, and where. You can choose to post anonymously to maintain maximum privacy.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-lg">🛡️</span>
                  <h4 className="font-bold text-slate-800 mt-1 mb-0.5">Define Your Filter Criteria</h4>
                  <p className="text-slate-500">Only receive join requests from students who match your specific criteria, such as country, gender, age, language, or study year.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-lg">🔒</span>
                  <h4 className="font-bold text-slate-800 mt-1 mb-0.5">Approve & Meet Safely</h4>
                  <p className="text-slate-500">Review requests from interested students. Once approved, the secure meeting point is revealed, and an encrypted peer chat is unlocked!</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-50 pt-4 space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">🛡️ Safety & Safeguarding Standards</h3>
              <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600">
                <li>
                  <strong className="text-slate-800">Verified Peer Identity:</strong> All profiles require genuine campus credential details. Only verified students are allowed onto the system.
                </li>
                <li>
                  <strong className="text-slate-800">Locked Meeting Points:</strong> Meeting points are hidden from the public feed. Only accepted applicants can see exact coordinates and meetups.
                </li>
                <li>
                  <strong className="text-slate-800">Personal Information (PII) Shield:</strong> Choose when to hide or show your personal details. Protect your home country, conversational languages, gender, age, or student type using the Toggle Shield.
                </li>
                <li>
                  <strong className="text-slate-800">Blocking & Moderation Control:</strong> Host-level blocks, prompt reports to student administrators, and global verification checks ensure an optimal safe environment.
                </li>
              </ul>
            </div>

            {currentUser ? (
              <div className="space-y-4 border-t border-gray-150 pt-5">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-gray-800 text-sm">Helpdesk Center & Support Dispatcher</h4>
                  <p className="text-xs text-gray-500">
                    Get in touch with student moderators, suggestions, or submit bugs instantly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Contact Admin / General Inquiry */}
                  <button
                    id="contact-admin-general-btn"
                    onClick={() => handleContactAdmin("general")}
                    className="p-4 bg-rose-50/50 hover:bg-rose-100/40 border border-rose-100/60 rounded-2xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:translate-y-0.5"
                  >
                    <span className="inline-block p-1 bg-white rounded-lg mb-2 shadow-sm">💬</span>
                    <h5 className="text-xs font-bold text-rose-950">Contact Admin</h5>
                    <p className="text-[10px] text-rose-800 mt-0.5 font-sans leading-relaxed">
                      General coordinate queries or safety reports.
                    </p>
                  </button>

                  {/* Request Feature */}
                  <button
                    id="contact-admin-feature-btn"
                    onClick={() => {
                      syncSupportRequestKind("feature");
                      if (onNavigateToBugReport) {
                        onNavigateToBugReport();
                        return;
                      }
                      handleContactAdmin("feature");
                    }}
                    className="p-4 bg-teal-50/50 hover:bg-teal-100/40 border border-teal-100/50 rounded-2xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:translate-y-0.5"
                  >
                    <span className="inline-block p-1 bg-white rounded-lg mb-2 shadow-sm">💡</span>
                    <h5 className="text-xs font-bold text-teal-950">Request Feature</h5>
                    <p className="text-[10px] text-teal-800 mt-0.5 font-sans leading-relaxed">
                      Suggest design updates or custom functions.
                    </p>
                  </button>

                  {/* Report Bug */}
                  <button
                    id="contact-admin-bug-btn"
                    onClick={() => {
                      syncSupportRequestKind("bug");
                      if (onNavigateToBugReport) {
                        onNavigateToBugReport();
                        return;
                      }
                      handleContactAdmin("bug");
                    }}
                    className="p-4 bg-amber-50/50 hover:bg-amber-100/40 border border-amber-100/50 rounded-2xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:translate-y-0.5"
                  >
                    <span className="inline-block p-1 bg-white rounded-lg mb-2 shadow-sm">🐛</span>
                    <h5 className="text-xs font-bold text-amber-950">Report a Bug</h5>
                    <p className="text-[10px] text-amber-800 mt-0.5 font-sans leading-relaxed">
                      Lodge issue tickets on unexpected errors.
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Sign in to directly access advanced support portals.</p>
            )}
          </div>
        </div>
      );

    case "bug-report":
      return (
        <div id="bug-report-page" className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-sans max-w-2xl mx-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Bug className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Support Requests</h2>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Tell us what broke or what you would love to see improved. Your request will be sent to the XMUM Hangouts admin team inside the app and also routed through the configured support email channel.
          </p>

          {!currentUser ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              Please sign in before sending a bug report so the admin team can follow up with you.
            </div>
          ) : (
            <form onSubmit={handleBugReportSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Request type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => syncSupportRequestKind("bug")}
                    className={`rounded-2xl border px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
                      supportRequestKind === "bug"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/40"
                    }`}
                  >
                    Report a bug
                  </button>
                  <button
                    type="button"
                    onClick={() => syncSupportRequestKind("feature")}
                    className={`rounded-2xl border px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
                      supportRequestKind === "feature"
                        ? "border-teal-300 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/40"
                    }`}
                  >
                    Request a feature
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bug-report-subject" className="block text-xs font-bold text-gray-700">
                  Short summary
                </label>
                <input
                  id="bug-report-subject"
                  type="text"
                  maxLength={120}
                  value={bugSubject}
                  onChange={e => setBugSubject(e.target.value)}
                  placeholder={
                    supportRequestKind === "feature"
                      ? "Example: Let hosts duplicate an old hangout plan"
                      : "Example: Create hangout date picker allows past times"
                  }
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-100 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bug-report-description" className="block text-xs font-bold text-gray-700">
                  {supportRequestKind === "feature" ? "What would you like to see?" : "What happened?"} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="bug-report-description"
                  value={bugDescription}
                  onChange={e => setBugDescription(e.target.value)}
                  maxLength={2000}
                  required
                  placeholder={
                    supportRequestKind === "feature"
                      ? "Describe the feature, why it would help, and how you imagine it working."
                      : "Describe the steps, the issue, and what you expected to happen."
                  }
                  className="w-full min-h-36 bg-slate-50 border border-gray-200 focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-100 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 outline-none transition-all resize-y"
                />
                <p className="text-[10px] text-gray-400">
                  {supportRequestKind === "feature"
                    ? "Include the page, workflow, and the problem this feature would solve for you."
                    : "Include the page, action, and any error text if you saw one."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <button
                  id="bug-report-submit-btn"
                  type="submit"
                  disabled={isSubmittingBug}
                  className="inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold px-5 py-3 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSubmittingBug ? "Sending..." : supportRequestKind === "feature" ? "Send Feature Request" : "Send Bug Report"}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToChats?.()}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-600 border border-slate-200 hover:border-rose-200 hover:text-rose-600 px-4 py-3 rounded-2xl transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open admin chat
                </button>
              </div>
            </form>
          )}
        </div>
      );

    case "donation":
      return (
        <div id="donation-page" className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-center font-sans max-w-md mx-auto">
          <span className="inline-flex p-4 rounded-full bg-rose-50 text-rose-500">
            <Coffee className="w-8 h-8" />
          </span>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Support Our Campus Community ☕</h2>
          
          <div className="space-y-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              If you liked the experience of using XMUM Hangouts and made new friends or groups, please consider supporting us.
            </p>
            <p className="font-semibold text-rose-600">
              Buy our student developer a cup of coffee! ☕
            </p>

            {/* Real Touch 'n Go E-Wallet QR Code */}
            <div className="space-y-3 p-4 sm:p-5 bg-white rounded-3xl border border-rose-100/30 flex flex-col items-center">
              <div className="bg-white p-2 rounded-2xl border border-rose-100/40 shadow-sm overflow-hidden flex items-center justify-center">
                <img
                  src={tngQrImage}
                  alt="Touch 'n Go E-Wallet QR Code"
                  className="w-72 h-72 sm:w-[360px] sm:h-[360px] mx-auto bg-white object-cover transition-transform duration-200 hover:scale-[1.02]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-slate-500 uppercase tracking-widest block font-bold pt-1">
                Scan using Touch 'n Go eWallet
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Every contribution directly keeps our servers alive and running. Thank you so much for being an amazing classmate!
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
};
