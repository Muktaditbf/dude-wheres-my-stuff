/** Everything about one item: where it is, where it's been, and buttons to fix it. */
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  confirmStillThere,
  deleteItem,
  markFound,
  markNotThere,
  renameItem,
  stash,
  summarizeSpots,
  undo,
} from '../db/actions';
import { db, type StuffEvent } from '../db/schema';
import { closeItem, useItemEvents, useItems, useOpenItemId, usePhotoUrl } from '../lib/hooks';
import { itemVars, placePhrase, say, spotName } from '../lib/personality';
import { compressImage } from '../lib/photo';
import { useSettings } from '../lib/settings';
import { playAirHorn, playSadTrombone, vibrate } from '../lib/sound';
import { ago } from '../lib/time';
import { ItemBadges } from './ItemRow';
import { PlaceInput } from './PlaceInput';
import { useToast } from './Toasts';
import { Button, cn } from './ui';

const EVENT_LABEL: Record<StuffEvent['type'], string> = {
  stash: '📦 Stashed',
  search: '🔍 You asked where it was',
  found: '✅ Found it',
  notThere: '💀 It was not there',
  stillThere: '👍 Confirmed still there',
};

export function ItemSheet() {
  const id = useOpenItemId();
  // Tag the result with the id it belongs to: right after the id changes, the
  // hook can still hold the previous answer, which must not count as "deleted".
  const result = useLiveQuery(async () => (id ? { id, item: await db.items.get(id) } : null), [id]);
  const current = result && result.id === id ? result : undefined;
  const ready = current?.item ?? null;
  const gone = Boolean(current && !current.item);
  const events = useItemEvents(id);
  const allItems = useItems();
  const photoUrl = usePhotoUrl(ready?.photoId);
  const settings = useSettings();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<'name' | 'place' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');

  const knownPlaces = useMemo(() => [...new Set((allItems ?? []).map((i) => i.place))], [allItems]);
  const spots = useMemo(() => summarizeSpots(events ?? []), [events]);
  const timeline = useMemo(() => [...(events ?? [])].reverse(), [events]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (id && !d.open) d.showModal();
    if (!id && d.open) d.close();
    setEditing(null);
    setConfirmDelete(false);
  }, [id]);

  // The item was deleted (or never existed): close the sheet.
  useEffect(() => {
    if (gone) closeItem();
  }, [gone]);

  const level = settings.roast;
  const say2 = (message: string, tone: 'plain' | 'lime' | 'pink' = 'plain') =>
    toast({ message, tone });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: clicking the backdrop closes; Esc is handled natively by <dialog>
    <dialog
      ref={dialog}
      aria-labelledby="sheet-title"
      onClose={() => closeItem()}
      onClick={(event) => {
        if (event.target === dialog.current) closeItem();
      }}
      className="sticker m-auto max-h-[88dvh] w-[min(100%-1.5rem,38rem)] overflow-y-auto bg-surface p-0 text-ink"
    >
      {ready && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="grid size-16 shrink-0 place-items-center rounded-2xl border-[3px] border-line bg-yellow text-4xl"
            >
              {ready.emoji}
            </span>
            <div className="min-w-0 flex-1">
              {editing === 'name' ? (
                <form
                  className="flex gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const outcome = await renameItem(ready.id, name);
                    if (outcome === 'exists')
                      say2('You already have something with that name. 🤨', 'pink');
                    else if (outcome === 'ok') setEditing(null);
                  }}
                >
                  <label htmlFor="rename" className="sr-only">
                    New name
                  </label>
                  <input
                    id="rename"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoFocus
                    className="sticker-sm min-w-0 flex-1 bg-surface px-3 py-2 text-lg font-extrabold"
                  />
                  <Button type="submit" tone="lime" size="sm">
                    Save
                  </Button>
                </form>
              ) : (
                <h2
                  id="sheet-title"
                  className="text-3xl leading-tight font-extrabold break-words uppercase"
                >
                  {ready.name}
                </h2>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <ItemBadges item={ready} ghostDays={settings.ghostDays} />
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => closeItem()}
              className="sticker-sm press grid size-10 shrink-0 place-items-center bg-surface"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>

          <section className="sticker-sm mt-5 bg-surface-2 p-4">
            <p className="text-xs font-extrabold text-muted uppercase">Currently</p>
            <p className="font-marker text-2xl leading-snug [overflow-wrap:anywhere]">
              {ready.place}
            </p>
            <p className="mt-1 text-sm font-bold text-muted">
              Since {ago(ready.updatedAt)} · last confirmed {ago(ready.checkedAt)}
            </p>
          </section>

          {photoUrl && (
            <img
              src={photoUrl}
              alt={`Evidence showing where the ${ready.name} is`}
              className="sticker-sm mt-4 max-h-72 w-full object-cover"
            />
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              tone="lime"
              onClick={async () => {
                const updated = await markFound(ready.id);
                if (settings.sounds) playAirHorn();
                vibrate([30, 40, 60]);
                say2(say('found', level, itemVars(updated ?? ready)), 'lime');
              }}
            >
              Got it ✅
            </Button>
            <Button
              tone="pink"
              onClick={async () => {
                await markNotThere(ready.id);
                if (settings.sounds) playSadTrombone();
                vibrate(250);
                say2(say('notThere', level, itemVars(ready)), 'pink');
              }}
            >
              Not there 💀
            </Button>
            <Button
              tone="cyan"
              onClick={async () => {
                await confirmStillThere(ready.id);
                say2(say('stillThere', level, itemVars(ready)));
              }}
            >
              Still there 👍
            </Button>
            <Button
              onClick={() => setEditing(editing === 'place' ? null : 'place')}
              icon={<Pencil size={16} strokeWidth={2.75} aria-hidden="true" />}
            >
              I moved it
            </Button>
          </div>

          {editing === 'place' && (
            <PlaceInput
              label={`Where's the ${ready.name} now?`}
              knownPlaces={knownPlaces}
              autoFocus
              onSubmit={async (place) => {
                const { outcomes } = await stash({ names: [ready.name], place });
                const first = outcomes[0];
                setEditing(null);
                if (first) {
                  say2(
                    say(first.samePlace ? 'stashSame' : 'stashMoved', level, {
                      item: first.item.name,
                      place: placePhrase(first.item.place),
                      prev: placePhrase(ready.place),
                      prevSpot: spotName(ready.place),
                    }),
                    'lime',
                  );
                }
              }}
            />
          )}

          <label className="sticker-sm press mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-surface px-4 font-extrabold focus-within:outline-dashed">
            <Camera size={18} strokeWidth={2.75} aria-hidden="true" />
            {ready.photoId ? 'Replace evidence photo' : 'Add evidence photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                try {
                  await stash({
                    names: [ready.name],
                    place: ready.place,
                    photo: await compressImage(file),
                  });
                  say2('Evidence photo saved. 📸', 'lime');
                } catch (error) {
                  say2(
                    error instanceof Error ? error.message : 'Could not save that photo.',
                    'pink',
                  );
                }
              }}
            />
          </label>

          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ['Asked', ready.searchCount],
              ['Found', ready.foundCount],
              ['Not there', ready.notThereCount],
            ].map(([label, value]) => (
              <div key={label} className="sticker-sm bg-surface-2 p-2">
                <dt className="text-xs font-extrabold text-muted uppercase">{label}</dt>
                <dd className="text-2xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>

          {spots.length > 1 && (
            <section className="mt-6">
              <h3 className="text-lg font-extrabold uppercase">Usual spots</h3>
              <ul className="mt-2 grid gap-1.5">
                {spots.slice(0, 5).map((spot) => (
                  <li key={spot.placeKey} className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-marker text-lg">{spot.place}</span>
                    <span className="shrink-0 text-sm font-extrabold text-muted">
                      {spot.count}×
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <h3 className="text-lg font-extrabold uppercase">History</h3>
            <ol className="mt-2 grid gap-2 border-l-[3px] border-dashed border-line/40 pl-4">
              {timeline.slice(0, 30).map((event) => (
                <li key={event.id} className="text-sm">
                  <span className="font-bold">{EVENT_LABEL[event.type]}</span>
                  {event.type === 'stash' && event.place && (
                    <span className="font-marker text-base"> {event.place}</span>
                  )}
                  <span className="block text-xs font-semibold text-muted">{ago(event.at)}</span>
                </li>
              ))}
            </ol>
            {timeline.length > 30 && (
              <p className="mt-2 text-sm font-semibold text-muted">
                …and {timeline.length - 30} older events.
              </p>
            )}
          </section>

          <div className="mt-8 flex flex-wrap gap-2 border-t-2 border-dashed border-line/30 pt-5">
            <Button
              size="sm"
              icon={<Pencil size={14} strokeWidth={2.75} aria-hidden="true" />}
              onClick={() => {
                setName(ready.name);
                setEditing(editing === 'name' ? null : 'name');
              }}
            >
              Rename
            </Button>
            {confirmDelete ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold">Delete forever?</span>
                <Button
                  size="sm"
                  tone="danger"
                  onClick={async () => {
                    const token = await deleteItem(ready.id);
                    toast({
                      message: say('deleted', level, { item: ready.name }),
                      action: { label: 'Undo', onClick: () => void undo(token) },
                    });
                    closeItem();
                  }}
                >
                  Yes, delete
                </Button>
                <Button size="sm" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </span>
            ) : (
              <Button
                size="sm"
                className={cn('ml-auto')}
                icon={<Trash2 size={14} strokeWidth={2.75} aria-hidden="true" />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
