import { useLiveQuery } from 'dexie-react-hooks';
import { Download } from 'lucide-react';
import { m } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ItemRow } from '../components/ItemRow';
import { Lefty, type Mood } from '../components/Lefty';
import { Omnibox } from '../components/Omnibox';
import {
  AnswerCard,
  HelpCard,
  type Result,
  StashedCard,
  UnknownCard,
  WhatsInCard,
} from '../components/results';
import { useToast } from '../components/Toasts';
import { Button, Chip } from '../components/ui';
import { getMeta, markFound, recordSearch, setMeta, stash, undo } from '../db/actions';
import { db, type Item } from '../db/schema';
import { loadDemo } from '../lib/demo';
import { hrefFor, useFocusShortcut, useItems, usePrefersReducedMotion } from '../lib/hooks';
import { isStandalone } from '../lib/install';
import { itemKey } from '../lib/normalize';
import { PRONOUNS, parseInput } from '../lib/parser';
import {
  findSituation,
  itemVars,
  personFrom,
  placePhrase,
  say,
  spotName,
} from '../lib/personality';
import { compressImage } from '../lib/photo';
import { EXAMPLES, REACTIONS, SEARCHING_LINES } from '../lib/roasts';
import { useSettings } from '../lib/settings';
import { playBonk, playPop, vibrate } from '../lib/sound';
import { DAY } from '../lib/time';
import { canonical, findBest, searchPlace } from '../search/search';

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function moodFor(result: Result | null, searching: boolean): Mood {
  if (searching) return 'thinking';
  if (!result) return 'chill';
  switch (result.type) {
    case 'stashed':
      return result.undone ? 'chill' : 'happy';
    case 'answer':
      return result.phase === 'secured'
        ? 'party'
        : result.phase === 'notThere'
          ? 'shocked'
          : 'smug';
    case 'unknown':
      return 'sad';
    case 'whatsIn':
      return result.itemIds.length ? 'smug' : 'sad';
    case 'help':
      return 'confused';
  }
}

function Wordmark() {
  return (
    <h1 className="text-[2.65rem] leading-[0.92] font-extrabold tracking-tight uppercase sm:text-6xl">
      <span className="sticker-sm inline-block -rotate-3 bg-yellow px-2 text-on-accent">Dude,</span>
      <span className="mt-2 block">where&apos;s my</span>
      <span className="sticker-sm mt-1 inline-block rotate-2 bg-pink px-2 text-on-accent">
        stuff?!
      </span>
    </h1>
  );
}

function Searching({ line }: { line: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticker mt-8 flex items-center gap-4 bg-surface p-5"
      role="status"
    >
      <m.span
        aria-hidden="true"
        className="text-4xl"
        animate={{ rotate: [0, -20, 20, -10, 0], x: [0, 6, -6, 0] }}
        transition={{ duration: 0.7, repeat: Number.POSITIVE_INFINITY }}
      >
        🔍
      </m.span>
      <span className="font-marker text-xl">{line}</span>
    </m.div>
  );
}

