import { Share2 } from 'lucide-react';
import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { useToast } from '../components/Toasts';
import { Button, cn, PageHeader } from '../components/ui';
import { useAllEvents, useItems } from '../lib/hooks';
import { placePhrase } from '../lib/personality';
import { useSettings } from '../lib/settings';
import { computeStats } from '../lib/stats';
import { hourLabel, since } from '../lib/time';

const APP_URL = 'https://muktaditbf.github.io/dude-wheres-my-stuff/';

function Tile({
  emoji,
  label,
  value,
  note,
  className,
}: {
  emoji: string;
  label: string;
  value: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('sticker-sm bg-surface p-4', className)}>
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-muted uppercase">
        <span aria-hidden="true" className="text-base">
          {emoji}
        </span>
        {label}
      </p>
      <p className="mt-1 text-3xl leading-tight font-extrabold break-words">{value}</p>
      {note && <p className="mt-1 text-sm font-semibold text-muted">{note}</p>}
    </div>
  );
}

export function Report() {
  const items = useItems();
  const events = useAllEvents();
  const settings = useSettings();
  const toast = useToast();
  if (items === undefined || events === undefined) return null;

  const stats = computeStats(items, events, settings.ghostDays);
  const { rank, next } = stats;
  const progress = next ? Math.min(1, (stats.score - rank.min) / (next.min - rank.min)) : 1;

  const share = async () => {
    const lines = [
      `My forgetfulness rank: ${rank.title} ${rank.emoji}`,
      stats.mostLost
        ? `I asked where my ${stats.mostLost.name.toLowerCase()} was ${stats.mostLost.searchCount} times.`
        : 'I have not lost anything yet. Suspicious, I know.',
      `What's your rank? ${APP_URL}`,
    ];
    const text = lines.join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Chaos Report on Dude, Where's My Stuff?", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({ message: 'Copied! Go expose yourself. 📋', tone: 'lime' });
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  };

  return (
    <>
      <PageHeader
        title="Chaos"
        highlight="Report"
        tone="lime"
        subtitle="Your forgetfulness, measured with questionable science."
      />

      <m.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="sticker relative bg-yellow p-6 text-on-accent"
        aria-labelledby="rank-title"
      >
        <p className="text-xs font-extrabold tracking-wide uppercase">Your rank</p>
        <div className="mt-2 flex items-center gap-4">
          <span aria-hidden="true" className="text-6xl sm:text-7xl">
            {rank.emoji}
          </span>
          <div>
            <h2
              id="rank-title"
              className="text-3xl leading-none font-extrabold uppercase sm:text-4xl"
            >
              {rank.title}
            </h2>
            <p className="mt-2 font-marker text-lg">{rank.blurb}</p>
          </div>
        </div>
        {next && (
          <div className="mt-5">
            <div className="h-4 overflow-hidden rounded-full border-[2.5px] border-line bg-surface">
              <div className="h-full bg-pink" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-sm font-bold">
              {next.min - stats.score} more chaos points to {next.emoji} {next.title}. (Please
              don&apos;t.)
            </p>
          </div>
        )}
        <Button
          className="mt-5"
          tone="plain"
          onClick={share}
          icon={<Share2 size={16} strokeWidth={2.75} aria-hidden="true" />}
        >
          Share my shame
        </Button>
      </m.section>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile emoji="📦" label="Things tracked" value={stats.tracked} />
        <Tile emoji="🔍" label="Times you asked" value={stats.searches} />
        <Tile
          emoji="✅"
          label="Found rate"
          value={stats.foundRate === null ? '—' : `${Math.round(stats.foundRate * 100)}%`}
        />
        <Tile
          emoji="💀"
          label="“It's not there”"
          value={stats.notThere}
          note="Plot twists survived"
        />
        <Tile
          emoji="🕑"
          label="Worst hour"
          value={stats.worstHour === undefined ? '—' : hourLabel(stats.worstHour)}
          note={stats.worstHour === undefined ? undefined : 'Peak chaos o’clock'}
        />
        <Tile
          emoji="👻"
          label="Ghosted"
          value={stats.ghosted.length}
          note={`Not checked in ${settings.ghostDays}+ days`}
        />
        <Tile
          className="col-span-2 sm:col-span-3"
          emoji="🏆"
          label="Most lost"
          value={stats.mostLost ? `${stats.mostLost.emoji} ${stats.mostLost.name}` : '—'}
          note={
            stats.mostLost
              ? `Asked about ${stats.mostLost.searchCount} times. It knows what it did.`
              : 'Nothing yet.'
          }
        />
        <Tile
          className="col-span-2 sm:col-span-3"
          emoji="🤝"
          label="Lent out"
          value={stats.lent.length}
          note={
            stats.lent.length
              ? stats.lent.map((i) => `${i.name} (${i.place})`).join(', ')
              : 'Nobody owes you anything. Rare.'
          }
        />
        {stats.oldest && (
          <Tile
            className="col-span-2 sm:col-span-3"
            emoji="🗿"
            label="Most loyal"
            value={`${stats.oldest.emoji} ${stats.oldest.name}`}
            note={`Has been ${placePhrase(stats.oldest.place)} for ${since(stats.oldest.updatedAt)}.`}
          />
        )}
      </div>
    </>
  );
}
