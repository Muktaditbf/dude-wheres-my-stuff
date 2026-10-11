/**
 * Lefty: the left sock that always went missing and finally came back.
 * Googly eyes follow the pointer; the face changes with the mood.
 */
import { m } from 'motion/react';
import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from 'react';

export type Mood =
  | 'chill'
  | 'happy'
  | 'smug'
  | 'thinking'
  | 'party'
  | 'shocked'
  | 'sad'
  | 'confused';

const BODY =
  'M38 30 L90 30 L90 98 C90 124 74 138 52 138 L24 138 C10 138 4 130 4 119 C4 107 13 100 25 100 L31 100 C35 100 38 97 38 93 Z';
const EYES = [
  { cx: 52, cy: 56 },
  { cx: 76, cy: 56 },
];
const INK = 'var(--line)';
const MAX_LOOK = 4.4;

const MOUTHS: Record<Mood, ReactNode> = {
  chill: (
    <path
      d="M56 78 Q64 86 72 78"
      fill="none"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  ),
  happy: (
    <g>
      <path
        d="M54 75 Q64 92 74 75 Z"
        fill={INK}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="64" cy="84" rx="4.5" ry="2.6" fill="var(--pink)" />
    </g>
  ),
  smug: (
    <path
      d="M56 81 Q67 85 75 75"
      fill="none"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  ),
  thinking: (
    <path d="M57 82 L71 79" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
  ),
  party: (
    <g>
      <path
        d="M52 74 Q64 96 76 74 Z"
        fill={INK}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="64" cy="86" rx="5" ry="3" fill="var(--pink)" />
    </g>
  ),
  shocked: <ellipse cx="64" cy="83" rx="5.5" ry="7.5" fill={INK} />,
  sad: (
    <path
      d="M56 86 Q64 77 72 86"
      fill="none"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  ),
  confused: (
    <path
      d="M54 82 q3 -4 6 0 t6 0 t6 0"
      fill="none"
      stroke={INK}
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  ),
};

const BROWS: Partial<Record<Mood, ReactNode>> = {
  smug: (
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
      <path d="M44 42 Q51 36 59 41" />
      <path d="M69 44 L84 44" />
    </g>
  ),
  thinking: (
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
      <path d="M45 43 L59 43" />
      <path d="M69 41 Q76 35 84 40" />
    </g>
  ),
  shocked: (
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
      <path d="M44 39 Q51 33 58 38" />
      <path d="M70 38 Q77 33 84 39" />
    </g>
  ),
  sad: (
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
      <path d="M45 41 L58 45" />
      <path d="M70 45 L83 41" />
    </g>
  ),
  confused: (
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
      <path d="M45 44 L58 41" />
      <path d="M70 40 Q77 36 84 41" />
    </g>
  ),
};

/** Fixed pupil offsets for moods that override pointer tracking. */
const FIXED_LOOK: Partial<Record<Mood, [number, number]>> = {
  thinking: [3, -4],
  smug: [3.5, 0.5],
  sad: [0, 3.5],
  confused: [-3, -2],
};

function useLook(ref: RefObject<SVGSVGElement | null>) {
  const [look, setLook] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height * 0.38);
        const distance = Math.hypot(dx, dy) || 1;
        const strength = Math.min(1, distance / 160);
        setLook([(dx / distance) * MAX_LOOK * strength, (dy / distance) * MAX_LOOK * strength]);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, [ref]);
  return look;
}

interface LeftyProps {
  mood?: Mood;
  size?: number;
  className?: string;
  /** Bob up and down. */
  idle?: boolean;
  title?: string;
}

export function Lefty({ mood = 'chill', size = 96, className, idle = true, title }: LeftyProps) {
  const ref = useRef<SVGSVGElement>(null);
  const tracked = useLook(ref);
  const [lx, ly] = FIXED_LOOK[mood] ?? tracked;
  const id = useId().replace(/:/g, '');
  const pupil = mood === 'shocked' ? 3 : 4.6;
  const closedEyes = mood === 'party' || mood === 'happy';

  return (
    <m.svg
      ref={ref}
      viewBox="0 0 120 150"
      width={size}
      height={(size * 150) / 120}
      className={className}
      // An empty title means "decorative": hide it from screen readers.
      role={title === '' ? undefined : 'img'}
      aria-hidden={title === '' ? true : undefined}
      aria-label={title === '' ? undefined : (title ?? `Lefty the sock, looking ${mood}`)}
      animate={
        idle
          ? mood === 'party'
            ? { y: [0, -10, 0], rotate: [0, -6, 6, 0] }
            : mood === 'shocked'
              ? { x: [0, -3, 3, -2, 2, 0] }
              : { y: [0, -4, 0] }
          : undefined
      }
      transition={
        mood === 'shocked'
          ? { duration: 0.45 }
          : {
              duration: mood === 'party' ? 0.7 : 2.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }
      }
    >
      <defs>
        <clipPath id={`body-${id}`}>
          <path d={BODY} />
        </clipPath>
        <clipPath id={`cuff-${id}`}>
          <rect x="34" y="6" width="60" height="28" rx="9" />
        </clipPath>
      </defs>

      {/* Body, heel and toe */}
      <path d={BODY} fill="var(--sock)" />
      <g clipPath={`url(#body-${id})`}>
        <circle cx="88" cy="134" r="23" fill="var(--pink)" />
        <circle cx="8" cy="121" r="20" fill="var(--pink)" />
      </g>
      <path d={BODY} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />

      {/* Striped cuff */}
      <rect x="34" y="6" width="60" height="28" rx="9" fill="var(--yellow)" />
      <g clipPath={`url(#cuff-${id})`} fill="var(--cyan)">
        <rect x="34" y="12" width="60" height="5" />
        <rect x="34" y="22" width="60" height="5" />
      </g>
      <rect x="34" y="6" width="60" height="28" rx="9" fill="none" stroke={INK} strokeWidth="4" />

      {/* Cheeks */}
      <ellipse cx="45" cy="74" rx="5" ry="3" fill="var(--pink)" opacity="0.55" />
      <ellipse cx="83" cy="74" rx="5" ry="3" fill="var(--pink)" opacity="0.55" />

      {/* Googly eyes */}
      {closedEyes ? (
        <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <path d="M45 58 Q52 49 59 58" />
          <path d="M69 58 Q76 49 83 58" />
        </g>
      ) : (
        <g className="blink">
          {EYES.map((eye) => (
            <g key={eye.cx}>
              <circle cx={eye.cx} cy={eye.cy} r="10" fill="#fff" stroke={INK} strokeWidth="3" />
              <circle cx={eye.cx + lx} cy={eye.cy + ly} r={pupil} fill="#141414" />
              <circle cx={eye.cx + lx + 1.5} cy={eye.cy + ly - 1.6} r="1.3" fill="#fff" />
            </g>
          ))}
        </g>
      )}
      {BROWS[mood]}
      {MOUTHS[mood]}

      {mood === 'sad' && (
        <path d="M43 66 q-3 6 0 8 q3 -2 0 -8 z" fill="var(--cyan)" stroke={INK} strokeWidth="1.5" />
      )}
      {mood === 'confused' && (
        <text
          x="96"
          y="30"
          fontSize="26"
          fontWeight="800"
          fill={INK}
          fontFamily="var(--font-display)"
        >
          ?
        </text>
      )}
    </m.svg>
  );
}
