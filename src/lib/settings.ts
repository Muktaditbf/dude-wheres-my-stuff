/**
 * Per-device preferences. They live in localStorage (not the database) so the
 * theme is known before the first paint. Everything degrades to defaults if
 * storage is blocked.
 */
import { useSyncExternalStore } from 'react';

export type RoastLevel = 'chill' | 'bro' | 'unhinged';
export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Settings {
  roast: RoastLevel;
  sounds: boolean;
  drama: boolean;
  theme: ThemeChoice;
  ghostDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  roast: 'bro',
  sounds: true,
  drama: true,
  theme: 'system',
  ghostDays: 60,
};

export const GHOST_DAY_OPTIONS = [30, 60, 90, 180] as const;

const STORAGE_KEY = 'dwms:settings';
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Settings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<
    Record<keyof Settings, unknown>
  >;
  return {
    roast: ['chill', 'bro', 'unhinged'].includes(value.roast as string)
      ? (value.roast as RoastLevel)
      : DEFAULT_SETTINGS.roast,
    sounds: typeof value.sounds === 'boolean' ? value.sounds : DEFAULT_SETTINGS.sounds,
    drama: typeof value.drama === 'boolean' ? value.drama : DEFAULT_SETTINGS.drama,
    theme: ['system', 'light', 'dark'].includes(value.theme as string)
      ? (value.theme as ThemeChoice)
      : DEFAULT_SETTINGS.theme,
    ghostDays:
      typeof value.ghostDays === 'number' && value.ghostDays >= 1
        ? value.ghostDays
        : DEFAULT_SETTINGS.ghostDays,
  };
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current = load();

export const getSettings = () => current;

export function updateSettings(patch: Partial<Settings>): void {
  current = sanitize({ ...current, ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode or blocked storage: keep the setting for this session only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

/** Applies the theme to <html>. "system" follows the OS. */
export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}
