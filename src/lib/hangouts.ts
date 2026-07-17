import type { Hangout, Profile } from "../types";

export const MIN_HANGOUT_LEAD_MINUTES = 30;
export const MIN_HANGOUT_DESCRIPTION_LENGTH = 35;
export const MAX_HANGOUT_ADVANCE_MONTHS = 2;
const HANGOUT_EDIT_HISTORY_PREFIX = "[[HANGOUT_EDIT]]";

export function evaluateHangoutEligibility(
  profile: Profile,
  hangout: Hangout,
  today = new Date()
): { eligible: boolean; reasons: string[] } {
  const r = {
    countries: [] as string[],
    languages: [] as string[],
    programs: [] as string[],
    years: [] as string[],
    student_types: [] as string[],
    genders: [] as string[],
    age_min: null as number | null,
    age_max: null as number | null,
    ...(hangout.restrictions || {})
  };
  const reasons: string[] = [];
  const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();
  const matchesAllowed = (allowed: string[] | undefined, value: unknown) =>
    !allowed?.length || allowed.some(option => normalize(option) === normalize(value));
  const profileLanguages = new Set((profile.languages || []).map(normalize).filter(Boolean));
  const profileAge = (() => {
    const storedAge = Number(profile.age);
    if (Number.isFinite(storedAge) && storedAge >= 0) return storedAge;
    if (!profile.birthdate) return null;
    const birthdate = new Date(`${profile.birthdate}T00:00:00`);
    if (Number.isNaN(birthdate.getTime())) return null;
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDifference = today.getMonth() - birthdate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthdate.getDate())) age -= 1;
    return age;
  })();

  if (!matchesAllowed(r.countries, profile.country)) {
    reasons.push(`Mandatory Countries list: [${r.countries.join(", ")}]; your profile lists "${profile.country}"`);
  }
  if (r.languages.length > 0 && !r.languages.some(language => profileLanguages.has(normalize(language)))) {
    reasons.push(`Mandatory Spoken language(s): [${r.languages.join(", ")}]; your profile does not share these languages`);
  }
  if (!matchesAllowed(r.programs, profile.program)) {
    reasons.push(`Mandatory Academic Program(s): [${r.programs.join(", ")}]; your profile lists "${profile.program}"`);
  }
  if (!matchesAllowed(r.years, profile.year_of_study)) {
    reasons.push(`Mandatory Academic Year(s): [${r.years.join(", ")}]; your profile lists "${profile.year_of_study}"`);
  }
  if (!matchesAllowed(r.student_types, profile.student_type)) {
    reasons.push(`Mandatory Student Type: [${r.student_types.join(", ")}]; your profile lists "${profile.student_type}"`);
  }
  if ((r.age_min !== null || r.age_max !== null) && profileAge === null) {
    reasons.push("Your profile needs a valid birthdate before age-restricted plans can be matched");
  }
  if (profileAge !== null && r.age_min !== null && profileAge < r.age_min) {
    reasons.push(`Age is below specified minimum of ${r.age_min} years old (you are ${profileAge})`);
  }
  if (profileAge !== null && r.age_max !== null && profileAge > r.age_max) {
    reasons.push(`Age is above specified maximum of ${r.age_max} years old (you are ${profileAge})`);
  }
  if (!matchesAllowed(r.genders, profile.gender)) {
    reasons.push(`Gender target mismatch: [${r.genders.join(", ")}]; your profile lists "${profile.gender}"`);
  }

  return { eligible: reasons.length === 0, reasons };
}

export interface HangoutEditHistoryChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface HangoutEditHistoryEntry {
  at: string;
  editorId?: string;
  editorName: string;
  summary: string;
  changes: HangoutEditHistoryChange[];
}

function parseDateParts(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function parseTimeParts(time: string): [number, number] | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2])];
}

export function combineDateAndTimeToIso(date: string, time: string): string | null {
  const dateParts = parseDateParts(date);
  const timeParts = parseTimeParts(time);
  if (!dateParts || !timeParts) {
    return null;
  }

  const [year, month, day] = dateParts;
  const [hours, minutes] = timeParts;
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (Number.isNaN(localDate.getTime())) {
    return null;
  }

  return localDate.toISOString();
}

