export const MIN_HANGOUT_LEAD_MINUTES = 30;
export const MIN_HANGOUT_DESCRIPTION_LENGTH = 35;
const HANGOUT_EDIT_HISTORY_PREFIX = "[[HANGOUT_EDIT]]";

export interface HangoutEditHistoryChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface HangoutEditHistoryEntry {
  at: string;
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
  minimumLeadMinutes = MIN_HANGOUT_LEAD_MINUTES
): string | null {
  const eventDate = new Date(eventIsoString);
  if (Number.isNaN(eventDate.getTime())) {
    return "Please select a valid date and time.";
  }

  const minimumAllowedTime = Date.now() + minimumLeadMinutes * 60 * 1000;
  if (eventDate.getTime() < minimumAllowedTime) {
    return `Please choose a time at least ${minimumLeadMinutes} minutes in the future.`;
  }

  return null;
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
