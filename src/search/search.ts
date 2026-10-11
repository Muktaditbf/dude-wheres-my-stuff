/**
 * Finding the right item for "where's my …?".
 *
 * Order of confidence: exact name → synonym ("specs" = "glasses") → all the
 * words match ("remote" finds "TV remote") → typo-tolerant fuzzy match.
 * Only confident matches become the answer; weaker ones turn into
 * "did you mean" suggestions, so the app never confidently sends you to the
 * wrong drawer.
 */
import Fuse from 'fuse.js';
import { itemKey, placeKey, singularize, words } from '../lib/normalize';

export interface Searchable {
  id: string;
  name: string;
  key: string;
  place: string;
  placeKey: string;
  updatedAt: number;
}

export interface Match<T> {
  item: T;
  score: number;
  reason: 'exact' | 'synonym' | 'words' | 'fuzzy' | 'partial';
}

/** Scores at or below this are confident enough to answer with. */
export const CONFIDENT = 0.45;

const SYNONYM_GROUPS = [
  ['glasses', 'specs', 'spectacles', 'eyeglasses'],
  ['sunglasses', 'shades', 'sunnies'],
  ['phone', 'mobile', 'cellphone', 'cell phone', 'smartphone', 'mobile phone'],
  ['remote', 'tv remote', 'remote control', 'clicker', 'tv clicker'],
  ['earbuds', 'airpods', 'earphones', 'earpods', 'buds'],
  ['headphones', 'headset', 'cans'],
  [
    'charger',
    'phone charger',
    'mobile charger',
    'charging cable',
    'charger cable',
    'power adapter',
  ],
  ['wallet', 'billfold'],
  ['id', 'id card', 'identity card', 'national id'],
  [
    'driving license',
    'drivers license',
    "driver's license",
    'driving licence',
    'license',
    'licence',
  ],
  ['laptop', 'notebook computer'],
  ['backpack', 'rucksack', 'school bag'],
  ['sneakers', 'trainers', 'running shoes'],
  ['hoodie', 'sweatshirt'],
  ['pen drive', 'pendrive', 'usb stick', 'usb drive', 'flash drive', 'thumb drive'],
  ['flashlight', 'torch'],
  ['documents', 'papers', 'docs'],
  ['medicine', 'meds', 'pills', 'medication'],
  ['hair tie', 'scrunchie', 'hair band', 'hairband'],
  ['power bank', 'powerbank', 'battery pack'],
  ['bottle', 'water bottle'],
  ['passport', 'pass port'],
  ['sweater', 'jumper', 'pullover'],
  ['trousers', 'pants'],
];

const CANONICAL = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  const canonical = itemKey(group[0] ?? '');
  for (const word of group) CANONICAL.set(itemKey(word), canonical);
}

/** Maps synonyms onto one shared key: canonical("specs") === canonical("glasses"). */
export function canonical(key: string): string {
  return CANONICAL.get(key) ?? key;
}

const wordSet = (key: string) => new Set(key.split(' ').filter(Boolean).map(singularize));

function bestFirst<T extends Searchable>(a: Match<T>, b: Match<T>) {
  return a.score - b.score || b.item.updatedAt - a.item.updatedAt;
}

/** All plausible matches for a query, best first. */
/** Words that carry no meaning in a search, including common typos of "where". */
const QUERY_NOISE = new Set([
  'where',
  'wher',
  'whre',
  'wehre',
  'were',
  'wheres',
  'is',
  'are',
  'my',
  'the',
  'a',
  'an',
  'did',
  'i',
  'put',
  'leave',
  'left',
  'find',
  'go',
  'went',
  'at',
  'now',
  'again',
]);

/** Drops filler words ("wher are my glases" → "glases"), unless nothing would be left. */
function meaningful(query: string): string {
  const kept = words(query).filter((w) => !QUERY_NOISE.has(w));
  return kept.length ? kept.join(' ') : query;
}

export function searchItems<T extends Searchable>(query: string, items: readonly T[]): Match<T>[] {
  const qKey = itemKey(meaningful(query));
  if (!qKey) return [];
  const qCanonical = canonical(qKey);
  const qWords = wordSet(qKey);
  const results = new Map<string, Match<T>>();
  const add = (item: T, score: number, reason: Match<T>['reason']) => {
    const previous = results.get(item.id);
    if (!previous || previous.score > score) results.set(item.id, { item, score, reason });
  };

  for (const item of items) {
    if (item.key === qKey) {
      add(item, 0, 'exact');
      continue;
    }
    if (canonical(item.key) === qCanonical) {
      add(item, 0.05, 'synonym');
      continue;
    }
    const iWords = wordSet(item.key);
    const shared = [...qWords].filter(
      (w) => iWords.has(w) || [...iWords].some((iw) => canonical(iw) === canonical(w)),
    ).length;
    if (shared === 0) continue;
    if (shared === qWords.size) {
      // "remote" → "tv remote": every word you typed is in the name.
      add(item, 0.1 + 0.05 * (iWords.size - shared), 'words');
    } else {
      // "phone case" vs "airpods case": related, but not the same thing.
      add(item, 0.55, 'partial');
    }
  }

  const fuse = new Fuse(items as T[], {
    keys: ['key', 'name'],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
  });
  for (const hit of fuse.search(qKey)) add(hit.item, 0.15 + (hit.score ?? 1), 'fuzzy');

  return [...results.values()].sort(bestFirst);
}

/** The answer (if confident) plus up to three "did you mean" suggestions. */
export function findBest<T extends Searchable>(query: string, items: readonly T[]) {
  const matches = searchItems(query, items);
  const top = matches[0];
  const best = top && top.score <= CONFIDENT ? top : undefined;
  const alternatives = matches.filter((m) => m !== best).slice(0, 3);
  return { best, alternatives };
}

/** Everything stashed in (or on, or under…) a place. */
export function searchPlace<T extends Searchable>(query: string, items: readonly T[]): T[] {
  const qKey = placeKey(query);
  if (!qKey) return [];
  const qWords = [...wordSet(qKey)];
  const scored: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    if (item.placeKey === qKey) {
      scored.push({ item, score: 0 });
      continue;
    }
    const placeWords = new Set([...words(item.place).map(singularize), ...wordSet(item.placeKey)]);
    if (qWords.every((w) => placeWords.has(w))) scored.push({ item, score: 0.2 });
  }

  if (scored.length === 0) {
    const fuse = new Fuse(items as T[], {
      keys: ['placeKey', 'place'],
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
    });
    for (const hit of fuse.search(qKey))
      scored.push({ item: hit.item, score: 0.3 + (hit.score ?? 1) });
  }

  return scored
    .sort((a, b) => a.score - b.score || b.item.updatedAt - a.item.updatedAt)
    .map((s) => s.item);
}

/** Known places that match what is being typed, for consistent naming. */
export function suggestPlaces(partial: string, places: readonly string[], limit = 4): string[] {
  const qKey = placeKey(partial);
  if (qKey.length < 2) return [];
  const unique = [...new Set(places)];
  const fuse = new Fuse(unique, { includeScore: true, threshold: 0.35, ignoreLocation: true });
  return fuse
    .search(qKey)
    .map((hit) => hit.item)
    .filter((place) => place.toLowerCase() !== partial.trim().toLowerCase())
    .slice(0, limit);
}
