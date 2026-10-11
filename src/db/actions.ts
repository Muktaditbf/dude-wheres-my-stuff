/**
 * Every write to the database goes through here. Each change that the user
 * might regret returns an undo token, which the UI turns into an "Undo" button.
 */
import { emojiFor } from '../lib/emoji';
import { cleanPhrase, displayName, itemKey, placeKey } from '../lib/normalize';
import { canonical } from '../search/search';
import { db, type Item, newId, type Photo, type StuffEvent } from './schema';

export interface UndoToken {
  createdItemIds: string[];
  previousItems: Item[];
  addedEventIds: number[];
  addedPhotoIds: string[];
  removedEvents: StuffEvent[];
  removedPhotos: Photo[];
}

const emptyUndo = (): UndoToken => ({
  createdItemIds: [],
  previousItems: [],
  addedEventIds: [],
  addedPhotoIds: [],
  removedEvents: [],
  removedPhotos: [],
});

export interface StashOutcome {
  item: Item;
  previous?: Item;
  created: boolean;
  /** Put back exactly where it already was. */
  samePlace: boolean;
}

export interface StashInput {
  names: string[];
  place: string;
  photo?: Blob;
  lent?: boolean;
  found?: boolean;
  demo?: boolean;
  at?: number;
}

/** Same item even if you call it something else ("specs" vs "glasses"). */
async function findExisting(key: string): Promise<Item | undefined> {
  const exact = await db.items.where('key').equals(key).first();
  if (exact) return exact;
  const target = canonical(key);
  return (await db.items.toArray()).find((item) => canonical(item.key) === target);
}

/** Remembers where one or more things are. Known items are moved, not duplicated. */
export async function stash(
  input: StashInput,
): Promise<{ outcomes: StashOutcome[]; undo: UndoToken }> {
  const at = input.at ?? Date.now();
  const place = cleanPhrase(input.place);
  if (!place) throw new Error('Stashing needs a place.');
  const pKey = placeKey(place);

  return db.transaction('rw', [db.items, db.events, db.photos], async () => {
    const undo = emptyUndo();
    let photoId: string | undefined;
    if (input.photo) {
      photoId = newId();
      await db.photos.add({ id: photoId, blob: input.photo, createdAt: at });
      undo.addedPhotoIds.push(photoId);
    }

    const outcomes: StashOutcome[] = [];
    const seen = new Set<string>();
    for (const raw of input.names) {
      const typedName = displayName(raw);
      const key = itemKey(typedName);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const existing = await findExisting(key);
      let item: Item;
      if (existing) {
        undo.previousItems.push(existing);
        const samePlace =
          existing.placeKey === pKey && existing.place.toLowerCase() === place.toLowerCase();
        // Keep the original name when a synonym was used ("specs" for "Glasses").
        const name = existing.key === key ? typedName : existing.name;
        item = {
          ...existing,
          name,
          emoji: emojiFor(name),
          place,
          placeKey: pKey,
          photoId: photoId ?? (samePlace ? existing.photoId : undefined),
          lent: input.lent || undefined,
          missing: undefined,
          updatedAt: at,
          checkedAt: at,
          foundCount: existing.foundCount + (input.found ? 1 : 0),
        };
        outcomes.push({ item, previous: existing, created: false, samePlace });
      } else {
        item = {
          id: newId(),
          name: typedName,
          key,
          emoji: emojiFor(typedName),
          place,
          placeKey: pKey,
          photoId,
          lent: input.lent || undefined,
          demo: input.demo || undefined,
          createdAt: at,
          updatedAt: at,
          checkedAt: at,
          searchCount: 0,
          foundCount: input.found ? 1 : 0,
          notThereCount: 0,
        };
        undo.createdItemIds.push(item.id);
        outcomes.push({ item, created: true, samePlace: false });
      }

      await db.items.put(item);
      undo.addedEventIds.push(
        (await db.events.add({
          itemId: item.id,
          type: 'stash',
          at,
          place,
          placeKey: pKey,
          photoId,
        })) as number,
      );
      if (input.found) {
        undo.addedEventIds.push(
          (await db.events.add({ itemId: item.id, type: 'found', at })) as number,
        );
      }
    }
    return { outcomes, undo };
  });
}

/** Reverts whatever produced the token. */
export async function undo(token: UndoToken): Promise<void> {
  await db.transaction('rw', [db.items, db.events, db.photos], async () => {
    if (token.addedEventIds.length) await db.events.bulkDelete(token.addedEventIds);
    if (token.createdItemIds.length) await db.items.bulkDelete(token.createdItemIds);
    if (token.previousItems.length) await db.items.bulkPut(token.previousItems);
    if (token.addedPhotoIds.length) await db.photos.bulkDelete(token.addedPhotoIds);
    if (token.removedEvents.length) await db.events.bulkPut(token.removedEvents);
    if (token.removedPhotos.length) await db.photos.bulkPut(token.removedPhotos);
  });
}

