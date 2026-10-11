/**
 * The one input that does everything. A live preview chip shows how the
 * sentence was understood before you press Enter.
 */
import { ArrowRight, Camera, Check, Mic, MicOff, PackagePlus, Search, X } from 'lucide-react';
import { type RefObject, useMemo } from 'react';
import { useBlobUrl } from '../lib/hooks';
import { type Intent, parseInput } from '../lib/parser';
import { placePhrase } from '../lib/personality';
import { useSpeech } from '../lib/speech';
import { suggestPlaces } from '../search/search';
import { Chip, cn } from './ui';

function preview(
  intent: Intent,
): { tone: 'yellow' | 'cyan' | 'purple' | 'lime' | 'orange'; text: string } | null {
  switch (intent.kind) {
    case 'empty':
      return null;
    case 'stash':
      return {
        tone: 'yellow',
        text: `📦 ${intent.found ? 'Found & stashing' : 'Stashing'}: ${intent.items.join(' + ')} → ${intent.place}`,
      };
    case 'find':
      return { tone: 'cyan', text: `🔍 Looking for: ${intent.item}` };
    case 'whatsIn':
      return { tone: 'purple', text: `🗄️ What's ${intent.place}` };
    case 'found':
      return { tone: 'lime', text: `✅ Marking as found: ${intent.item}` };
    case 'unknown':
      return {
        tone: 'orange',
        text:
          intent.reason === 'noPlace'
            ? '🤔 Where though? Add a place: in / on / under…'
            : intent.reason === 'tooLong'
              ? '🤔 That is a long one. Keep it short and sweet.'
              : '🤔 Try “thing in place” or “where’s my thing?”',
      };
  }
}

function submitLook(intent: Intent) {
  switch (intent.kind) {
    case 'stash':
      return { label: 'Stash it', icon: PackagePlus, tone: 'bg-yellow' };
    case 'find':
      return { label: 'Find it', icon: Search, tone: 'bg-cyan' };
    case 'whatsIn':
      return { label: 'Look', icon: Search, tone: 'bg-purple' };
    case 'found':
      return { label: 'Found!', icon: Check, tone: 'bg-lime' };
    default:
      return { label: 'Go', icon: ArrowRight, tone: 'bg-pink' };
  }
}

interface OmniboxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  photo: Blob | null;
  onPhoto: (photo: Blob | null) => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  knownPlaces: string[];
  busy?: boolean;
  onVoiceError: (message: string) => void;
}

export function Omnibox({
  value,
  onChange,
  onSubmit,
  photo,
  onPhoto,
  placeholder,
  inputRef,
  knownPlaces,
  busy,
  onVoiceError,
}: OmniboxProps) {
  const intent = useMemo(() => parseInput(value), [value]);
  const chip = preview(intent);
  const look = submitLook(intent);
  const photoUrl = useBlobUrl(photo);
  const speech = useSpeech({
    onInterim: onChange,
    onFinal: (text) => {
      onChange(text);
      if (text) onSubmit(text);
    },
    onError: onVoiceError,
  });

  const suggestions = useMemo(() => {
    if (intent.kind !== 'stash') return [];
    return suggestPlaces(intent.place, knownPlaces, 3).filter((p) => p !== intent.place);
  }, [intent, knownPlaces]);

  const SubmitIcon = look.icon;

  return (
    <div>
      <form
        className="sticker flex items-center gap-1.5 bg-surface p-1.5 focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-ink focus-within:outline-dashed sm:gap-2 sm:p-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && value.trim()) onSubmit(value);
        }}
      >
        <label htmlFor="omnibox" className="sr-only">
          Tell me where you put something, or ask me where it is
        </label>
        <input
          ref={inputRef}
          id="omnibox"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onChange('');
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-describedby="omnibox-preview"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-lg font-semibold placeholder:font-medium placeholder:text-muted/75 focus:outline-none sm:text-xl"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            aria-label={speech.listening ? 'Stop listening' : 'Say it out loud'}
            aria-pressed={speech.listening}
            className={cn(
              'sticker-sm press grid size-11 shrink-0 place-items-center',
              speech.listening ? 'animate-pulse bg-red text-on-accent' : 'bg-surface',
            )}
          >
            {speech.listening ? (
              <MicOff size={20} strokeWidth={2.5} />
            ) : (
              <Mic size={20} strokeWidth={2.5} />
            )}
          </button>
        )}
        <label
          className={cn(
            'sticker-sm press grid size-11 shrink-0 cursor-pointer place-items-center focus-within:outline-dashed',
            photo ? 'bg-lime text-on-accent' : 'bg-surface',
          )}
          title="Add an evidence photo"
        >
          <span className="sr-only">Add an evidence photo</span>
          <Camera size={20} strokeWidth={2.5} aria-hidden="true" />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPhoto(file);
              event.target.value = '';
            }}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className={cn(
            'sticker-sm press flex h-11 shrink-0 items-center gap-1.5 px-3 font-extrabold text-on-accent sm:px-4',
            look.tone,
          )}
        >
          <SubmitIcon size={20} strokeWidth={2.75} aria-hidden="true" />
          <span className="hidden sm:inline">{look.label}</span>
          <span className="sr-only sm:hidden">{look.label}</span>
        </button>
      </form>

      <div id="omnibox-preview" className="mt-3 flex min-h-9 flex-wrap items-center gap-2">
        {chip && (
          <Chip tone={chip.tone} className="max-w-full">
            <span className="truncate">{chip.text}</span>
          </Chip>
        )}
        {photo && (
          <span className="sticker-sm inline-flex items-center gap-2 bg-surface py-1 pr-1 pl-1 text-sm font-bold">
            {photoUrl && (
              <img
                src={photoUrl}
                alt=""
                className="size-7 rounded-md border-2 border-line object-cover"
              />
            )}
            Evidence attached
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onPhoto(null)}
              className="grid size-7 place-items-center rounded-md hover:bg-surface-2"
            >
              <X size={16} strokeWidth={3} />
            </button>
          </span>
        )}
      </div>

      {suggestions.length > 0 && intent.kind === 'stash' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-muted uppercase">Same spot as before?</span>
          {suggestions.map((place) => (
            <Chip
              key={place}
              onClick={() =>
                onChange(
                  `${intent.items.join(' and ')}${placePhrase(place) === place ? ' ' : ' → '}${place}`,
                )
              }
            >
              📍 {place}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
