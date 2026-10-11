import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup } from '../lib/backup';
import { loadDemo } from '../lib/demo';
import { computeStats, hallOfShame } from '../lib/stats';
import {
  clearDemo,
  confirmStillThere,
  deleteItem,
  itemEvents,
  markFound,
  markNotThere,
  recordSearch,
  renameItem,
  stash,
  summarizeSpots,
  undo,
  wipeEverything,
} from './actions';
import { db } from './schema';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const allItems = () => db.items.toArray();

describe('stash', () => {
  it('saves a new item with a nice emoji', async () => {
    const { outcomes } = await stash({
      names: ['my Passport'],
      place: 'in the black bag, top shelf',
    });
    expect(outcomes[0]).toMatchObject({ created: true, samePlace: false });
    const [item] = await allItems();
    expect(item).toMatchObject({
      name: 'Passport',
      key: 'passport',
      emoji: '🛂',
      place: 'in the black bag, top shelf',
      placeKey: 'black bag',
    });
  });

  it('moves a known item instead of duplicating it', async () => {
    await stash({ names: ['keys'], place: 'on the kitchen counter', at: 1000 });
    const { outcomes } = await stash({ names: ['My Keys'], place: 'in the blue bowl', at: 2000 });
    expect(outcomes[0]?.created).toBe(false);
    expect(outcomes[0]?.previous?.place).toBe('on the kitchen counter');
    const items = await allItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.place).toBe('in the blue bowl');
  });

  it('treats synonyms as the same thing and keeps the original name', async () => {
    await stash({ names: ['Glasses'], place: 'on the desk' });
    await stash({ names: ['specs'], place: 'on my head' });
    const items = await allItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Glasses', place: 'on my head' });
  });

  it('notices when you put it back in the same place', async () => {
    await stash({ names: ['keys'], place: 'in the bowl' });
    const { outcomes } = await stash({ names: ['keys'], place: 'in the bowl' });
    expect(outcomes[0]?.samePlace).toBe(true);
  });

  it('stashes several things at once and skips duplicates', async () => {
    const { outcomes } = await stash({
      names: ['passport', 'wallet', 'Passport'],
      place: 'in the safe',
    });
    expect(outcomes).toHaveLength(2);
    expect(await allItems()).toHaveLength(2);
  });

  it('clears the missing flag once the item is put somewhere', async () => {
    const { outcomes } = await stash({ names: ['remote'], place: 'on the sofa' });
    const id = outcomes[0]?.item.id ?? '';
    await markNotThere(id);
    expect((await db.items.get(id))?.missing).toBe(true);
    await stash({ names: ['remote'], place: 'in the fridge' });
    expect((await db.items.get(id))?.missing).toBeUndefined();
  });

  it('can be undone completely', async () => {
    await stash({ names: ['keys'], place: 'on the counter', at: 1000 });
    const before = await allItems();
    const { undo: token } = await stash({
      names: ['keys', 'wallet'],
      place: 'in the bowl',
      at: 2000,
    });
    await undo(token);
    expect(await allItems()).toEqual(before);
    expect(await db.events.count()).toBe(1);
  });
});

describe('searching and finding', () => {
  it('counts searches, finds and not-theres', async () => {
    const { outcomes } = await stash({ names: ['keys'], place: 'in the bowl' });
    const id = outcomes[0]?.item.id ?? '';
    await recordSearch(id);
    await recordSearch(id);
    await markNotThere(id);
    await markFound(id);
    const item = await db.items.get(id);
    expect(item).toMatchObject({ searchCount: 2, notThereCount: 1, foundCount: 1 });
    expect(item?.missing).toBeUndefined();
    const types = (await itemEvents(id)).map((e) => e.type);
    expect(types).toEqual(['stash', 'search', 'search', 'notThere', 'found']);
  });

  it('remembers where things usually end up', async () => {
    await stash({ names: ['charger'], place: 'next to the bed', at: 1 });
    await stash({ names: ['charger'], place: 'in the living room', at: 2 });
    await stash({ names: ['charger'], place: 'next to the bed', at: 3 });
    await stash({ names: ['charger'], place: 'in my backpack', at: 4 });
    const [item] = await allItems();
    const spots = summarizeSpots(await itemEvents(item?.id ?? ''));
    expect(spots[0]).toMatchObject({ placeKey: 'bed', count: 2 });
    expect(spots.map((s) => s.placeKey)).toEqual(['bed', 'backpack', 'living room']);
  });

  it('confirms an item is still there', async () => {
    const { outcomes } = await stash({ names: ['gloves'], place: 'in the attic', at: 1 });
    const id = outcomes[0]?.item.id ?? '';
    await confirmStillThere(id, 5000);
    expect((await db.items.get(id))?.checkedAt).toBe(5000);
  });
});

describe('editing', () => {
  it('renames, but refuses to create a clash', async () => {
    const { outcomes } = await stash({ names: ['keys', 'wallet'], place: 'in the bowl' });
    const keysId = outcomes[0]?.item.id ?? '';
    expect(await renameItem(keysId, 'wallet')).toBe('exists');
    expect(await renameItem(keysId, '   ')).toBe('empty');
    expect(await renameItem(keysId, 'Car keys')).toBe('ok');
    expect((await db.items.get(keysId))?.key).toBe('car key');
  });

  it('deletes an item with its history, and undo brings it all back', async () => {
    const { outcomes } = await stash({ names: ['keys'], place: 'in the bowl' });
    const id = outcomes[0]?.item.id ?? '';
    await recordSearch(id);
    const token = await deleteItem(id);
    expect(await db.items.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
    await undo(token);
    expect(await db.items.count()).toBe(1);
    expect(await db.events.count()).toBe(2);
  });
});

describe('demo, stats and backup', () => {
  it('loads demo stuff that tells a story, and removes it again', async () => {
    const count = await loadDemo();
    expect(count).toBeGreaterThan(10);
    const items = await allItems();
    expect(hallOfShame(items)[0]?.name).toBe('TV remote');
    const stats = computeStats(items, await db.events.toArray(), 60);
    expect(stats.ghosted.map((i) => i.name)).toEqual(
      expect.arrayContaining(['Spare house key', 'Birth certificate', 'Winter gloves']),
    );
    expect(stats.lent.map((i) => i.name)).toEqual(['Drill']);
    expect(stats.rank.title).not.toBe('Suspiciously Organized');

    await stash({ names: ['bike'], place: 'in the shed' });
    expect(await clearDemo()).toBe(count);
    expect((await allItems()).map((i) => i.name)).toEqual(['bike']);
  });

  it('round-trips a backup', async () => {
    await stash({ names: ['passport'], place: 'in the safe' });
    const backup = parseBackup(JSON.stringify(await createBackup()));
    await wipeEverything();
    expect(await db.items.count()).toBe(0);
    await restoreBackup(backup);
    await restoreBackup(backup);
    expect(await db.items.count()).toBe(1);
    expect(await db.events.count()).toBe(1);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/JSON/);
    expect(() => parseBackup('{"hello":"world"}')).toThrow(/backup/);
  });
});
