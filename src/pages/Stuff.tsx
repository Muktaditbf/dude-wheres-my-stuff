import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ItemRow } from '../components/ItemRow';
import { Lefty } from '../components/Lefty';
import { PageHeader, Segmented } from '../components/ui';
import type { Item } from '../db/schema';
import { hrefFor, useItems } from '../lib/hooks';
import { capitalize, words } from '../lib/normalize';
import { useSettings } from '../lib/settings';

type View = 'recent' | 'place' | 'missing';

function matches(item: Item, query: string) {
  const needles = words(query);
  const haystack = `${item.name} ${item.place}`.toLowerCase();
  return needles.every((n) => haystack.includes(n));
}

export function Stuff() {
  const items = useItems();
  const settings = useSettings();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('recent');

  const visible = useMemo(() => {
    const list = (items ?? []).filter((item) => matches(item, query));
    if (view === 'missing') return list.filter((i) => i.missing || i.lent);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, query, view]);

  const groups = useMemo(() => {
    const byPlace = new Map<string, Item[]>();
    for (const item of visible) {
      const key = item.placeKey || item.place;
      byPlace.set(key, [...(byPlace.get(key) ?? []), item]);
    }
    return [...byPlace.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );
  }, [visible]);

  if (items === undefined) return null;
  const count = items.length;

  return (
    <>
      <PageHeader
        title="My"
        highlight="Stuff"
        tone="cyan"
        subtitle={
          count
            ? `${count} thing${count === 1 ? '' : 's'} I'm keeping an eye on. 👀`
            : 'Nothing yet. Suspiciously organized.'
        }
      />

      {count === 0 ? (
        <div className="sticker flex flex-col items-center gap-4 bg-surface p-8 text-center">
          <Lefty mood="sad" size={90} />
          <p className="font-marker text-xl">No stuff. No chaos. No fun.</p>
          <a
            href={hrefFor('home')}
            className="sticker-sm press inline-flex min-h-11 items-center bg-yellow px-4 font-extrabold text-on-accent"
          >
            Stash your first thing
          </a>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="sticker-sm flex min-w-0 flex-1 items-center gap-2 bg-surface px-3 focus-within:outline-dashed">
              <Search size={18} strokeWidth={2.75} aria-hidden="true" />
              <span className="sr-only">Filter your stuff</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by name or place…"
                className="min-w-0 flex-1 bg-transparent py-2.5 font-semibold focus:outline-none"
              />
            </label>
            <Segmented
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'recent', label: 'Recent' },
                { value: 'place', label: 'By place' },
                { value: 'missing', label: 'Missing & lent' },
              ]}
            />
          </div>

          {visible.length === 0 && (
            <p className="mt-8 text-center font-marker text-xl text-muted">
              {view === 'missing'
                ? 'Nothing missing or lent out. Look at you. 😎'
                : 'Nothing matches that. 🤷'}
            </p>
          )}

          {view === 'place' ? (
            <div className="mt-6 grid gap-8">
              {groups.map(([place, list]) => (
                <section key={place} aria-label={place}>
                  <h2 className="sticker-sm inline-block -rotate-1 bg-purple px-3 py-1 text-lg font-extrabold text-on-accent">
                    📍 {capitalize(place)} <span className="opacity-70">· {list.length}</span>
                  </h2>
                  <div className="mt-3 grid gap-2.5">
                    {list.map((item) => (
                      <ItemRow key={item.id} item={item} ghostDays={settings.ghostDays} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-2.5">
              {visible.map((item) => (
                <ItemRow key={item.id} item={item} ghostDays={settings.ghostDays} tilt />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
