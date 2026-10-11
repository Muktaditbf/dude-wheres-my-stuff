/** The cards that appear under the input after you hit Enter. */
import { Check, History, PackagePlus, Pencil, Undo2 } from 'lucide-react';
import { m } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  markFound,
  markNotThere,
  type StashOutcome,
  stash,
  summarizeSpots,
  type UndoToken,
} from '../db/actions';
import type { Item } from '../db/schema';
import {
  openItem,
  useItem,
  useItemEvents,
  usePhotoUrl,
  usePrefersReducedMotion,
} from '../lib/hooks';
import { itemVars, placePhrase, say } from '../lib/personality';
import { EXAMPLES } from '../lib/roasts';
import { useSettings } from '../lib/settings';
import { playAirHorn, playSadTrombone, vibrate } from '../lib/sound';
import { ago } from '../lib/time';
import { EmojiBurst, PlotTwist, SecuredSticker } from './Celebrate';
import { ItemRow } from './ItemRow';
import { Lefty, type Mood } from './Lefty';
import { PlaceInput } from './PlaceInput';
import { Button, Chip, cn, Tape } from './ui';

export type AnswerPhase = 'ask' | 'secured' | 'notThere';

export type Result =
  | {
      type: 'stashed';
      outcomes: StashOutcome[];
      undo: UndoToken;
      line: string;
      photo: boolean;
      undone?: boolean;
    }
  | {
      type: 'answer';
      itemId: string;
      line: string;
      phase: AnswerPhase;
      alternatives: string[];
      burst: number;
    }
  | { type: 'unknown'; query: string; line: string; alternatives: string[]; inPlace: string[] }
  | { type: 'whatsIn'; place: string; itemIds: string[]; line: string }
  | { type: 'help'; line: string; text: string };

const cardMotion = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 320, damping: 24 },
};

function LeftyQuote({ line, mood }: { line: string; mood: Mood }) {
  if (!line) return null;
  return (
    <figure className="mt-4 flex items-start gap-2">
      <Lefty size={36} mood={mood} idle={false} title="" className="mt-1 shrink-0" />
      <blockquote className="sticker-sm bg-surface-2 px-3 py-2 font-marker text-lg leading-snug">
        {line}
      </blockquote>
    </figure>
  );
}

function EmojiTile({ emoji, big }: { emoji: string; big?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl border-[3px] border-line bg-yellow',
        big ? 'size-16 text-4xl sm:size-20 sm:text-5xl' : 'size-12 text-2xl',
      )}
    >
      {emoji}
    </span>
  );
}

