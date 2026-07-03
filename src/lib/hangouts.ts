export const MIN_HANGOUT_LEAD_MINUTES = 30;
export const MIN_HANGOUT_DESCRIPTION_LENGTH = 35;
export const MAX_HANGOUT_ADVANCE_MONTHS = 2;
const HANGOUT_EDIT_HISTORY_PREFIX = "[[HANGOUT_EDIT]]";

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