function Welcome({ onPrefill, onDemo }: { onPrefill: (text: string) => void; onDemo: () => void }) {
  const steps = [
    ['📦', 'Put something away. Tell me:', '“passport in the black bag”'],
    ['🧠', 'Forget about it.', "That's my job now."],
    ['🔍', 'Ask me later:', '“where’s my passport?” Get the answer. Get roasted.'],
  ];
  return (
    <section
      className="sticker mt-8 -rotate-[0.3deg] bg-surface p-5 sm:p-6"
      aria-labelledby="how-title"
    >
      <h2 id="how-title" className="text-2xl font-extrabold uppercase">
        How this works
      </h2>
      <ol className="mt-4 grid gap-3">
        {steps.map(([emoji, lead, rest], i) => (
          <li key={lead} className="flex items-start gap-3">
            <span className="sticker-sm grid size-10 shrink-0 place-items-center bg-yellow text-lg font-extrabold text-on-accent">
              {i + 1}
            </span>
            <p className="pt-1.5 text-lg leading-snug">
              <span aria-hidden="true">{emoji} </span>
              <strong>{lead}</strong> <span className="font-marker">{rest}</span>
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm font-extrabold text-muted uppercase">Try it:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.slice(0, 3).map((example) => (
          <Chip key={example} onClick={() => onPrefill(example)}>
            {example}
          </Chip>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button tone="cyan" onClick={onDemo}>
          Load demo stuff 🧪
        </Button>
        <span className="text-sm font-semibold text-muted">
          See a fully lived-in, slightly tragic household.
        </span>
      </div>
      <p className="mt-5 border-t-2 border-dashed border-line/30 pt-4 text-sm font-semibold text-muted">
        🔒 Everything stays on this device. No account, no cloud, no tracking.
      </p>
    </section>
  );
}

function BackupNag({ count }: { count: number }) {
  const toast = useToast();
  const meta = useLiveQuery(async () => ({
    last: await getMeta<number>('lastBackupAt'),
    snooze: await getMeta<number>('backupSnoozeUntil'),
  }));
  if (!meta || count < 5) return null;
  const now = Date.now();
  if ((meta.snooze ?? 0) > now || (meta.last && now - meta.last < 30 * DAY)) return null;

  return (
    <aside className="sticker-sm mt-10 flex flex-col gap-3 bg-orange p-4 text-on-accent sm:flex-row sm:items-center">
      <p className="flex-1 font-bold">
        💾 Back up your stuff. If your browser forgets, I can&apos;t help you. Ironic, I know.
      </p>
      <div className="flex gap-2">
        <Button
          tone="plain"
          size="sm"
          icon={<Download size={16} strokeWidth={2.75} aria-hidden="true" />}
          onClick={async () => {
            const { backupFilename, createBackup, downloadJson } = await import('../lib/backup');
            downloadJson(await createBackup(), backupFilename());
            await setMeta('lastBackupAt', Date.now());
            toast({
              message: 'Backup downloaded. Keep it somewhere you won’t lose. 👀',
              tone: 'lime',
            });
          }}
        >
          Back up
        </Button>
        <Button
          tone="plain"
          size="sm"
          onClick={() => setMeta('backupSnoozeUntil', Date.now() + 7 * DAY)}
        >
          Later
        </Button>
      </div>
    </aside>
  );
}

export function Home() {
  const settings = useSettings();
  const level = settings.roast;
  const items = useItems();
  const toast = useToast();
  const reduced = usePrefersReducedMotion();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [searching, setSearching] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0] ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastItemId = useRef<string | null>(null);
  const itemsRef = useRef<Item[] | undefined>(items);
  itemsRef.current = items;
  const photoRef = useRef<Blob | null>(photo);
  photoRef.current = photo;

  const count = items?.length ?? 0;
  const hasItems = count > 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-roll only when the situation changes, not on every new item
  const greeting = useMemo(
    () => (hasItems ? say('greetingWithStuff', level, { n: count }) : say('greeting', level)),
    [hasItems, level],
  );
  const knownPlaces = useMemo(() => [...new Set((items ?? []).map((i) => i.place))], [items]);
  const recent = useMemo(
    () => [...(items ?? [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [items],
  );

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useFocusShortcut(focusInput);

  // Rotate example placeholders so people discover what they can type.
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % EXAMPLES.length;
      setPlaceholder((current) =>
        EXAMPLES.includes(current) ? (EXAMPLES[i] ?? current) : current,
      );
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const show = useCallback((next: Result | null) => {
    setResult(next);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    );
  }, []);

  const theatre = useCallback(async () => {
    if (!settings.drama || reduced) return;
    setSearching(pick(SEARCHING_LINES));
    await sleep(700);
    setSearching(null);
  }, [settings.drama, reduced]);

  const find = useCallback(
    async (query: string) => {
      const all = itemsRef.current ?? (await db.items.toArray());
      const last = lastItemId.current ? all.find((i) => i.id === lastItemId.current) : undefined;
      const resolved = PRONOUNS.has(query.toLowerCase()) && last ? last.name : query;
      const { best, alternatives } = findBest(resolved, all);
      await theatre();
      if (best) {
        const updated = (await recordSearch(best.item.id)) ?? best.item;
        lastItemId.current = updated.id;
        const situation = findSituation(updated, level);
        show({
          type: 'answer',
          itemId: updated.id,
          phase: 'ask',
          alternatives: alternatives.map((m) => m.item.name),
          line: say(situation, level, itemVars(updated), { fallback: 'findFirst' }),
          burst: 0,
        });
        return;
      }
      const isCar = canonical(itemKey(resolved)) === 'car';
      const inPlace = searchPlace(resolved, all);
      if (settings.sounds) playBonk();
      show({
        type: 'unknown',
        query: resolved,
        alternatives: alternatives.map((m) => m.item.name),
        inPlace: inPlace.map((i) => i.id),
        line: say(isCar ? 'findCar' : 'findUnknown', level, { query: resolved }),
      });
    },
    [level, settings.sounds, show, theatre],
  );

  const run = useCallback(
    async (raw: string, hint?: 'find' | 'stash') => {
      const intent = parseInput(raw, hint);
      if (intent.kind === 'empty') return;
      setBusy(true);
      try {
        switch (intent.kind) {
          case 'stash': {
            const original = photoRef.current;
            const evidence = original ? await compressImage(original) : undefined;
            const { outcomes, undo: token } = await stash({
              names: intent.items,
              place: intent.place,
              photo: evidence,
              lent: intent.lent,
              found: intent.found,
            });
            const first = outcomes[0];
            if (!first) break;
            const situation = intent.found
              ? 'stashFound'
              : intent.lent
                ? 'stashLent'
                : outcomes.length > 1
                  ? 'stashMany'
                  : first.created
                    ? 'stashNew'
                    : first.samePlace
                      ? 'stashSame'
                      : 'stashMoved';
            const previous = first.previous;
            show({
              type: 'stashed',
              outcomes,
              undo: token,
              photo: Boolean(evidence),
              line: say(situation, level, {
                item: first.item.name,
                place: placePhrase(first.item.place),
                spot: spotName(first.item.place),
                prev: previous ? placePhrase(previous.place) : '',
                prevSpot: previous ? spotName(previous.place) : '',
                n: outcomes.length,
                person: personFrom(first.item.place) ?? 'they',
              }),
            });
            lastItemId.current = first.item.id;
            setText('');
            setPhoto(null);
            if (settings.sounds) playPop();
            vibrate(20);
            if (isStandalone()) void navigator.storage?.persist?.();
            break;
          }
          case 'find':
            setText('');
            await find(intent.item);
            break;
          case 'whatsIn': {
            setText('');
            const matches = searchPlace(intent.place, itemsRef.current ?? []);
            await theatre();
            show({
              type: 'whatsIn',
              place: intent.place,
              itemIds: matches.map((i) => i.id),
              line: say(matches.length ? 'whatsIn' : 'whatsInEmpty', level, {
                n: matches.length,
                place: placePhrase(intent.place),
                spot: spotName(intent.place),
              }),
            });
            break;
          }
          case 'found': {
            const all = itemsRef.current ?? [];
            const last = lastItemId.current
              ? all.find((i) => i.id === lastItemId.current)
              : undefined;
            const target = PRONOUNS.has(intent.item.toLowerCase())
              ? last
              : findBest(intent.item, all).best?.item;
            if (!target) {
              show({
                type: 'unknown',
                query: intent.item,
                alternatives: [],
                inPlace: [],
                line: say('findUnknown', level, { query: intent.item }),
              });
              break;
            }
            setText('');
            const updated = (await markFound(target.id)) ?? target;
            lastItemId.current = updated.id;
            show({
              type: 'answer',
              itemId: updated.id,
              phase: 'secured',
              alternatives: [],
              line: say('found', level, itemVars(updated)),
              burst: Date.now(),
            });
            break;
          }
          case 'unknown':
            show({
              type: 'help',
              text: intent.text,
              line:
                intent.reason === 'noPlace'
                  ? say('needPlace', level, { text: intent.text || 'keys' })
                  : say('confused', level),
            });
            break;
        }
      } catch (error) {
        console.error(error);
        toast({ message: 'Something went wrong saving that. Mind trying again?', tone: 'pink' });
      } finally {
        setBusy(false);
      }
    },
    [find, level, settings.sounds, show, theatre, toast],
  );

  // Links like ?add=keys%20in%20drawer or ?q=keys (for phone shortcuts and hotkeys).
  const handledLink = useRef(false);
  useEffect(() => {
    if (handledLink.current || items === undefined) return;
    handledLink.current = true;
    const params = new URLSearchParams(window.location.search);
    const add = params.get('add');
    const q = params.get('q');
    const mode = params.get('mode');
    if (!add && !q && !mode) return;
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.hash,
    );
    if (add) void run(add, 'stash');
    else if (q) void run(q, 'find');
    if (mode === 'stash') setPlaceholder('Where did you put it? e.g. keys in the drawer');
    if (mode === 'find') setPlaceholder('What did you lose? e.g. passport');
    if (mode) inputRef.current?.focus();
  }, [items, run]);

  const prefill = (value: string) => {
    setText(value);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      input?.focus();
      input?.setSelectionRange(value.length, value.length);
    });
  };

  const onDemo = async () => {
    const added = await loadDemo();
    toast({
      message: `Loaded ${added} demo things. Try “where’s my remote?” 📺`,
      tone: 'lime',
    });
    prefill("where's my remote?");
  };

  const mood = moodFor(result, Boolean(searching));
  const reactionSet = mood === 'chill' || mood === 'thinking' ? null : REACTIONS[mood];
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new reaction per result, not per render
  const bubble = useMemo(() => {
    if (searching) return searching;
    if (!reactionSet) return greeting;
    return pick(level === 'chill' ? reactionSet.chill : reactionSet.fun);
  }, [searching, reactionSet, greeting, level, result]);

  return (
    <>
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Wordmark />
        <div className="flex items-start gap-4 md:max-w-xs">
          <Lefty mood={mood} size={82} className="shrink-0" />
          <p
            aria-live="polite"
            className="bubble sticker-sm mt-1 bg-surface px-4 py-3 font-marker text-lg leading-snug"
          >
            {bubble}
          </p>
        </div>
      </section>

      <div className="mt-8">
        <Omnibox
          value={text}
          onChange={setText}
          onSubmit={(value) => void run(value)}
          photo={photo}
          onPhoto={setPhoto}
          placeholder={placeholder}
          inputRef={inputRef}
          knownPlaces={knownPlaces}
          busy={busy}
          onVoiceError={(message) => toast({ message, tone: 'yellow' })}
        />
      </div>

      <div ref={resultRef} className="scroll-mb-28">
        {searching ? (
          <Searching line={searching} />
        ) : (
          result && (
            <>
              {result.type === 'answer' && (
                <AnswerCard
                  key={result.itemId}
                  result={result}
                  knownPlaces={knownPlaces}
                  onUpdate={(patch) =>
                    setResult((current) =>
                      current?.type === 'answer' ? { ...current, ...patch } : current,
                    )
                  }
                  onFind={(name) => void find(name)}
                  onMoved={(outcomes, token) => {
                    const first = outcomes[0];
                    show({
                      type: 'stashed',
                      outcomes,
                      undo: token,
                      photo: false,
                      line: first
                        ? say('stashMoved', level, {
                            item: first.item.name,
                            place: placePhrase(first.item.place),
                            prev: first.previous ? placePhrase(first.previous.place) : '',
                            prevSpot: first.previous ? spotName(first.previous.place) : '',
                          })
                        : '',
                    });
                  }}
                />
              )}
              {result.type === 'stashed' && (
                <StashedCard
                  result={result}
                  onUndo={async () => {
                    await undo(result.undo);
                    setResult({ ...result, undone: true, line: say('undo', level) });
                  }}
                />
              )}
              {result.type === 'unknown' && (
                <UnknownCard
                  result={result}
                  items={items ?? []}
                  onFind={(name) => void find(name)}
                  onPrefill={prefill}
                />
              )}
              {result.type === 'whatsIn' && <WhatsInCard result={result} items={items ?? []} />}
              {result.type === 'help' && <HelpCard result={result} onPrefill={prefill} />}
            </>
          )
        )}
      </div>

      {items !== undefined && !hasItems && !result && (
        <Welcome onPrefill={prefill} onDemo={onDemo} />
      )}

      {hasItems && (
        <section className="mt-12" aria-labelledby="recent-title">
          <div className="flex items-end justify-between gap-3">
            <h2 id="recent-title" className="text-xl font-extrabold uppercase">
              Recently stashed
            </h2>
            <a
              href={hrefFor('stuff')}
              className="font-extrabold underline decoration-pink decoration-4 underline-offset-4"
            >
              All {count} →
            </a>
          </div>
          <div className="mt-3 grid gap-2.5">
            {recent.map((item) => (
              <ItemRow key={item.id} item={item} ghostDays={settings.ghostDays} tilt />
            ))}
          </div>
        </section>
      )}

      <BackupNag count={count} />
    </>
  );
}
