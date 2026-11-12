export function formatMoney(
  value: number | null | undefined,
  locale: string = "th",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(
  value: string | null | undefined,
  locale: string = "th",
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(
  value: string | null | undefined,
  locale: string = "th",
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// The operation is based in Thailand (UTC+7) — all "day" math is done in
// Bangkok local time, not in the runtime's local/UTC timezone.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export function bangkokDayKey(value: Date | string | number | null | undefined): string {
  const d = value instanceof Date ? value : new Date(value ?? Date.now());
  const bangkok = new Date(d.getTime() + BANGKOK_OFFSET_MS);
  bangkok.setUTCHours(0, 0, 0, 0);
  return bangkok.toISOString().slice(0, 10);
}

/** Whole days between two dates, counted in Bangkok local days. */
export function bangkokDaysBetween(
  from: Date | string | number | null | undefined,
  to: Date | string | number | null | undefined,
): number {
  const a = bangkokDayKey(from);
  const b = bangkokDayKey(to);
  const ms =
    new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