export function validateFutureHangoutDate(
  eventIsoString: string,
  minimumLeadMinutes = MIN_HANGOUT_LEAD_MINUTES,
  maxAdvanceMonths = MAX_HANGOUT_ADVANCE_MONTHS
): string | null {
  const eventDate = new Date(eventIsoString);
  if (Number.isNaN(eventDate.getTime())) {
    return "Please select a valid date and time.";
  }

  const minimumAllowedTime = Date.now() + minimumLeadMinutes * 60 * 1000;
  if (eventDate.getTime() < minimumAllowedTime) {
    return `Please choose a time at least ${minimumLeadMinutes} minutes in the future.`;
  }

  const maximumAllowedDate = getMaximumHangoutDate(new Date(), maxAdvanceMonths);
  if (eventDate.getTime() > maximumAllowedDate.getTime()) {
    return `Hangouts can be planned at most ${maxAdvanceMonths} months in advance.`;
  }

  return null;
}

export function getMaximumHangoutDate(date: Date = new Date(), months = MAX_HANGOUT_ADVANCE_MONTHS): Date {
  const maximum = new Date(date);
  maximum.setMonth(maximum.getMonth() + months);
  maximum.setHours(23, 59, 59, 999);
  return maximum;
}

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getRoundedMinimumTime(date: Date = new Date()): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  const remainder = rounded.getMinutes() % 5;
  if (remainder !== 0) {
    rounded.setMinutes(rounded.getMinutes() + (5 - remainder));
  }

  rounded.setMinutes(rounded.getMinutes() + MIN_HANGOUT_LEAD_MINUTES);
  return rounded;
}

export function formatHangoutIntent(intent: string): string {
  const trimmedIntent = intent.trim();
  if (!trimmedIntent) {
    return "I want to";
  }

  if (/^(i\b|i['’]|let['’]?s\b|looking to\b|hoping to\b|planning to\b|ready to\b|keen to\b|would love to\b|up for\b)/i.test(trimmedIntent)) {
    return trimmedIntent;
  }

  return `I want to ${trimmedIntent}`;
}

export function splitHangoutIntentParts(intent: string): { lead: string; detail: string } {
  const trimmedIntent = intent.trim();
  if (!trimmedIntent) {
    return { lead: "I want to", detail: "" };
  }

  const knownLeads = [
    "I want to",
    "I'd love to",
    "I would love to",
    "Let's",
    "Looking to",
    "Hoping to",
    "Planning to",
    "Ready to",
    "Keen to",
    "Up for"
  ];

  for (const lead of knownLeads) {
    if (trimmedIntent.toLowerCase().startsWith(lead.toLowerCase())) {
      const detail = trimmedIntent.slice(lead.length).trim();
      if (detail) {
        return {
          lead: trimmedIntent.slice(0, lead.length).trim(),
          detail
        };
      }
    }
  }

  return { lead: "I want to", detail: trimmedIntent };
}

export function composeHangoutIntent(lead: string, detail: string): string {
  const trimmedLead = lead.trim() || "I want to";
  const trimmedDetail = detail.trim();
  return trimmedDetail ? `${trimmedLead} ${trimmedDetail}`.trim() : trimmedLead;
}

export function serializeHangoutEditHistoryEntry(entry: HangoutEditHistoryEntry): string {
  return `${HANGOUT_EDIT_HISTORY_PREFIX}${JSON.stringify(entry)}`;
}

export function parseHangoutEditHistoryEntry(content: string): HangoutEditHistoryEntry | null {
  if (!content.startsWith(HANGOUT_EDIT_HISTORY_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(content.slice(HANGOUT_EDIT_HISTORY_PREFIX.length));
    if (!parsed || !Array.isArray(parsed.changes)) {
      return null;
    }

    return {
      at: typeof parsed.at === "string" ? parsed.at : new Date().toISOString(),
      editorId: typeof parsed.editorId === "string" ? parsed.editorId : undefined,
      editorName: typeof parsed.editorName === "string" ? parsed.editorName : "Host",
      summary: typeof parsed.summary === "string" ? parsed.summary : "This hangout was updated.",
      changes: parsed.changes
        .filter((change: any) => change && typeof change.label === "string")
        .map((change: any) => ({
          field: typeof change.field === "string" ? change.field : "details",
          label: change.label,
          before: typeof change.before === "string" ? change.before : "",
          after: typeof change.after === "string" ? change.after : ""
        }))
    };
  } catch {
    return null;
  }
}

export function isHangoutEditHistoryComment(content: string): boolean {
  return content.startsWith(HANGOUT_EDIT_HISTORY_PREFIX);
}
