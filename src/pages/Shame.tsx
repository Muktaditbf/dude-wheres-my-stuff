import { m } from 'motion/react';
import { ItemRow } from '../components/ItemRow';
import { useToast } from '../components/Toasts';
import { Button, EmptyNote, PageHeader } from '../components/ui';
import { confirmStillThere } from '../db/actions';
import type { Item } from '../db/schema';
import { openItem, useItems } from '../lib/hooks';
import { itemVars, say } from '../lib/personality';
import { REWARDS } from '../lib/roasts';
import { useSettings } from '../lib/settings';
import { hallOfShame, isGhosted } from '../lib/stats';
import { ago } from '../lib/time';

const MEDALS = ['🥇', '🥈', '🥉'];
const TILTS = ['-rotate-2', 'rotate-1', '-rotate-1'];

function WantedPoster({ item, rank }: { item: Item; rank: number }) {
  return (
    <m.button
      type="button"
      onClick={() => openItem(item.id)}
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
      className={`sticker press relative w-full bg-paper p-5 text-center text-paper-ink ${TILTS[rank] ?? ''}`}
    >
      <span aria-hidden="true" className="absolute -top-4 -left-3 text-4xl">
        {MEDALS[rank]}
      </span>
      <span className="block text-3xl font-extrabold tracking-[0.18em] sm:text-4xl">WANTED</span>
      <span className="block text-xs font-extrabold tracking-wide uppercase">
        for repeatedly vanishing
      </span>
      <span aria-hidden="true" className="my-3 block text-6xl">
        {item.emoji}
      </span>
      <span className="block text-2xl leading-tight font-extrabold break-words uppercase">
        {item.name}
      </span>
      <span className="mt-1 block font-marker text-xl">
        Lost {item.searchCount} time{item.searchCount === 1 ? '' : 's'}
      </span>
      <span className="mt-1 block text-sm font-semibold">Last seen: {item.place}</span>
      <span className="mt-3 block border-t-2 border-dashed border-paper-ink/40 pt-2 text-sm font-extrabold uppercase">
        Reward: {REWARDS[rank % REWARDS.length]}
      </span>
    </m.button>
  );
}

export function Shame() {
  const items = useItems();
  const settings = useSettings();
  const toast = useToast();
  if (items === undefined) return null;

  const shame = hallOfShame(items);
  const podium = shame.slice(0, 3);
  const rest = shame.slice(3, 10);
  const ghosted = items
    .filter((item) => isGhosted(item, settings.ghostDays))
    .sort((a, b) => a.checkedAt - b.checkedAt);

  return (
    <>
      <PageHeader
        title="Hall of"
        highlight="Shame"
        tone="pink"
        subtitle="The things you lose the most. Frame it. Learn from it. (You won't.)"
      />

      {podium.length === 0 ? (
        <EmptyNote>No crimes yet. Suspiciously clean record. 🧐</EmptyNote>
      ) : (
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-5">
          {podium.map((item, rank) => (
            <WantedPoster key={item.id} item={item} rank={rank} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <section className="mt-10" aria-labelledby="also-title">
          <h2 id="also-title" className="text-xl font-extrabold uppercase">
            Also wanted
          </h2>
          <ol className="mt-3 grid gap-2.5">
            {rest.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-right text-lg font-extrabold">#{i + 4}</span>
                <ItemRow item={item} className="flex-1" />
                <span className="sr-only">Lost {item.searchCount} times</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-14" aria-labelledby="ghosted-title">
        <h2 id="ghosted-title" className="text-3xl font-extrabold uppercase">
          Ghosted <span aria-hidden="true">👻</span>
        </h2>
        <p className="mt-1 font-semibold text-muted">
          Not checked in {settings.ghostDays}+ days. Are they still where you left them?
        </p>
        {ghosted.length === 0 ? (
          <div className="mt-4">
            <EmptyNote>Nothing is ghosting you. For now.</EmptyNote>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {ghosted.map((item) => (
              <li
                key={item.id}
                className="sticker-sm flex flex-col gap-3 bg-surface p-4 sm:flex-row sm:items-center"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span aria-hidden="true" className="text-3xl">
                    {item.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-extrabold">{item.name}</span>
                    <span className="block truncate font-marker text-muted">{item.place}</span>
                    <span className="block text-xs font-bold text-muted">
                      Last checked {ago(item.checkedAt)}
                    </span>
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button
                    size="sm"
                    tone="lime"
                    onClick={async () => {
                      await confirmStillThere(item.id);
                      toast({
                        message: say('stillThere', settings.roast, itemVars(item)),
                        tone: 'lime',
                      });
                    }}
                  >
                    Still there
                  </Button>
                  <Button size="sm" onClick={() => openItem(item.id)}>
                    It moved
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
