import { describe, expect, it } from 'vitest';
import { emojiFor } from '../lib/emoji';
import { itemKey, placeKey } from '../lib/normalize';
import { canonical, findBest, type Searchable, searchPlace, suggestPlaces } from './search';

let id = 0;
const make = (name: string, place = 'in the drawer', updatedAt = 0): Searchable => ({
  id: String(++id),
  name,
  key: itemKey(name),
  place,
  placeKey: placeKey(place),
  updatedAt,
});

const items = [
  make('Keys', 'in the blue bowl by the door'),
  make('Car keys', 'on top of the fridge'),
  make('TV remote', 'between the sofa cushions'),
  make('Passport', 'in the black bag, top shelf'),
  make('Glasses', 'on top of my head'),
  make('AirPods case', 'in my jacket'),
  make('Phone charger', 'next to the bed'),
  make('Birth certificate', 'in the black bag'),
];

const best = (query: string) => findBest(query, items).best?.item.name;

describe('findBest', () => {
  it.each([
    ['keys', 'Keys'],
    ['my key', 'Keys'],
    ['passport', 'Passport'],
    ['pasport', 'Passport'],
    ['remote', 'TV remote'],
    ['clicker', 'TV remote'],
    ['specs', 'Glasses'],
    ['charger', 'Phone charger'],
    ['airpods', 'AirPods case'],
    ['wher are my glases', 'Glasses'],
    ['where did i put my passport', 'Passport'],
  ])('%s → %s', (query, expected) => {
    expect(best(query)).toBe(expected);
  });

  it('does not confidently answer with something that only shares a word', () => {
    expect(best('phone case')).toBeUndefined();
    expect(findBest('phone case', items).alternatives.map((m) => m.item.name)).toContain(
      'AirPods case',
    );
  });

  it('offers related items as "did you mean"', () => {
    const { alternatives } = findBest('keys', items);
    expect(alternatives.map((m) => m.item.name)).toContain('Car keys');
  });

  it('finds nothing for nonsense', () => {
    expect(findBest('unicorn', items).best).toBeUndefined();
  });
});

describe('searchPlace', () => {
  it('finds everything in a container', () => {
    expect(searchPlace('in the black bag', items).map((i) => i.name)).toEqual(
      expect.arrayContaining(['Passport', 'Birth certificate']),
    );
    expect(searchPlace('the bag', items)).toHaveLength(2);
  });

  it('matches details further into the place description', () => {
    expect(searchPlace('on the top shelf', items).map((i) => i.name)).toEqual(['Passport']);
  });
});

describe('helpers', () => {
  it('canonicalizes synonyms', () => {
    expect(canonical(itemKey('specs'))).toBe(canonical(itemKey('glasses')));
    expect(canonical(itemKey('mobile'))).toBe(canonical(itemKey('phone')));
  });

  it('suggests known places while typing', () => {
    expect(
      suggestPlaces('in the blue bow', ['in the blue bowl by the door', 'under the bed']),
    ).toEqual(['in the blue bowl by the door']);
  });

  it.each([
    ['Phone charger', '🔌'],
    ['car keys', '🔑'],
    ['batteries for the remote', '🔋'],
    ['AirPods case', '🎧'],
    ['Left sock', '🧦'],
    ['Thing-a-ma-jig', '📦'],
  ])('emoji for %s is %s', (name, emoji) => {
    expect(emojiFor(name)).toBe(emoji);
  });
});
