/**
 * Backups. Your stuff lives only in this browser, so a JSON file is the
 * lifeboat: move to a new phone, clear your browser, sleep at night.
 */
import { z } from 'zod';
import { db, type Item, type StuffEvent } from '../db/schema';

export const BACKUP_APP = 'dude-wheres-my-stuff';

const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  key: z.string().min(1),
  emoji: z.string(),
  place: z.string().min(1),
  placeKey: z.string(),
  photoId: z.string().optional(),
  lent: z.boolean().optional(),
  missing: z.boolean().optional(),
  demo: z.boolean().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  checkedAt: z.number(),
  searchCount: z.number().int().nonnegative(),
  foundCount: z.number().int().nonnegative(),
  notThereCount: z.number().int().nonnegative(),
});

const EventSchema = z.object({
  id: z.number().optional(),
  itemId: z.string().min(1),
  type: z.enum(['stash', 'search', 'found', 'notThere', 'stillThere']),
  at: z.number(),
  place: z.string().optional(),
  placeKey: z.string().optional(),
  photoId: z.string().optional(),
});

const PhotoSchema = z.object({
  id: z.string().min(1),
  dataUrl: z.string().regex(/^data:image\/[a-z+.-]+;base64,/),
  createdAt: z.number(),
});

export const BackupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(1),
  exportedAt: z.number(),
  items: z.array(ItemSchema),
  events: z.array(EventSchema),
  photos: z.array(PhotoSchema),
});

export type Backup = z.infer<typeof BackupSchema>;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const [header, base64 = ''] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(header ?? '')?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

export async function createBackup(now = Date.now()): Promise<Backup> {
  const [items, events, photos] = await Promise.all([
    db.items.toArray(),
    db.events.toArray(),
    db.photos.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    version: 1,
    exportedAt: now,
    items,
    events: events.map(({ id: _id, ...rest }) => rest),
    photos: await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        dataUrl: await blobToDataUrl(p.blob),
        createdAt: p.createdAt,
      })),
    ),
  };
}

export function backupFilename(now = new Date()): string {
  return `dude-wheres-my-stuff-backup-${now.toISOString().slice(0, 10)}.json`;
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError("That file isn't a backup. It isn't even JSON.");
  }
  const result = BackupSchema.safeParse(json);
  if (!result.success) {
    throw new BackupError("That file doesn't look like a Dude, Where's My Stuff? backup.");
  }
  return result.data;
}

/**
 * Merges a backup into the current data. Items with the same id are replaced
 * together with their history, so importing the same file twice is harmless.
 */
export async function restoreBackup(backup: Backup): Promise<number> {
  const photos = await Promise.all(
    backup.photos.map(async (p) => ({
      id: p.id,
      blob: await dataUrlToBlob(p.dataUrl),
      createdAt: p.createdAt,
    })),
  );
  const itemIds = backup.items.map((i) => i.id);
  await db.transaction('rw', [db.items, db.events, db.photos], async () => {
    await db.events.where('itemId').anyOf(itemIds).delete();
    await db.items.bulkPut(backup.items as Item[]);
    await db.events.bulkAdd(backup.events.map(({ id: _id, ...rest }) => rest as StuffEvent));
    await db.photos.bulkPut(photos);
  });
  return backup.items.length;
}

/** Triggers a file download in the browser. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
