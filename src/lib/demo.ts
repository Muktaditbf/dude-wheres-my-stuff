/**
 * "Load demo stuff": a believable, slightly tragic household so visitors can
 * try every feature in five seconds. Demo items are flagged and removable.
 */
import { db, type Item, newId, type StuffEvent } from '../db/schema';
import { emojiFor } from './emoji';
import { itemKey, placeKey } from './normalize';
import { DAY, HOUR } from './time';

/** Days ago, or [days ago, hour of day] for a specific time. */
type When = number | [number, number];

interface DemoSpec {
  name: string;
  history: Array<[string, When]>;
  searches?: When[];
  notThere?: When[];
  lent?: boolean;
}

const SPECS: DemoSpec[] = [
  {
    name: 'TV remote',
    history: [
      ['on the armrest of the sofa', 40],
      ['under the sofa', 26],
      ['between the sofa cushions', 12],
      ["in the fridge (don't ask)", 9],
      ['between the sofa cushions', 2],
    ],
    searches: [
      [38, 21],
      [30, 2],
      [25, 23],
      [20, 2],
      [14, 1],
      [10, 2],
      [8, 22],
      [3, 2],
      [1, 20],
    ],
    notThere: [
      [25, 23],
      [8, 22],
    ],
  },
  {
    name: 'Keys',
    history: [
      ['on the kitchen counter', 60],
      ['in my jacket pocket', 33],
      ['in the blue bowl by the door', 20],
      ['in the blue bowl by the door', 6],
      ['in the blue bowl by the door', 0.3],
    ],
    searches: [[58, 8], [50, 8], [33, 9], [21, 8], [15, 2], [4, 8], 0.2],
    notThere: [[33, 9]],
  },
  {
    name: 'Phone charger',
    history: [
      ['next to the bed', 50],
      ['in the living room', 35],
      ['next to the bed', 22],
      ['next to the bed', 7],
      ['in my backpack', 3],
    ],
    searches: [
      [48, 23],
      [34, 1],
      [21, 23],
      [6, 2],
      [2, 23],
    ],
    notThere: [[2, 23]],
  },
  {
    name: 'Passport',
    history: [['in the black bag, top shelf of the closet', 12]],
    searches: [[5, 2], [2, 3], 0.1],
  },
  {
    name: 'Glasses',
    history: [['on top of my head', 1]],
    searches: [[20, 9], [9, 10], [4, 2], 0.9],
  },
  {
    name: 'Secret chocolate',
    history: [['behind the cereal box', 4]],
    searches: [[3, 2], [2, 2], [1, 1], 0.5],
  },
  {
    name: 'AirPods case',
    history: [['in the jacket I wore yesterday', 1.5]],
    searches: [[10, 18], 1],
  },
  {
    name: 'Left sock',
    history: [['behind the washing machine', 30]],
    searches: [
      [29, 7],
      [15, 7],
    ],
  },
  {
    name: 'Drill',
    history: [['with Rafi', 45]],
    searches: [[3, 11]],
    lent: true,
  },
  {
    name: 'Wallet',
    history: [['in the car, cup holder', 0.5]],
    searches: [0.4],
  },
  {
    name: 'Spare house key',
    history: [['under the fake rock in the garden', 140]],
  },
  {
    name: 'Birth certificate',
    history: [['in the blue folder, bottom drawer of the desk', 210]],
  },
  {
    name: 'Winter gloves',
    history: [["in the box labelled 'winter stuff' in the attic", 95]],
  },
];

function toTime(when: When, now: number): number {
  if (typeof when === 'number') return now - when * DAY;
  const [daysAgo, hour] = when;
  const day = new Date(now - daysAgo * DAY);
  day.setHours(hour, 7 + ((daysAgo * 13) % 50), 0, 0);
  return Math.min(day.getTime(), now - HOUR);
}

export async function loadDemo(now = Date.now()): Promise<number> {
  const existingKeys = new Set((await db.items.toArray()).map((i) => i.key));
  const items: Item[] = [];
  const events: StuffEvent[] = [];

  for (const spec of SPECS) {
    const key = itemKey(spec.name);
    if (existingKeys.has(key)) continue;
    const id = newId();
    const history = spec.history.map(([place, when]) => ({ place, at: toTime(when, now) }));
    const searches = (spec.searches ?? []).map((w) => toTime(w, now));
    const notThere = (spec.notThere ?? []).map((w) => toTime(w, now));
    const first = history[0];
    const last = history[history.length - 1];
    if (!first || !last) continue;

    for (const h of history) {
      events.push({
        itemId: id,
        type: 'stash',
        at: h.at,
        place: h.place,
        placeKey: placeKey(h.place),
      });
    }
    for (const at of searches) events.push({ itemId: id, type: 'search', at });
    for (const at of notThere) events.push({ itemId: id, type: 'notThere', at: at + 60_000 });
    const foundCount = Math.max(0, searches.length - notThere.length);
    searches.slice(0, foundCount).forEach((at) => {
      events.push({ itemId: id, type: 'found', at: at + 120_000 });
    });

    items.push({
      id,
      name: spec.name,
      key,
      emoji: emojiFor(spec.name),
      place: last.place,
      placeKey: placeKey(last.place),
      lent: spec.lent || undefined,
      demo: true,
      createdAt: first.at,
      updatedAt: last.at,
      checkedAt: Math.max(last.at, ...searches),
      searchCount: searches.length,
      foundCount,
      notThereCount: notThere.length,
    });
  }

  await db.transaction('rw', [db.items, db.events], async () => {
    await db.items.bulkAdd(items);
    await db.events.bulkAdd(events);
  });
  return items.length;
}
