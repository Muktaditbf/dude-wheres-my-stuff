/** A small "where is it now?" input that suggests places you've used before. */
import { Check } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { suggestPlaces } from '../search/search';
import { Button, Chip } from './ui';

export function PlaceInput({
  label,
  placeholder = 'e.g. in the top drawer',
  knownPlaces,
  submitLabel = 'Save',
  onSubmit,
  autoFocus,
}: {
  label: string;
  placeholder?: string;
  knownPlaces: string[];
  submitLabel?: string;
  onSubmit: (place: string) => void | Promise<void>;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const id = useId();
  const suggestions = useMemo(() => suggestPlaces(value, knownPlaces, 3), [value, knownPlaces]);

  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) void onSubmit(value.trim());
      }}
    >
      <label htmlFor={id} className="mb-1.5 block text-sm font-extrabold">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          // biome-ignore lint/a11y/noAutofocus: only used right after the user asked to type a place
          autoFocus={autoFocus}
          autoComplete="off"
          className="sticker-sm min-w-0 flex-1 bg-surface px-3 py-2 text-base font-semibold placeholder:text-muted/70 focus:outline-none focus-visible:outline-dashed"
        />
        <Button
          type="submit"
          tone="lime"
          icon={<Check size={18} strokeWidth={3} aria-hidden="true" />}
        >
          {submitLabel}
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((place) => (
            <Chip key={place} onClick={() => setValue(place)}>
              📍 {place}
            </Chip>
          ))}
        </div>
      )}
    </form>
  );
}
