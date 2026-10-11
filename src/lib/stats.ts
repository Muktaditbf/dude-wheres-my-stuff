/** Numbers for the Chaos Report and the Hall of Shame. Pure functions only. */
import type { Item, StuffEvent } from '../db/schema';
import { DAY } from './time';

export interface Rank {
  min: number;
  emoji: string;
  title: string;
  blurb: string;
}

export const RANKS: Rank[] = [
  {
    min: 0,
    emoji: '🧐',
    title: 'Suspiciously Organized',
    blurb: "Either you never lose anything, or you haven't asked me yet.",
  },
  {
    min: 1,
    emoji: '🙂',
    title: 'Casual Misplacer',
    blurb: 'You lose things like a normal human being. Respect.',
  },
  {
    min: 6,
    emoji: '🐟',
    title: 'Goldfish Mode',
    blurb: 'Three-second memory. Infinite confidence.',
  },
  {
    min: 16,
    emoji: '🐿️',
    title: 'Squirrel Who Forgot the Nuts',
    blurb: "You hide things so well that even you can't find them.",
  },
  {
    min: 31,
    emoji: '👹',
    title: 'Chaos Gremlin',
    blurb: "Things don't get lost around you. They get relocated.",
  },
  {
    min: 61,
    emoji: '👑',
    title: 'Absolute Legend of Losing Stuff',
    blurb: 'Bards will sing of the remote you lost. Twice. In one day.',
  },
];

export function rankFor(score: number): { rank: Rank; next?: Rank } {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (score >= rank.min) index = i;
  });
  return { rank: RANKS[index] ?? (RANKS[0] as Rank), next: RANKS[index + 1] };
}

export const isGhosted = (item: Item, ghostDays: number, now = Date.now()) =>
  now - item.checkedAt > ghostDays * DAY;

/** Most-lost first. Ties go to whatever went missing more often. */
export function hallOfShame(items: readonly Item[]): Item[] {
  return items
    .filter((item) => item.searchCount > 0)
    .sort(
      (a, b) =>
        b.searchCount - a.searchCount ||
        b.notThereCount - a.notThereCount ||
        b.updatedAt - a.updatedAt,
    );
}

export interface ChaosStats {
  tracked: number;
  searches: number;
  found: number;
  notThere: number;
  /** 0..1, or null when nothing was searched yet. */
  foundRate: number | null;
  mostLost?: Item;
  worstHour?: number;
  lent: Item[];
  ghosted: Item[];
  oldest?: Item;
  score: number;
  rank: Rank;
  next?: Rank;
}

export function computeStats(
  items: readonly Item[],
  events: readonly StuffEvent[],
  ghostDays: number,
  now = Date.now(),
): ChaosStats {
  const searches = items.reduce((sum, i) => sum + i.searchCount, 0);
  const found = items.reduce((sum, i) => sum + i.foundCount, 0);
  const notThere = items.reduce((sum, i) => sum + i.notThereCount, 0);

  const hours = new Array<number>(24).fill(0);
  for (const event of events) {
    if (event.type === 'search') {
      const hour = new Date(event.at).getHours();
      hours[hour] = (hours[hour] ?? 0) + 1;
    }
  }
  const peak = Math.max(...hours);
  const worstHour = peak > 0 ? hours.indexOf(peak) : undefined;

  const score = searches + 2 * notThere;
  const { rank, next } = rankFor(score);
  const oldest = [...items].sort((a, b) => a.updatedAt - b.updatedAt)[0];

  return {
    tracked: items.length,
    searches,
    found,
    notThere,
    foundRate: searches > 0 ? Math.min(1, found / searches) : null,
    mostLost: hallOfShame(items)[0],
    worstHour,
    lent: items.filter((i) => i.lent),
    ghosted: items.filter((i) => isGhosted(i, ghostDays, now)),
    oldest,
    score,
    rank,
    next,
  };
}
