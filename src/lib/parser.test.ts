import { describe, expect, it } from 'vitest';
import { type Intent, parseInput } from './parser';

const stash = (items: string[], place: string, extra: Partial<Intent> = {}) => ({
  kind: 'stash',
  items,
  place,
  ...extra,
});
const find = (item: string) => ({ kind: 'find', item });

describe('parseInput: stashing', () => {
  it.each([
    ['keys in the blue drawer', stash(['keys'], 'in the blue drawer')],
    ['Passport in the black bag, top shelf', stash(['Passport'], 'in the black bag, top shelf')],
    [
      'I put my passport in the black bag on the top shelf',
      stash(['passport'], 'in the black bag on the top shelf'),
    ],
    ['left the charger under the bed', stash(['charger'], 'under the bed')],
    ['keys → blue drawer', stash(['keys'], 'blue drawer')],
    ['keys -> drawer', stash(['keys'], 'drawer')],
    ['keys: kitchen counter', stash(['keys'], 'kitchen counter')],
    ['keys = hook by the door', stash(['keys'], 'hook by the door')],
    ['spare key - under the doormat', stash(['spare key'], 'under the doormat')],
    ['box with cables → garage', stash(['box with cables'], 'garage')],
    ['passport and wallet in the safe', stash(['passport', 'wallet'], 'in the safe')],
    ['passport, wallet & keys in the safe', stash(['passport', 'wallet', 'keys'], 'in the safe')],
    ["my mom's ring in the jewelry box", stash(["mom's ring"], 'in the jewelry box')],
    [
      'HDMI cable inside the drawer under the TV',
      stash(['HDMI cable'], 'inside the drawer under the TV'),
    ],
    ['glasses are on my head', stash(['glasses'], 'on my head')],
    ['the remote is between the sofa cushions', stash(['remote'], 'between the sofa cushions')],
    ["passport's in the safe", stash(['passport'], 'in the safe')],
    ["I've just stashed the cookies behind the cereal", stash(['cookies'], 'behind the cereal')],
    ['winter gloves up in the attic', stash(['winter gloves'], 'up in the attic')],
    ['moved the keys to the shelf', stash(['keys'], 'to the shelf')],
    ['car keys on top of the fridge', stash(['car keys'], 'on top of the fridge')],
    ['laptop at the office', stash(['laptop'], 'at the office')],
    ['umbrella next to the front door', stash(['umbrella'], 'next to the front door')],
    [
      'AirPods case in the jacket I wore yesterday',
      stash(['AirPods case'], 'in the jacket I wore yesterday'),
    ],
    ['fyi: tax papers in the blue folder', stash(['tax papers'], 'in the blue folder')],
    [
      'remember that the spare key is under the fake rock',
      stash(['spare key'], 'under the fake rock'),
    ],
    ['keys in drawer at 5:30', stash(['keys'], 'in drawer at 5:30')],
    ['“Keys in the ‘junk’ drawer.”', stash(['Keys'], "in the 'junk' drawer")],
    ['ok so I put my keys in the bowl lol', stash(['keys'], 'in the bowl')],
    ['keys in the bowl now', stash(['keys'], 'in the bowl')],
    [
      'the batteries for the remote in the kitchen drawer',
      stash(['batteries for the remote'], 'in the kitchen drawer'),
    ],
    ['charger with Tanvir', stash(['charger'], 'with Tanvir')],
    ['chargers by the bed', stash(['chargers'], 'by the bed')],
    ['i hid the chocolate inside the rice bag', stash(['chocolate'], 'inside the rice bag')],
    [
      'Note: birth certificate in the blue folder',
      stash(['birth certificate'], 'in the blue folder'),
    ],
    ['keys in drawer: top one', stash(['keys'], 'in drawer: top one')],
    ['চাবি → ড্রয়ার', stash(['চাবি'], 'ড্রয়ার')],
  ])('%s', (input, expected) => {
    expect(parseInput(input)).toEqual(expected);
  });

  it('knows when you lent something to someone', () => {
    expect(parseInput('lent my drill to Rafi')).toEqual(
      stash(['drill'], 'with Rafi', { lent: true }),
    );
    expect(parseInput('gave the charger to mom')).toEqual(
      stash(['charger'], 'with mom', { lent: true }),
    );
    expect(parseInput('Rafi borrowed my drill')).toEqual(
      stash(['drill'], 'with Rafi', { lent: true }),
    );
  });

  it('treats "found X in Y" as a new location and a happy ending', () => {
    expect(parseInput('found my keys in the jacket')).toEqual(
      stash(['keys'], 'in the jacket', { found: true }),
    );
  });

  it('asks for a place when the sentence stops halfway', () => {
    expect(parseInput('keys in')).toEqual({ kind: 'unknown', text: 'keys', reason: 'noPlace' });
  });

  it('refuses ridiculously long items', () => {
    const intent = parseInput(`${'very '.repeat(30)}long thing in the drawer`);
    expect(intent.kind).toBe('unknown');
  });
});

