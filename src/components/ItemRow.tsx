import type { Item } from '../db/schema';
import { openItem } from '../lib/hooks';
import { isGhosted } from '../lib/stats';
import { ago } from '../lib/time';
import { Badge, cn } from './ui';

export function ItemBadges({ item, ghostDays }: { item: Item; ghostDays?: number }) {
  return (
    <>
      {item.missing && <Badge tone="pink">Missing</Badge>}
      {item.lent && <Badge tone="purple">Lent</Badge>}
      {ghostDays !== undefined && isGhosted(item, ghostDays) && (
        <Badge tone="cyan">Ghosted 👻</Badge>
      )}
      {item.demo && <Badge tone="plain">Demo</Badge>}
    </>
  );
}

/** One item in a list. Tapping opens the item sheet. */
export function ItemRow({
  item,
  ghostDays,
  className,
  tilt,
}: {
  item: Item;
  ghostDays?: number;
  className?: string;
  tilt?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => openItem(item.id)}
      className={cn(
        'sticker-sm press flex w-full min-w-0 items-center gap-3 bg-surface p-3 text-left',
        tilt && 'odd:-rotate-[0.4deg] even:rotate-[0.4deg]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-xl border-[2.5px] border-line bg-surface-2 text-2xl"
      >
        {item.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-lg leading-tight font-extrabold">{item.name}</span>
          <ItemBadges item={item} ghostDays={ghostDays} />
        </span>
        <span className="block truncate font-marker text-[1.05rem] text-muted">{item.place}</span>
      </span>
      <span className="hidden shrink-0 text-right text-xs font-bold text-muted sm:block">
        {ago(item.updatedAt)}
      </span>
    </button>
  );
}