function DidYouMean({ names, onFind }: { names: string[]; onFind: (name: string) => void }) {
  if (names.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-extrabold text-muted">Not it? Did you mean:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {names.map((name) => (
          <Chip key={name} tone="cyan" onClick={() => onFind(name)}>
            🔍 {name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

interface AnswerCardProps {
  result: Extract<Result, { type: 'answer' }>;
  knownPlaces: string[];
  onUpdate: (patch: Partial<Extract<Result, { type: 'answer' }>>) => void;
  onFind: (name: string) => void;
  onMoved: (outcomes: StashOutcome[], undo: UndoToken) => void;
}

export function AnswerCard({ result, knownPlaces, onUpdate, onFind, onMoved }: AnswerCardProps) {
  const item = useItem(result.itemId);
  const events = useItemEvents(result.itemId);
  const photoUrl = usePhotoUrl(item?.photoId);
  const settings = useSettings();
  const reduced = usePrefersReducedMotion();
  const drama = settings.drama && !reduced;
  const [shaking, setShaking] = useState(false);
  const [twist, setTwist] = useState(false);
  const [moving, setMoving] = useState(false);
  const spots = useMemo(() => summarizeSpots(events ?? []), [events]);

  if (!item) return null;
  const level = settings.roast;
  const otherSpots = spots.filter((spot) => spot.placeKey !== item.placeKey);
  const totalStashes = spots.reduce((sum, s) => sum + s.count, 0);
  const usual = spots[0];

  const celebrate = (updated: Item, situation: 'found' | 'stashFound') => {
    onUpdate({
      phase: 'secured',
      line: say(situation, level, itemVars(updated)),
      burst: Date.now(),
    });
    if (settings.sounds) playAirHorn();
    vibrate([30, 40, 30, 40, 90]);
  };

  const gotIt = async () => {
    celebrate((await markFound(item.id)) ?? item, 'found');
  };

  const notThere = async () => {
    await markNotThere(item.id);
    onUpdate({ phase: 'notThere', line: say('notThere', level, itemVars(item)) });
    if (settings.sounds) playSadTrombone();
    vibrate(250);
    if (drama) {
      setTwist(true);
      setTimeout(() => setTwist(false), 1150);
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  const foundAt = async (place: string) => {
    const { outcomes } = await stash({ names: [item.name], place, found: true });
    celebrate(outcomes[0]?.item ?? item, 'stashFound');
  };

  const moveTo = async (place: string) => {
    const { outcomes, undo } = await stash({ names: [item.name], place });
    onMoved(outcomes, undo);
  };

  const phase = result.phase;
  return (
    <>
      <m.article
        {...cardMotion}
        className={cn(
          'sticker relative mt-8 bg-surface p-5 pt-8 sm:p-6 sm:pt-9',
          shaking && 'shake',
        )}
        aria-labelledby="answer-title"
      >
        <Tape tone={phase === 'notThere' ? 'pink' : phase === 'secured' ? 'lime' : 'yellow'}>
          {phase === 'notThere'
            ? 'Missing 🚨'
            : phase === 'secured'
              ? 'Case closed'
              : 'Found it (in my notes)'}
        </Tape>
        {phase === 'secured' && <SecuredSticker />}
        {phase === 'secured' && drama && <EmojiBurst key={result.burst} seed={result.burst} />}

        <div className="flex items-start gap-4">
          <EmojiTile emoji={item.emoji} big />
          <div className="min-w-0 flex-1">
            <h2
              id="answer-title"
              className="text-2xl leading-tight font-extrabold break-words uppercase sm:text-3xl"
            >
              {item.name}
            </h2>
            <p className="mt-1 font-marker text-2xl leading-snug [overflow-wrap:anywhere] sm:text-3xl">
              {item.place}
            </p>
            <p className="mt-2 text-sm font-bold text-muted">
              Saved {ago(item.updatedAt)} · asked {item.searchCount}× · found {item.foundCount}×
            </p>
          </div>
        </div>

        {photoUrl && (
          <img
            src={photoUrl}
            alt={`Evidence showing where the ${item.name} is`}
            className="sticker-sm mt-4 max-h-72 w-full object-cover"
          />
        )}

        <LeftyQuote
          line={result.line}
          mood={phase === 'notThere' ? 'shocked' : phase === 'secured' ? 'party' : 'smug'}
        />

        {phase === 'ask' && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                tone="lime"
                size="lg"
                onClick={gotIt}
                icon={<Check size={20} strokeWidth={3} aria-hidden="true" />}
              >
                Got it!
              </Button>
              <Button tone="pink" size="lg" onClick={notThere}>
                Not there 💀
              </Button>
              <Button
                className="col-span-2 sm:col-span-1"
                onClick={() => setMoving((m) => !m)}
                icon={<Pencil size={16} strokeWidth={2.75} aria-hidden="true" />}
              >
                I moved it
              </Button>
            </div>
            {moving && (
              <PlaceInput
                label={`Where's the ${item.name} now?`}
                knownPlaces={knownPlaces}
                onSubmit={moveTo}
                autoFocus
              />
            )}
            <DidYouMean names={result.alternatives} onFind={onFind} />
          </>
        )}

        {phase === 'notThere' && (
          <section className="mt-6" aria-labelledby="suspects-title">
            <h3 id="suspects-title" className="text-xl font-extrabold">
              Usual suspects 🕵️
            </h3>
            {usual && usual.count > 1 && (
              <p className="mt-1 font-semibold text-muted">
                It usually ends up {placePhrase(usual.place)} ({usual.count} of {totalStashes}{' '}
                times).
              </p>
            )}
            {otherSpots.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {otherSpots.slice(0, 5).map((spot) => (
                  <li
                    key={spot.placeKey}
                    className="sticker-sm flex items-center gap-3 bg-surface-2 p-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-marker text-lg">{spot.place}</span>
                      <span className="text-xs font-bold text-muted">
                        {spot.count}× · last time {ago(spot.lastAt)}
                      </span>
                    </span>
                    <Button tone="lime" size="sm" onClick={() => foundAt(spot.place)}>
                      Found it here!
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 font-semibold text-muted">
                No other known spots. Where did you last use it? Retrace your steps. 🤔
              </p>
            )}
            <PlaceInput
              label="Found it somewhere else?"
              submitLabel="Found it!"
              knownPlaces={knownPlaces}
              onSubmit={foundAt}
            />
          </section>
        )}

        {phase === 'secured' && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => openItem(item.id)}
              icon={<History size={16} strokeWidth={2.75} aria-hidden="true" />}
            >
              History
            </Button>
          </div>
        )}
      </m.article>
      <PlotTwist show={twist} />
    </>
  );
}

export function StashedCard({
  result,
  onUndo,
}: {
  result: Extract<Result, { type: 'stashed' }>;
  onUndo: () => void;
}) {
  const first = result.outcomes[0];
  const found = result.outcomes.some((o) => o.item.foundCount > (o.previous?.foundCount ?? 0));
  return (
    <m.article
      {...cardMotion}
      className="sticker relative mt-8 rotate-[0.4deg] bg-surface p-5 pt-8"
    >
      <Tape tone={result.undone ? 'plain' : 'lime'}>
        {result.undone ? 'Undone' : found ? 'Found & saved ✅' : 'Noted 📝'}
      </Tape>
      <ul className={cn('grid gap-3', result.undone && 'line-through opacity-50')}>
        {result.outcomes.map((o) => (
          <li key={o.item.id} className="flex items-center gap-3">
            <EmojiTile emoji={o.item.emoji} />
            <div className="min-w-0">
              <p className="text-xl leading-tight font-extrabold">{o.item.name}</p>
              <p className="font-marker text-xl leading-snug [overflow-wrap:anywhere]">
                {o.item.place}
              </p>
              {o.previous && !o.samePlace && (
                <p className="text-sm font-semibold text-muted">
                  was: <s>{o.previous.place}</s>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {result.photo && !result.undone && (
        <p className="mt-3 text-sm font-bold">📸 Evidence photo saved.</p>
      )}
      <LeftyQuote line={result.line} mood={result.undone ? 'chill' : 'happy'} />
      {!result.undone && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onUndo} icon={<Undo2 size={16} strokeWidth={2.75} aria-hidden="true" />}>
            Undo
          </Button>
          {first && result.outcomes.length === 1 && (
            <Button
              onClick={() => openItem(first.item.id)}
              icon={<History size={16} strokeWidth={2.75} aria-hidden="true" />}
            >
              Details
            </Button>
          )}
        </div>
      )}
    </m.article>
  );
}

export function UnknownCard({
  result,
  items,
  onFind,
  onPrefill,
}: {
  result: Extract<Result, { type: 'unknown' }>;
  items: Item[];
  onFind: (name: string) => void;
  onPrefill: (text: string) => void;
}) {
  const inPlace = items.filter((i) => result.inPlace.includes(i.id));
  return (
    <m.article
      {...cardMotion}
      className="sticker relative mt-8 -rotate-[0.4deg] bg-surface p-5 pt-8"
    >
      <Tape tone="orange">No record 🤷</Tape>
      <h2 className="text-2xl font-extrabold break-words">“{result.query}”</h2>
      <LeftyQuote line={result.line} mood="sad" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          tone="yellow"
          onClick={() => onPrefill(`${result.query} in `)}
          icon={<PackagePlus size={18} strokeWidth={2.75} aria-hidden="true" />}
        >
          Stash it now
        </Button>
      </div>
      <DidYouMean names={result.alternatives} onFind={onFind} />
      {inPlace.length > 0 && (
        <div className="mt-5">
          <p className="font-extrabold">But here&apos;s what&apos;s {placePhrase(result.query)}:</p>
          <div className="mt-2 grid gap-2">
            {inPlace.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </m.article>
  );
}

export function WhatsInCard({
  result,
  items,
}: {
  result: Extract<Result, { type: 'whatsIn' }>;
  items: Item[];
}) {
  const found = result.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => Boolean(i));
  return (
    <m.article {...cardMotion} className="sticker relative mt-8 bg-surface p-5 pt-8">
      <Tape tone="purple">What&apos;s {result.place}</Tape>
      <LeftyQuote line={result.line} mood={found.length ? 'smug' : 'sad'} />
      {found.length > 0 && (
        <div className="mt-4 grid gap-2">
          {found.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </m.article>
  );
}

export function HelpCard({
  result,
  onPrefill,
}: {
  result: Extract<Result, { type: 'help' }>;
  onPrefill: (text: string) => void;
}) {
  return (
    <m.article {...cardMotion} className="sticker relative mt-8 bg-surface p-5 pt-8">
      <Tape tone="orange">Huh? 🤔</Tape>
      <LeftyQuote line={result.line} mood="confused" />
      <p className="mt-4 text-sm font-extrabold text-muted">Try one of these:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.slice(0, 4).map((example) => (
          <Chip key={example} onClick={() => onPrefill(example)}>
            {example}
          </Chip>
        ))}
      </div>
    </m.article>
  );
}