describe('parseInput: finding', () => {
  it.each([
    ["where's my passport?", find('passport')],
    ['where is the TV remote', find('TV remote')],
    ['where are my keys', find('keys')],
    ['Where did I put my glasses?', find('glasses')],
    ['where did my keys go', find('keys')],
    ['where the heck are my keys', find('keys')],
    ['have you seen my wallet?', find('wallet')],
    ['find keys', find('keys')],
    ['looking for the charger', find('charger')],
    ['keys?', find('keys')],
    ['passport', find('passport')],
    ["dude where's my car", find('car')],
    ["can't find my phone", find('phone')],
    ['I lost my AirPods', find('AirPods')],
    ['where my keys at', find('keys')],
    ['wheres the remote', find('remote')],
    ['who has my drill?', find('drill')],
    ['is my passport in the black bag?', find('passport')],
    ['keys in the drawer?', find('keys')],
    ['where are my keys again bro', find('keys')],
    ['help me find my sunglasses', find('sunglasses')],
    ['“where’s my wallet”', find('wallet')],
    ['wher are my glases', find('glases')],
    ['whre is the remote?', find('remote')],
  ])('%s', (input, expected) => {
    expect(parseInput(input)).toEqual(expected);
  });
});

describe('parseInput: what is in a place', () => {
  it.each([
    ["what's in the black bag", 'in the black bag'],
    ['what is under the bed?', 'under the bed'],
    ['what did I put in the garage', 'in the garage'],
    ["show me what's in my car", 'in my car'],
    ['anything in the drawer?', 'in the drawer'],
  ])('%s', (input, place) => {
    expect(parseInput(input)).toEqual({ kind: 'whatsIn', place });
  });
});

describe('parseInput: other', () => {
  it('handles empty input', () => {
    expect(parseInput('')).toEqual({ kind: 'empty' });
    expect(parseInput('   ')).toEqual({ kind: 'empty' });
    expect(parseInput('?!')).toEqual({ kind: 'empty' });
  });

  it('marks things as found', () => {
    expect(parseInput('found it')).toEqual({ kind: 'found', item: 'it' });
    expect(parseInput('found my keys!')).toEqual({ kind: 'found', item: 'keys' });
  });

  it('admits when it is confused', () => {
    expect(parseInput('I really need to remember to buy milk tomorrow morning')).toMatchObject({
      kind: 'unknown',
      reason: 'confused',
    });
  });

  it('respects hints from links', () => {
    expect(parseInput('keys in the drawer', 'find')).toEqual(find('keys in the drawer'));
    expect(parseInput('keys', 'stash')).toEqual({
      kind: 'unknown',
      text: 'keys',
      reason: 'noPlace',
    });
    expect(parseInput('keys in the drawer', 'stash')).toEqual(stash(['keys'], 'in the drawer'));
  });
});
