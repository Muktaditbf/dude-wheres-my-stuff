/** Page frame: header, navigation (top on desktop, bottom on phones). */
import { Boxes, ChartColumn, House, Settings, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { hrefFor, type Route } from '../lib/hooks';
import { Lefty } from './Lefty';
import { cn } from './ui';

const NAV: Array<{ route: Route; label: string; icon: typeof House }> = [
  { route: 'home', label: 'Home', icon: House },
  { route: 'stuff', label: 'My stuff', icon: Boxes },
  { route: 'shame', label: 'Shame', icon: Trophy },
  { route: 'report', label: 'Report', icon: ChartColumn },
];

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sticker-sm sr-only z-50 bg-yellow px-3 py-2 font-bold text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b-[3px] border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <a
            href={hrefFor('home')}
            className="flex items-center gap-2"
            aria-label="Dude, Where's My Stuff? Home"
          >
            <span className="sticker-sm grid size-10 place-items-center bg-yellow">
              <Lefty size={26} idle={false} title="" />
            </span>
            <span className="text-lg leading-none font-extrabold tracking-tight uppercase">
              Where&apos;s my
              <br />
              <span className="text-pink [-webkit-text-stroke:1px_var(--line)]">stuff?!</span>
            </span>
          </a>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-2 md:flex">
            {NAV.map(({ route: target, label, icon: Icon }) => (
              <a
                key={target}
                href={hrefFor(target)}
                aria-current={route === target ? 'page' : undefined}
                className={cn(
                  'sticker-sm press inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-extrabold',
                  route === target ? 'bg-yellow text-on-accent' : 'bg-surface',
                )}
              >
                <Icon size={16} strokeWidth={2.75} aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>
          <a
            href={hrefFor('settings')}
            aria-label="Settings"
            aria-current={route === 'settings' ? 'page' : undefined}
            className={cn(
              'sticker-sm press ml-auto grid size-10 place-items-center md:ml-0',
              route === 'settings' ? 'bg-yellow text-on-accent' : 'bg-surface',
            )}
          >
            <Settings size={20} strokeWidth={2.5} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pt-6 pb-36 md:pb-16">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-40 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticker grid grid-cols-4 gap-1 bg-surface p-1.5">
          {NAV.map(({ route: target, label, icon: Icon }) => {
            const active = route === target;
            return (
              <a
                key={target}
                href={hrefFor(target)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.7rem] font-extrabold transition-colors',
                  active
                    ? 'bg-yellow text-on-accent outline-[2.5px] outline-line outline-solid'
                    : 'text-ink',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.75 : 2.25} aria-hidden="true" />
                {label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
