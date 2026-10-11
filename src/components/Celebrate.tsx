/** Over-the-top reactions: the SECURED sticker, emoji confetti, and the plot-twist flash. */
import { AnimatePresence, m } from 'motion/react';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

export function SecuredSticker({ label = 'Secured ✅' }: { label?: string }) {
  return (
    <m.div
      aria-hidden="true"
      initial={{ scale: 3.2, opacity: 0, rotate: -35 }}
      animate={{ scale: 1, opacity: 1, rotate: -11 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, mass: 0.9 }}
      className="pointer-events-none absolute -top-8 right-3 z-10 sm:-top-9 sm:right-6"
    >
      <span className="sticker block bg-lime px-3 py-1.5 text-xl font-extrabold tracking-tight text-on-accent uppercase sm:px-4 sm:py-2 sm:text-3xl">
        {label}
      </span>
    </m.div>
  );
}

const BURST = ['🎉', '✨', '🧦', '✅', '🥳', '⭐', '🎊', '💥', '🏆', '🙌', '🔑', '🎉', '✨', '💫'];

/** A one-shot explosion of emoji around the parent (which must be `relative`). */
export function EmojiBurst({ seed }: { seed: number }) {
  const particles = useMemo(
    () =>
      BURST.map((emoji, i) => {
        const angle = (i / BURST.length) * Math.PI * 2 + (seed % 7) * 0.3;
        const distance = 110 + ((i * 37 + seed) % 90);
        return {
          emoji,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance * 0.75 - 30,
          rotate: ((i * 53 + seed) % 120) - 60,
          delay: (i % 4) * 0.03,
        };
      }),
    [seed],
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
    >
      {particles.map((p, i) => (
        <m.span
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, never-reordered list
          key={i}
          className="absolute text-3xl"
          initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 1.2, opacity: 0, rotate: p.rotate }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1], delay: p.delay }}
        >
          {p.emoji}
        </m.span>
      ))}
    </div>
  );
}

/** Full-screen "BRO. 💀" flash for when your stuff is not where it should be. */
export function PlotTwist({ show, text = 'BRO. 💀' }: { show: boolean; text?: string }) {
  return createPortal(
    <AnimatePresence>
      {show && (
        <m.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            background:
              'radial-gradient(circle at center, rgb(255 77 77 / 0.35) 0%, rgb(20 10 15 / 0.85) 70%)',
          }}
        >
          <m.div
            initial={{ scale: 0.3, rotate: -18 }}
            animate={{ scale: 1, rotate: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 12 }}
            className="sticker bg-red px-6 py-4 text-center text-on-accent"
          >
            <span className="block text-5xl font-extrabold tracking-tight sm:text-7xl">{text}</span>
            <span className="mt-1 block font-marker text-xl">plot twist</span>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
