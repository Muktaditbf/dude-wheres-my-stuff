import { useLiveQuery } from 'dexie-react-hooks';
import { Download, ShieldCheck, Smartphone, Upload } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { AutoBackupPanel } from '../components/AutoBackup';
import { Lefty } from '../components/Lefty';
import { useToast } from '../components/Toasts';
import { Button, cn, PageHeader, Segmented, Toggle } from '../components/ui';
import { clearDemo, setMeta, wipeEverything } from '../db/actions';
import { db } from '../db/schema';
import {
  BackupError,
  backupFilename,
  createBackup,
  downloadJson,
  parseBackup,
  restoreBackup,
} from '../lib/backup';
import { loadDemo } from '../lib/demo';
import { isIOS, isStandalone, useInstall } from '../lib/install';
import { linesFor } from '../lib/personality';
import {
  GHOST_DAY_OPTIONS,
  type RoastLevel,
  type ThemeChoice,
  updateSettings,
  useSettings,
} from '../lib/settings';
import { playAirHorn } from '../lib/sound';

const REPO_URL = 'https://github.com/Muktaditbf/dude-wheres-my-stuff';

const LEVELS: Array<{ value: RoastLevel; emoji: string; title: string; blurb: string }> = [
  {
    value: 'chill',
    emoji: '😌',
    title: 'Chill',
    blurb: 'Facts only. Polite. Your grandma could use it.',
  },
  { value: 'bro', emoji: '😎', title: 'Bro', blurb: 'Friendly roasting. The default.' },
  { value: 'unhinged', emoji: '🤪', title: 'Unhinged', blurb: 'Maximum drama. Caps lock energy.' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10" aria-label={title}>
      <h2 className="text-xl font-extrabold uppercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StorageStatus() {
  const toast = useToast();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  if (persisted === null) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="flex-1 font-semibold">
        <ShieldCheck
          size={18}
          strokeWidth={2.75}
          className="mr-1 inline align-[-3px]"
          aria-hidden="true"
        />
        {persisted
          ? 'Protected: your browser promised not to clear this data on its own.'
          : 'Not protected yet: the browser may clear data if the device runs low on space.'}
      </p>
      {!persisted && (
        <Button
          size="sm"
          tone="lime"
          onClick={async () => {
            const granted = (await navigator.storage?.persist?.()) ?? false;
            setPersisted(granted);
            toast({
              message: granted
                ? 'Protected. Your stuff is safe(r). 🛡️'
                : 'The browser said no. Install the app or make a backup to be safe.',
              tone: granted ? 'lime' : 'yellow',
            });
          }}
        >
          Protect my data
        </Button>
      )}
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettings();
  const toast = useToast();
  const { available: canInstall, install } = useInstall();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const demoCount = useLiveQuery(() => db.items.filter((i) => Boolean(i.demo)).count(), [], 0);
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;

  return (
    <>
      <PageHeader
        title="Settings"
        highlight="& stuff"
        tone="purple"
        subtitle="Tune the sass. Guard the data."
      />

      <Section title="Roast level">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Roast level">
          {LEVELS.map((level) => {
            const active = settings.roast === level.value;
            const sample = linesFor('findLegend', level.value)[0]?.replace(
              /\{(\w+)\}/g,
              (_, name: string) =>
                name === 'place'
                  ? 'in the bowl'
                  : name === 'count'
                    ? '9'
                    : name === 'ordinal'
                      ? '9th'
                      : name === 'item'
                        ? 'Keys'
                        : '…',
            );
            return (
              // biome-ignore lint/a11y/useSemanticElements: big tappable cards instead of tiny radio dots
              <button
                key={level.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => updateSettings({ roast: level.value })}
                className={cn(
                  'sticker-sm press flex flex-col items-start gap-1 p-4 text-left',
                  active ? 'bg-yellow text-on-accent' : 'bg-surface',
                )}
              >
                <span className="text-3xl" aria-hidden="true">
                  {level.emoji}
                </span>
                <span className="text-lg font-extrabold">{level.title}</span>
                <span className={cn('text-sm font-semibold', active ? '' : 'text-muted')}>
                  {level.blurb}
                </span>
                {sample && (
                  <span className="mt-1 font-marker text-sm leading-snug">“{sample}”</span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Effects">
        <div className="sticker-sm divide-y-2 divide-dashed divide-line/25 bg-surface px-4">
          <Toggle
            label="Sound effects"
            description="Air horn when you find it. Sad trombone when you don't."
            checked={settings.sounds}
            onChange={(sounds) => {
              updateSettings({ sounds });
              if (sounds) playAirHorn();
            }}
          />
          <Toggle
            label="Drama"
            description="Screen shakes, plot twists, confetti, fake 'searching'. Off = instant answers."
            checked={settings.drama}
            onChange={(drama) => updateSettings({ drama })}
          />
        </div>
      </Section>

      <Section title="Look">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div>
            <p className="mb-2 text-sm font-extrabold">Theme</p>
            <Segmented<ThemeChoice>
              label="Theme"
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light ☀️' },
                { value: 'dark', label: 'Dark 🌙' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-extrabold">Call it “ghosted” after</p>
            <Segmented<string>
              label="Ghosted after"
              value={String(settings.ghostDays)}
              onChange={(days) => updateSettings({ ghostDays: Number(days) })}
              options={GHOST_DAY_OPTIONS.map((d) => ({ value: String(d), label: `${d} days` }))}
            />
          </div>
        </div>
      </Section>

      <Section title="Your data">
        <div className="sticker-sm grid gap-4 bg-surface p-4">
          <p className="font-semibold">
            🔒 Everything lives only in this browser on this device. No account, no server, no
            tracking. That also means: if you clear your browser data, it&apos;s gone. Make backups.
          </p>
          <StorageStatus />
          <AutoBackupPanel />
          <div className="flex flex-wrap gap-2">
            <Button
              tone="cyan"
              icon={<Download size={16} strokeWidth={2.75} aria-hidden="true" />}
              onClick={async () => {
                downloadJson(await createBackup(), backupFilename());
                await setMeta('lastBackupAt', Date.now());
                toast({ message: 'Backup downloaded. Now don’t lose it. 👀', tone: 'lime' });
              }}
            >
              Download backup
            </Button>
            <label className="sticker-sm press inline-flex min-h-11 cursor-pointer items-center gap-2 bg-surface px-4 font-extrabold focus-within:outline-dashed">
              <Upload size={16} strokeWidth={2.75} aria-hidden="true" />
              Restore backup
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    const restored = await restoreBackup(parseBackup(await file.text()));
                    toast({
                      message: `Restored ${restored} thing${restored === 1 ? '' : 's'}. Welcome back! 🎉`,
                      tone: 'lime',
                    });
                  } catch (error) {
                    toast({
                      message:
                        error instanceof BackupError ? error.message : 'Could not read that file.',
                      tone: 'pink',
                    });
                  }
                }}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-line/25 pt-4">
            {demoCount > 0 ? (
              <Button
                onClick={async () => {
                  const removed = await clearDemo();
                  toast({ message: `Removed ${removed} demo things. Back to reality.` });
                }}
              >
                Remove demo stuff ({demoCount})
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  const added = await loadDemo();
                  toast({ message: `Loaded ${added} demo things. 🧪`, tone: 'lime' });
                }}
              >
                Load demo stuff 🧪
              </Button>
            )}
            {confirmWipe ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">Wipe everything? There is no undo.</span>
                <Button
                  tone="danger"
                  onClick={async () => {
                    await wipeEverything();
                    setConfirmWipe(false);
                    toast({ message: 'Wiped. A fresh start. Lefty forgot everything. 🫥' });
                  }}
                >
                  Yes, wipe it
                </Button>
                <Button onClick={() => setConfirmWipe(false)}>Cancel</Button>
              </span>
            ) : (
              <Button tone="plain" onClick={() => setConfirmWipe(true)}>
                Wipe everything
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Faster than forgetting">
        <div className="sticker-sm grid gap-4 bg-surface p-4">
          {isStandalone() ? (
            <p className="font-semibold">
              ✅ Installed. Long-press the app icon for “Stash it” and “Find it” shortcuts.
            </p>
          ) : canInstall ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 font-semibold">
                Install it like a real app: home screen icon, works offline, opens in one tap.
              </p>
              <Button
                tone="yellow"
                icon={<Smartphone size={16} strokeWidth={2.75} aria-hidden="true" />}
                onClick={install}
              >
                Install app
              </Button>
            </div>
          ) : (
            <p className="font-semibold">
              📲 Install it:{' '}
              {isIOS()
                ? 'tap Share, then “Add to Home Screen”.'
                : 'use your browser menu, then “Install app” or “Add to Home screen”.'}
            </p>
          )}
          <div>
            <p className="font-semibold">
              🔗 Links that do things. Use them in phone shortcuts, widgets or a desktop hotkey:
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              <li>
                <code className="rounded-md border-2 border-line/30 bg-surface-2 px-1.5 py-0.5 break-all">
                  {base}?add=keys in the drawer
                </code>{' '}
                saves it instantly
              </li>
              <li>
                <code className="rounded-md border-2 border-line/30 bg-surface-2 px-1.5 py-0.5 break-all">
                  {base}?q=keys
                </code>{' '}
                finds it
              </li>
              <li>
                <code className="rounded-md border-2 border-line/30 bg-surface-2 px-1.5 py-0.5 break-all">
                  {base}?mode=stash
                </code>{' '}
                opens ready to type
              </li>
            </ul>
          </div>
          <p className="text-sm font-semibold text-muted">
            ⌨️ On a computer, press / or Ctrl+K to jump to the input.
          </p>
        </div>
      </Section>

      <Section title="About">
        <div className="sticker-sm flex flex-col items-center gap-4 bg-surface p-5 text-center sm:flex-row sm:text-left">
          <Lefty size={70} mood="happy" />
          <div className="flex-1">
            <p className="font-extrabold">Dude, Where&apos;s My Stuff? · v{__APP_VERSION__}</p>
            <p className="mt-1 font-semibold text-muted">
              Free and open source. Built for everyone who has ever stood in a hallway holding
              nothing, wondering where everything went.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-extrabold underline decoration-pink decoration-4 underline-offset-4"
            >
              ⭐ Source code &amp; roast submissions on GitHub
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
