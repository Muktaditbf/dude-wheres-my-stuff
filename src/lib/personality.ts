/**
 * Picks what Lefty says: which situation applies, which line, and fills in
 * the blanks. Lines never repeat twice in a row.
 */
import type { Item } from '../db/schema';
import { capitalize, PLACE_PREPOSITIONS, placeKey } from './normalize';
import { type PLACEHOLDERS, ROASTS, type Situation } from './roasts';
import type { RoastLevel } from './settings';
import { ago, clock, DAY, ordinal, since } from './time';

export type Vars = Partial<Record<(typeof PLACEHOLDERS)[number], string | number>>;

const lastPicked = new Map<string, number>();

export function linesFor(situation: Situation, level: RoastLevel): string[] {
  const table = ROASTS[situation];
  const own = table[level];
  if (own?.length) return own;
  // Chill mode never falls back to a roast.
  if (level === 'chill') return [];
  return table.bro ?? [];
}

export function fill(template: string, vars: Vars): string {
  const text = template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name as keyof Vars];
    return value === undefined ? '' : String(value);
  });
  return capitalize(text.replace(/\s+/g, ' ').trim());
}

/** One line for a situation, or the fallback situation's line if there is none. */
export function say(
  situation: Situation,
  level: RoastLevel,
  vars: Vars = {},
  options: { fallback?: Situation; random?: () => number } = {},
): string {
  const random = options.random ?? Math.random;
  const lines = linesFor(situation, level);
  if (lines.length === 0) {
    return options.fallback ? say(options.fallback, level, vars, { random }) : '';
  }
  const key = `${situation}:${level}`;
  let index = Math.floor(random() * lines.length) % lines.length;
  if (lines.length > 1 && index === lastPicked.get(key)) index = (index + 1) % lines.length;
  lastPicked.set(key, index);
  return fill(lines[index] ?? '', vars);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHRASE_START = new RegExp(
  `^(?:${[
    ...PLACE_PREPOSITIONS,
    'to',
    'up',
    'down',
    'over',
    'around',
    'outside',
    'out',
    'back',
    'somewhere',
    'here',
    'there',
    'home',
  ]
    .map(escapeRegExp)
    .join('|')})\\b`,
  'i',
);

/** Makes a place readable inside a sentence: "blue drawer" → "at the blue drawer". */
export function placePhrase(place: string): string {
  const p = place.trim();
  if (!p || PHRASE_START.test(p)) return p;
  if (/^(?:the|my|our|your|his|her|their|a|an)\b/i.test(p) || /^\p{Lu}/u.test(p)) return `at ${p}`;
  return `at the ${p}`;
}

/** The short name of a place: "in the black bag, top shelf" → "black bag". */
export const spotName = (place: string) => placeKey(place) || place;

/** "with Rafi" → "Rafi". */
export function personFrom(place: string): string | undefined {
  return /^with\s+(.+)$/i.exec(place.trim())?.[1];
}

export function itemVars(item: Item, now = Date.now()): Vars {
  return {
    item: item.name,
    place: placePhrase(item.place),
    spot: spotName(item.place),
    ago: ago(item.updatedAt, now),
    since: since(item.updatedAt, now),
    count: item.searchCount,
    ordinal: ordinal(Math.max(1, item.searchCount)),
    time: clock(now),
    person: personFrom(item.place) ?? 'they',
  };
}

/** Which kind of answer fits a search. `item.searchCount` already includes this search. */
export function findSituation(
  item: Item,
  level: RoastLevel,
  now = Date.now(),
  random = Math.random,
): Situation {
  if (item.missing) return 'findMissing';
  if (item.lent) return 'findLent';
  if (level !== 'chill') {
    if (/(^| )sock$/.test(item.key)) return 'findSock';
    if (new Date(now).getHours() < 5 && random() < 0.6) return 'findNight';
  }
  if (now - item.updatedAt > 90 * DAY) return 'findOld';
  const count = item.searchCount;
  if (count <= 1) return 'findFirst';
  if (count <= 3) return 'findAgain';
  if (count <= 6) return 'findOften';
  return 'findLegend';
}
