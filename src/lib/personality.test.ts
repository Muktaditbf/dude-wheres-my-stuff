import { describe, expect, it } from 'vitest';
import type { Item } from '../db/schema';
import { fill, findSituation, placePhrase, say } from './personality';
import { PLACEHOLDERS, ROASTS, SITUATIONS } from './roasts';
import { DAY } from './time';

const item = (patch: Partial<Item> = {}): Item => ({
  id: '1',
  name: 'Keys',
  key: 'key',
  emoji: '🔑',
  place: 'in the blue bowl',
  placeKey: 'blue bowl',
  createdAt: 0,
  updatedAt: new Date(2026, 0, 10, 12).getTime(),
  checkedAt: new Date(2026, 0, 10, 12).getTime(),
  searchCount: 1,
  foundCount: 0,
  notThereCount: 0,
  ...patch,
});
const noon = new Date(2026, 0, 12, 12).getTime();

describe('roast lines', () => {
  it('has bro lines for every situation', () => {
    for (const situation of SITUATIONS) {
      expect(ROASTS[situation].bro?.length, situation).toBeGreaterThan(0);
    }
  });

  it('has polite lines for everything except the jokes that only make sense as roasts', () => {
    const roastOnly = new Set(['findNight', 'findSock']);
    for (const situation of SITUATIONS) {
      if (!roastOnly.has(situation)) {
        expect(ROASTS[situation].chill?.length, situation).toBeGreaterThan(0);
      }
    }
  });

  it('only uses known placeholders', () => {
    const known = new Set<string>(PLACEHOLDERS);
    for (const [situation, levels] of Object.entries(ROASTS)) {
      for (const lines of Object.values(levels)) {
        for (const line of lines ?? []) {
          for (const [, name] of line.matchAll(/\{(\w+)\}/g)) {
            expect(known.has(name ?? ''), `${situation}: {${name}} in "${line}"`).toBe(true);
          }
        }
      }
    }
  });
});

describe('fill', () => {
  it('fills placeholders and capitalizes the sentence', () => {
    expect(
      fill('{place}. You put it there {ago}.', { place: 'in the bag', ago: '2 days ago' }),
    ).toBe('In the bag. You put it there 2 days ago.');
  });
});

describe('say', () => {
  it('never repeats the same line twice in a row', () => {
    const always = () => 0;
    const first = say('found', 'bro', {}, { random: always });
    const second = say('found', 'bro', {}, { random: always });
    expect(second).not.toBe(first);
  });

  it('uses the fallback when a level has no lines', () => {
    const vars = { item: 'Keys', place: 'in the bag', ago: 'today' };
    const expected = fill(ROASTS.findFirst.chill?.[0] ?? '', vars);
    expect(say('findNight', 'chill', vars, { fallback: 'findFirst' })).toBe(expected);
  });
});

describe('placePhrase', () => {
  it.each([
    ['in the black bag', 'in the black bag'],
    ['blue drawer', 'at the blue drawer'],
    ['my car', 'at my car'],
    ["Mom's place", "at Mom's place"],
    ['with Rafi', 'with Rafi'],
    ['under the bed', 'under the bed'],
  ])('%s → %s', (place, expected) => {
    expect(placePhrase(place)).toBe(expected);
  });
});

describe('findSituation', () => {
  it('escalates with every search', () => {
    expect(findSituation(item({ searchCount: 1 }), 'bro', noon)).toBe('findFirst');
    expect(findSituation(item({ searchCount: 3 }), 'bro', noon)).toBe('findAgain');
    expect(findSituation(item({ searchCount: 5 }), 'bro', noon)).toBe('findOften');
    expect(findSituation(item({ searchCount: 9 }), 'bro', noon)).toBe('findLegend');
  });

  it('notices special cases', () => {
    expect(findSituation(item({ missing: true }), 'bro', noon)).toBe('findMissing');
    expect(findSituation(item({ lent: true, place: 'with Rafi' }), 'bro', noon)).toBe('findLent');
    expect(findSituation(item({ updatedAt: noon - 120 * DAY }), 'bro', noon)).toBe('findOld');
    expect(findSituation(item({ key: 'left sock' }), 'bro', noon)).toBe('findSock');
    expect(findSituation(item({ key: 'left sock' }), 'chill', noon)).toBe('findFirst');
  });
});
