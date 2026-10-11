/**
 * Auto-backup: keeps ONE file on the user's computer up to date with every
 * change, so their stuff survives "clear browsing data". Uses the File System
 * Access API (Chrome and Edge on desktop). The file handle is remembered in
 * IndexedDB; after a restart the browser asks once to allow writing again.
 */
import { liveQuery } from 'dexie';
import { useSyncExternalStore } from 'react';
import { getMeta, setMeta } from '../db/actions';
import { db } from '../db/schema';

type Handle = FileSystemFileHandle & {
  queryPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>;
};

export type BackupStatus = 'unsupported' | 'off' | 'on' | 'paused' | 'error';

interface State {
  status: BackupStatus;
  fileName?: string;
  savedAt?: number;
}

const HANDLE_KEY = 'autoBackupHandle';
let state: State = { status: 'off' };
let handle: Handle | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export const isSupported = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window;

async function write() {
  if (!handle) return;
  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      set({ status: 'paused' });
      return;
    }
    const { createBackup } = await import('./backup');
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(await createBackup(), null, 2));
    await writable.close();
    set({ status: 'on', savedAt: Date.now() });
  } catch (error) {
    console.error(error);
    set({ status: 'error' });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let watching = false;

/** Writes the file a moment after every change (changes are batched). */
function watch() {
  if (watching) return;
  watching = true;
  let first = true;
  liveQuery(() =>
    Promise.all([db.items.toArray(), db.events.count(), db.photos.count()]),
  ).subscribe(() => {
    if (first) {
      first = false;
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => void write(), 1200);
  });
}

/** Called once at startup: picks up a file chosen in an earlier session. */
export async function initAutoBackup() {
  if (!isSupported()) {
    set({ status: 'unsupported' });
    return;
  }
  handle = (await getMeta<Handle>(HANDLE_KEY)) ?? null;
  if (!handle) return;
  set({ fileName: handle.name });
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  set({ status: permission === 'granted' ? 'on' : 'paused' });
  watch();
}

/** Asks where to save, then writes immediately. Must run from a click. */
export async function turnOn() {
  const picker = (window as unknown as { showSaveFilePicker: (o: unknown) => Promise<Handle> })
    .showSaveFilePicker;
  try {
    handle = await picker({
      suggestedName: 'dude-wheres-my-stuff-autobackup.json',
      types: [{ description: 'Backup', accept: { 'application/json': ['.json'] } }],
    });
  } catch {
    return false; // Picker cancelled.
  }
  try {
    await setMeta(HANDLE_KEY, handle);
  } catch {
    // Can't remember the file across restarts here; it still works for this session.
  }
  set({ fileName: handle.name });
  watch();
  await write();
  return true;
}

/** After a browser restart, writing needs one click of permission. */
export async function resume() {
  if (!handle) return;
  if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') await write();
}

export async function turnOff() {
  handle = null;
  clearTimeout(timer);
  await db.meta.delete(HANDLE_KEY);
  set({ status: 'off', fileName: undefined, savedAt: undefined });
}

export function useAutoBackup(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
    () => state,
  );
}