async function updateItem(
  itemId: string,
  type: StuffEvent['type'],
  change: (item: Item) => Partial<Item>,
  at = Date.now(),
): Promise<Item | undefined> {
  return db.transaction('rw', [db.items, db.events], async () => {
    const item = await db.items.get(itemId);
    if (!item) return undefined;
    const updated: Item = { ...item, ...change(item) };
    await db.items.put(updated);
    await db.events.add({ itemId, type, at });
    return updated;
  });
}

/** "Where's my …?" was asked about this item. */
export const recordSearch = (itemId: string, at = Date.now()) =>
  updateItem(itemId, 'search', (item) => ({ searchCount: item.searchCount + 1 }), at);

/** "Got it!" */
export const markFound = (itemId: string, at = Date.now()) =>
  updateItem(
    itemId,
    'found',
    (item) => ({ foundCount: item.foundCount + 1, missing: undefined, checkedAt: at }),
    at,
  );

/** "It's not there." The item stays where it was last seen, but is flagged missing. */
export const markNotThere = (itemId: string, at = Date.now()) =>
  updateItem(
    itemId,
    'notThere',
    (item) => ({ notThereCount: item.notThereCount + 1, missing: true }),
    at,
  );

/** "Still there" from the Ghosted list. */
export const confirmStillThere = (itemId: string, at = Date.now()) =>
  updateItem(itemId, 'stillThere', () => ({ checkedAt: at, missing: undefined }), at);

export async function renameItem(
  itemId: string,
  newName: string,
): Promise<'ok' | 'exists' | 'empty'> {
  const name = displayName(newName);
  const key = itemKey(name);
  if (!key) return 'empty';
  return db.transaction('rw', db.items, async () => {
    const clash = await db.items.where('key').equals(key).first();
    if (clash && clash.id !== itemId) return 'exists';
    await db.items.update(itemId, { name, key, emoji: emojiFor(name) });
    return 'ok';
  });
}

/** Removes an item with its history. Photos shared with other items survive. */
export async function deleteItems(itemIds: string[]): Promise<UndoToken> {
  return db.transaction('rw', [db.items, db.events, db.photos], async () => {
    const token = emptyUndo();
    const ids = new Set(itemIds);
    const items = (await db.items.bulkGet(itemIds)).filter((i): i is Item => Boolean(i));
    const events = await db.events.where('itemId').anyOf(itemIds).toArray();

    const candidatePhotos = new Set<string>();
    for (const item of items) if (item.photoId) candidatePhotos.add(item.photoId);
    for (const event of events) if (event.photoId) candidatePhotos.add(event.photoId);

    const stillUsed = new Set<string>();
    if (candidatePhotos.size) {
      const others = await db.items.filter((i) => !ids.has(i.id)).toArray();
      for (const item of others) if (item.photoId) stillUsed.add(item.photoId);
      const otherEvents = await db.events
        .filter((e) => !ids.has(e.itemId) && Boolean(e.photoId))
        .toArray();
      for (const event of otherEvents) if (event.photoId) stillUsed.add(event.photoId);
    }
    const photoIds = [...candidatePhotos].filter((id) => !stillUsed.has(id));
    const photos = (await db.photos.bulkGet(photoIds)).filter((p): p is Photo => Boolean(p));

    token.previousItems = items;
    token.removedEvents = events;
    token.removedPhotos = photos;

    await db.events.bulkDelete(events.map((e) => e.id as number));
    await db.items.bulkDelete(itemIds);
    await db.photos.bulkDelete(photoIds);
    return token;
  });
}

export const deleteItem = (itemId: string) => deleteItems([itemId]);

export async function clearDemo(): Promise<number> {
  const ids = (await db.items.filter((item) => Boolean(item.demo)).toArray()).map((i) => i.id);
  if (ids.length) await deleteItems(ids);
  return ids.length;
}

export async function wipeEverything(): Promise<void> {
  await db.transaction('rw', [db.items, db.events, db.photos], async () => {
    await Promise.all([db.items.clear(), db.events.clear(), db.photos.clear()]);
  });
}

export function itemEvents(itemId: string): Promise<StuffEvent[]> {
  return db.events.where('itemId').equals(itemId).sortBy('at');
}

export interface Spot {
  placeKey: string;
  /** The most recent wording used for this spot. */
  place: string;
  count: number;
  lastAt: number;
}

/** Where an item tends to end up, most common first. */
export function summarizeSpots(events: readonly StuffEvent[]): Spot[] {
  const spots = new Map<string, Spot>();
  for (const event of events) {
    if (event.type !== 'stash' || !event.placeKey) continue;
    const spot = spots.get(event.placeKey);
    if (!spot) {
      spots.set(event.placeKey, {
        placeKey: event.placeKey,
        place: event.place ?? event.placeKey,
        count: 1,
        lastAt: event.at,
      });
    } else {
      spot.count += 1;
      if (event.at >= spot.lastAt) {
        spot.lastAt = event.at;
        spot.place = event.place ?? spot.place;
      }
    }
  }
  return [...spots.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
