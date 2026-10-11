/** React hooks for routing, live data and small browser features. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { db, type Item, type StuffEvent } from '../db/schema';

export type Route = 'home' | 'stuff' | 'shame' | 'report' | 'settings' | 'notFound';
export const ROUTES: Route[] = ['home', 'stuff', 'shame', 'report', 'settings'];

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split(/[?/]/)[0] ?? '';
  if (path === '') return 'home';
  return (ROUTES as string[]).includes(path) ? (path as Route) : 'notFound';
}

export const hrefFor = (route: Route) => (route === 'home' ? '#/' : `#/${route}`);

export function navigate(route: Route) {
  window.location.hash = hrefFor(route).slice(1);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** All items, live. `undefined` while the database is still opening. */
export function useItems(): Item[] | undefined {
  return useLiveQuery(() => db.items.toArray(), []);
}

export function useItem(id: string | null | undefined): Item | undefined {
  return useLiveQuery(() => (id ? db.items.get(id) : undefined), [id]);
}

export function useItemEvents(id: string | null | undefined): StuffEvent[] | undefined {
  return useLiveQuery(
    async (): Promise<StuffEvent[]> =>
      id ? db.events.where('itemId').equals(id).sortBy('at') : [],
    [id],
  );
}

export function useAllEvents(): StuffEvent[] | undefined {
  return useLiveQuery(() => db.events.toArray(), []);
}

/** An object URL for a stored photo, revoked automatically. */
export function usePhotoUrl(photoId: string | undefined): string | undefined {
  const photo = useLiveQuery(() => (photoId ? db.photos.get(photoId) : undefined), [photoId]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!photo) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(photo.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return url;
}

/** Same as above for a not-yet-saved Blob. */
export function useBlobUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

/* Item sheet: a tiny global store, wired to the back button so "back" closes it. */
let openItemId: string | null = null;
const sheetListeners = new Set<() => void>();
const emitSheet = () => {
  for (const listener of sheetListeners) listener();
};

export function openItem(id: string) {
  const wasOpen = openItemId !== null;
  openItemId = id;
  emitSheet();
  if (!wasOpen) window.history.pushState({ dwmsSheet: true }, '');
}

export function closeItem() {
  if (openItemId === null) return;
  openItemId = null;
  emitSheet();
  if (window.history.state?.dwmsSheet) window.history.back();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (openItemId !== null) {
      openItemId = null;
      emitSheet();
    }
  });
}

export function useOpenItemId(): string | null {
  return useSyncExternalStore(
    (listener) => {
      sheetListeners.add(listener);
      return () => {
        sheetListeners.delete(listener);
      };
    },
    () => openItemId,
    () => null,
  );
}

/** Keyboard shortcut: "/" or Ctrl/Cmd+K focuses the main input. */
export function useFocusShortcut(focus: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      if (
        (event.key === 'k' && (event.ctrlKey || event.metaKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);
}

/** Respects the OS "reduce motion" setting. */
export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
