import { describe, expect, it } from 'vitest';
import { cleanPhrase, displayName, itemKey, placeKey, singularize } from './normalize';

describe('singularize', () => {
  it.each([
    ['keys', 'key'],
    ['batteries', 'battery'],
    ['cookies', 'cookie'],
    ['hoodies', 'hoodie'],
    ['knives', 'knife'],
    ['gloves', 'glove'],
    ['boxes', 'box'],
    ['watches', 'watch'],
    ['brushes', 'brush'],
    ['dresses', 'dress'],
    ['shoes', 'shoe'],
    ['ties', 'tie'],
    ['glasses', 'glasses'],
    ['scissors', 'scissors'],
    ['headphones', 'headphones'],
    ['cactus', 'cactus'],
    ['airpods', 'airpod'],
    ['lenses', 'lens'],
    ['caches', 'cache'],
    ['bag', 'bag'],
  ])('%s → %s', (word, expected) => {
    expect(singularize(word)).toBe(expected);
  });
});

describe('itemKey', () => {
  it.each([
    ['My Keys', 'key'],
    ['the TV Remotes', 'tv remote'],
    ['Glasses', 'glasses'],
    ["Mom's rings", "mom's ring"],
    ['  all my   socks ', 'sock'],
    ['AirPods', 'airpod'],
    ['the', 'the'],
    ['USB-C cables!', 'usb-c cable'],
  ])('%s → %s', (name, expected) => {
    expect(itemKey(name)).toBe(expected);
  });

  it('treats different spellings of the same thing as one item', () => {
    expect(itemKey('my keys')).toBe(itemKey('The Key'));
  });
});

describe('placeKey', () => {
  it.each([
    ['in the black bag, top shelf', 'black bag'],
    ['under the beds', 'bed'],
    ['up in the attic', 'attic'],
    ['on top of the fridge', 'fridge'],
    ['black bag on the top shelf', 'black bag'],
    ['with Rafi', 'rafi'],
    ['blue drawer', 'blue drawer'],
    ['in the box labelled winter stuff in the attic', 'box labelled winter stuff'],
    ['next to the front door', 'front door'],
  ])('%s → %s', (place, expected) => {
    expect(placeKey(place)).toBe(expected);
  });
});

describe('cleanPhrase / displayName', () => {
  it('tidies up messy input', () => {
    expect(cleanPhrase('  "keys"  ')).toBe('keys');
    expect(cleanPhrase('in the drawer!!!')).toBe('in the drawer');
    expect(displayName('my Passport')).toBe('Passport');
    expect(displayName('the')).toBe('the');
  });
});
