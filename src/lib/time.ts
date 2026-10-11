/** Small, dependency-free time helpers. */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const YEAR = 365 * DAY;

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', YEAR],
  ['month', MONTH],
  ['week', WEEK],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
];

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function ago(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp;
  if (diff < MINUTE) return 'just now';
  for (const [unit, size] of UNITS) {
    if (diff >= size) return relative.format(-Math.floor(diff / size), unit);
  }
  return 'just now';
}

/** A plain duration: "5 minutes", "3 days", "2 weeks". */
export function since(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  for (const [unit, size] of UNITS) {
    if (diff >= size) {
      const value = Math.floor(diff / size);
      return `${value} ${unit}${value === 1 ? '' : 's'}`;
    }
  }
  return 'a moment';
}

/** "2:14 AM" in the user's locale. */
export function clock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "1st", "2nd", "3rd", "11th", "22nd". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "1 AM", "11 PM": used for the worst-hour stat. */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}
