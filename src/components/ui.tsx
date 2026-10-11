/** Small building blocks with the sticker look. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type Tone = 'pink' | 'yellow' | 'lime' | 'cyan' | 'orange' | 'purple' | 'plain' | 'danger';

const TONES: Record<Tone, string> = {
  pink: 'bg-pink text-on-accent',
  yellow: 'bg-yellow text-on-accent',
  lime: 'bg-lime text-on-accent',
  cyan: 'bg-cyan text-on-accent',
  orange: 'bg-orange text-on-accent',
  purple: 'bg-purple text-on-accent',
  plain: 'bg-surface text-ink',
  danger: 'bg-red text-on-accent',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export function Button({
  tone = 'plain',
  size = 'md',
  icon,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'sticker-sm press inline-flex items-center justify-center gap-2 font-extrabold select-none',
        size === 'sm' && 'min-h-9 px-3 text-sm',
        size === 'md' && 'min-h-11 px-4 text-base',
        size === 'lg' && 'min-h-14 px-5 text-lg',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Tape({
  children,
  tone = 'yellow',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cn('tape', TONES[tone], className)}>{children}</span>;
}

export function Chip({
  children,
  tone = 'plain',
  className,
  onClick,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const classes = cn(
    'sticker-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold',
    TONES[tone],
    onClick && 'press',
    className,
  );
  return onClick ? (
    <button type="button" className={classes} onClick={onClick} title={title}>
      {children}
    </button>
  ) : (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border-2 border-line px-2 py-0.5 text-[0.7rem] font-extrabold tracking-wide uppercase',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  highlight,
  tone = 'yellow',
  subtitle,
}: {
  title: string;
  highlight: string;
  tone?: Tone;
  subtitle?: ReactNode;
}) {
  return (
    <header className="mt-2 mb-6">
      <h1 className="text-4xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-5xl">
        {title}{' '}
        <span className={cn('sticker-sm inline-block -rotate-2 px-2', TONES[tone])}>
          {highlight}
        </span>
      </h1>
      {subtitle && <p className="mt-3 text-lg font-medium text-muted">{subtitle}</p>}
    </header>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="sticker-sm inline-flex bg-surface p-1">
      {options.map((option) => (
        // biome-ignore lint/a11y/useSemanticElements: a styled radio group reads better than native radios here
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-9 rounded-[0.55rem] px-3 text-sm font-extrabold transition-colors',
            value === option.value ? 'bg-ink text-bg' : 'text-ink hover:bg-surface-2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-extrabold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border-[2.5px] border-line transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-focus-visible:outline-dashed',
          checked ? 'bg-lime' : 'bg-surface-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5.5 w-5.5 rounded-full border-[2.5px] border-line bg-surface transition-[left]',
            checked ? 'left-[calc(100%-1.6rem)]' : 'left-0.5',
          )}
        />
      </span>
    </label>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="sticker bg-surface-2 p-5 text-center font-marker text-lg text-muted">
      {children}
    </p>
  );
}
