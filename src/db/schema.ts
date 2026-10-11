/**
 * Local database (IndexedDB via Dexie). Nothing ever leaves the device.
 */
import Dexie, { type EntityTable } from 'dexie';

export interface Item {
  id: string;
  /** What the user called it, e.g. "Passport". */
  name: string;
  /** Normalized identity, e.g. "passport". See `itemKey`. */
  key: string;
  emoji: string;
  /** Where it is, as typed: "in the black bag, top shelf". */
  place: string;
  /** The container it lives in, for grouping: "black bag". See `placeKey`. */
  placeKey: string;
  photoId?: string;
  /** Someone borrowed it ("with Rafi"). */
  lent?: boolean;
  /** The last search ended with "it's not there". */
  missing?: boolean;
  /** Created by "Load demo stuff". */
  demo?: boolean;
  createdAt: number;
  /** When it was last stashed (moved or re-confirmed by stashing). */
  updatedAt: number;
  /** When someone last confirmed where it is (stash, found, still there). */
  checkedAt: number;
  searchCount: number;
  foundCount: number;
  notThereCount: number;
}

export type EventType = 'stash' | 'search' | 'found' | 'notThere' | 'stillThere';

export interface StuffEvent {
  id?: number;
  itemId: string;
  type: EventType;
  at: number;
  /** Only on stash events: where it was put. */
  place?: string;
  placeKey?: string;
  photoId?: string;
}

export interface Photo {
  id: string;
  blob: Blob;
  createdAt: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export class StuffDB extends Dexie {
  items!: EntityTable<Item, 'id'>;
  events!: EntityTable<StuffEvent, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name = 'dude-wheres-my-stuff') {
    super(name);
    this.version(1).stores({
      items: 'id, key, placeKey, updatedAt, checkedAt',
      events: '++id, itemId, type, at',
      photos: 'id',
      meta: 'key',
    });
  }
}

export const db = new StuffDB();

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
