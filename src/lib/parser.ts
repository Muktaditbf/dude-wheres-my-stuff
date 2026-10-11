/**
 * Turns whatever the user typed (or said) into an intent.
 *
 * It is a rule-based parser on purpose: it runs offline, never sends your
 * stuff anywhere, answers instantly and behaves the same way every time,
 * which makes it easy to test. The live preview chip in the UI shows how a
 * sentence was understood before it is saved, so mistakes are caught early.
 */
import { cleanPhrase, displayName, PLACE_PREPOSITIONS, straighten } from './normalize';

export type Intent =
  | { kind: 'empty' }
  | { kind: 'stash'; items: string[]; place: string; lent?: boolean; found?: boolean }
  | { kind: 'find'; item: string }
  | { kind: 'whatsIn'; place: string }
  | { kind: 'found'; item: string }
  | { kind: 'unknown'; text: string; reason: 'noPlace' | 'tooLong' | 'confused' };

export const MAX_ITEM_LENGTH = 80;
export const MAX_PLACE_LENGTH = 160;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LEADING_NOISE =
  /^(?:(?:hey|yo|ok|okay|so|um+|uh+|dude|bro|bruh|man|please|pls|plz|lol|omg|ugh|hmm+|alright)\b[\s,!.]*)+/i;
const TRAILING_NOISE =
  /(?:[\s,]+(?:dude|bro|bruh|please|pls|plz|lol|lmao|again|now|rn|asap|thanks|thx|ty|ok|okay|haha|xd))+$/i;

/** Lead-in verbs for stashing. "lent"/"gave" mean someone else has it now. */
const LEAD_IN = new RegExp(
  "^(?:(?:i|we)(?:'ve|'d|\\s+have|\\s+had|\\s+just|\\s+also|\\s+finally)*\\s+)?" +
    '(?:just\\s+|also\\s+|finally\\s+)?' +
    '(remember(?:\\s+that)?|note(?:\\s+that)?|fyi|reminder|' +
    'put|placed|place|left|leave|kept|keep|stashed|stash|hid|hide|hidden|stored|store|dropped|drop|' +
    'threw|throw|tossed|toss|parked|park|shoved|shove|stuck|stick|packed|pack|filed|file|saved|save|' +
    'leaving|putting|hiding|storing|placing|keeping|' +
    'moved|move|took|take|brought|bring|sent|send|returned|return|' +
    'lent|lend|loaned|loan|gave|give)\\b:?\\s+',
  'i',
);
const MOVE_VERBS = new Set([
  'moved',
  'move',
  'took',
  'take',
  'brought',
  'bring',
  'sent',
  'send',
  'returned',
  'return',
]);
const LEND_VERBS = new Set(['lent', 'lend', 'loaned', 'loan', 'gave', 'give']);

/** "keys are in…", "passport's in…", "glasses live on…" */
const TRAILING_COPULA =
  /(?:'s|\s+(?:is|are|was|were|will be|is now|are now|should be|stays?|lives?|goes|go|belongs?|sits?|hangs?|is kept|are kept|is stored|are stored|is hidden|are hidden|is sitting|are sitting|is hiding|are hiding|went|got put|ended up|is staying|are staying))$/i;
const TRAILING_PARTICLES = /(?:\s+(?:up|down|over|out|back|away|right|just|somewhere|safely))+$/i;

/** Explicit "item → place" arrows always win. */
const STRONG_SEPARATOR = /\s*(?:->|→|=>|⇒|➡️?|=|\|)\s*/u;
/** A colon or spaced dash only counts when no place word came first. "5:30" is not a separator. */
const WEAK_SEPARATOR = /\s*(?<!\d):(?!\d)\s*|\s+-\s+/;
const ITEM_LIST_SEPARATOR = /\s*(?:,|&|\+|\band\b|\bplus\b)\s*/i;

function prepositionPattern(extra: string[] = []): RegExp {
  const all = [...PLACE_PREPOSITIONS, ...extra].sort((a, b) => b.length - a.length);
  return new RegExp(`\\s(${all.map(escapeRegExp).join('|')})\\s+(?=\\S)`, 'i');
}
const PREPOSITION = prepositionPattern();
const PREPOSITION_WITH_TO = prepositionPattern(['to']);
const ENDS_WITH_PREPOSITION = new RegExp(
  `\\s(?:${[...PLACE_PREPOSITIONS, 'to'].map(escapeRegExp).join('|')})$`,
  'i',
);

/** Common typos of "where" at the start of a question. */
const WHERE_TYPOS = /^(?:wher|whre|wehre|whee?re)(?='|s\b|\s)/i;

const FIND_PATTERNS: RegExp[] = [
  /^where\s+(?:(?:is|are|was|were)\s+)?(?:did|do|does|have|has|had)\s+(?:i|we|you)\s+(?:put|leave|left|keep|kept|stash|stashed|hide|hid|hidden|store|stored|drop|dropped|park|parked|place|placed|lose|lost|throw|threw|toss|tossed|shove|shoved)\s+(.+)$/i,
  /^where\s+(?:did|do|does|have|has)\s+(.+?)\s+(?:go|gone|went|end up|ended up|disappear|disappeared|vanish|vanished|get to|got to)(?:\s+to)?$/i,
  /^where\s+(?:the\s+)?(?:heck|hell|f+|fudge|frick|on earth|in the world|tf)\s+(?:(?:is|are|was|were)\s+|did\s+(?:i|we)\s+(?:put|leave)\s+)(.+)$/i,
  /^where(?:'s|s|\s+is|\s+are|'re|\s+r|\s+was|\s+were)\s+(.+?)(?:\s+(?:at|now|hiding|gone|kept|stored))?$/i,
  /^where\s+(.+?)\s+at$/i,
  /^(?:have|has)\s+(?:you|anyone|anybody|somebody|someone)\s+seen\s+(.+)$/i,
  /^(?:did|do)\s+(?:you|anyone|i)\s+see\s+(.+)$/i,
  /^(?:i\s+)?(?:can'?t|cannot|can not|couldn'?t)\s+find\s+(.+)$/i,
  /^(?:help\s+(?:me\s+)?find|find|locate|search(?:\s+for)?|look(?:ing)?\s+for|seek)\s+(?:me\s+)?(.+)$/i,
  /^who(?:'s\s+got|\s+has|\s+took|\s+borrowed|\s+got|\s+stole)\s+(.+)$/i,
];
const LOST_PATTERN = /^(?:i\s+)?(?:(?:just|totally|completely)\s+)?(?:lost|misplaced)\s+(.+)$/i;
const IS_IT_IN_PATTERN = /^(?:is|are)\s+(.+)$/i;
const WHATS_IN_START =
  /^(?:what(?:'s|s|\s+is|\s+was|\s+are|'re)?|show(?:\s+me)?|list|anything|is\s+there\s+anything|what\s+do\s+i\s+have|what\s+have\s+i\s+got)\b/i;
const FOUND_PATTERN = /^(?:i\s+)?(?:finally\s+)?(?:found|located|recovered|retrieved)\s+(.+)$/i;
const BORROWED_PATTERN = /^(\S+(?:\s+\S+)?)\s+borrowed\s+(.+)$/i;

const hasContent = (s: string) => /[\p{L}\p{N}]/u.test(s);

function tidy(raw: string): string {
  return straighten(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["`]+|["`]+$/g, '')
    .replace(/^'(.*)'$/, '$1')
    .trim();
}

function stripNoise(text: string): string {
  return text.replace(LEADING_NOISE, '').replace(TRAILING_NOISE, '').trim();
}

/** Splits "passport, wallet and keys" into separate items. */
function splitItems(text: string): string[] {
  return text
    .split(ITEM_LIST_SEPARATOR)
    .map((part) => displayName(part.replace(TRAILING_COPULA, '')))
    .filter(hasContent);
}

function cleanItem(text: string): string {
  return displayName(text.replace(TRAILING_COPULA, ''));
}

interface Split {
  itemPart: string;
  place: string;
}

/** Splits "keys up in the attic" into "keys" and "up in the attic". */
function splitAtPreposition(text: string, pattern: RegExp): Split | null {
  const match = pattern.exec(text);
  if (!match || match.index === 0) return null;
  let itemPart = text.slice(0, match.index).trim();
  let place = text.slice(match.index).trim();
  itemPart = itemPart.replace(TRAILING_COPULA, '');
  const particles = TRAILING_PARTICLES.exec(itemPart);
  if (particles) {
    place = `${particles[0].trim()} ${place}`;
    itemPart = itemPart.slice(0, particles.index).trim();
  }
  itemPart = itemPart.replace(TRAILING_COPULA, '').trim();
  if (!hasContent(itemPart)) return null;
  return { itemPart, place: cleanPhrase(place) };
}

function stashIntent(
  items: string[],
  place: string,
  extra: { lent?: boolean; found?: boolean } = {},
): Intent {
  if (items.length === 0 || !hasContent(place))
    return { kind: 'unknown', text: items.join(', '), reason: 'noPlace' };
  if (items.some((i) => i.length > MAX_ITEM_LENGTH) || place.length > MAX_PLACE_LENGTH) {
    return { kind: 'unknown', text: items.join(', '), reason: 'tooLong' };
  }
  return { kind: 'stash', items, place, ...extra };
}

function parseStash(text: string, opts: { found?: boolean } = {}): Intent | null {
  let body = text;
  let verb = '';
  const lead = LEAD_IN.exec(body);
  if (lead) {
    verb = (lead[1] ?? '').toLowerCase();
    body = body.slice(lead[0].length).trim();
  }

  // "Rafi borrowed my drill"
  const borrowed = BORROWED_PATTERN.exec(body);
  if (!lead && borrowed?.[1] && borrowed[2]) {
    return stashIntent(splitItems(borrowed[2]), `with ${displayName(borrowed[1])}`, { lent: true });
  }

  // "keys → blue drawer", "keys: kitchen counter"
  const preposition = MOVE_VERBS.has(verb) ? PREPOSITION_WITH_TO : PREPOSITION;
  const firstPreposition = preposition.exec(body)?.index ?? Number.POSITIVE_INFINITY;
  const strong = STRONG_SEPARATOR.exec(body);
  const weak = WEAK_SEPARATOR.exec(body);
  const separator =
    strong && strong.index > 0
      ? strong
      : weak && weak.index > 0 && weak.index < firstPreposition
        ? weak
        : null;
  if (separator) {
    const items = splitItems(body.slice(0, separator.index));
    const place = cleanPhrase(body.slice(separator.index + separator[0].length));
    return stashIntent(items, place, opts);
  }

  // "lent my drill to Rafi"
  if (LEND_VERBS.has(verb)) {
    const to = /\s(?:to|with)\s+(?=\S)/i.exec(body);
    if (to && to.index > 0) {
      const person = displayName(cleanPhrase(body.slice(to.index + to[0].length)));
      return stashIntent(splitItems(body.slice(0, to.index)), `with ${person}`, { lent: true });
    }
  }

  const split = splitAtPreposition(body, preposition);
  if (!split) return null;
  return stashIntent(splitItems(split.itemPart), split.place, opts);
}

function parseFind(text: string, hasQuestion: boolean): Intent | null {
  for (const pattern of FIND_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1] && hasContent(match[1])) return { kind: 'find', item: cleanItem(match[1]) };
  }
  const lost = LOST_PATTERN.exec(text);
  if (lost?.[1]) {
    const split = splitAtPreposition(lost[1], PREPOSITION);
    return { kind: 'find', item: cleanItem(split ? split.itemPart : lost[1]) };
  }
  if (hasQuestion) {
    const isIt = IS_IT_IN_PATTERN.exec(text);
    const split = isIt?.[1] ? splitAtPreposition(isIt[1], PREPOSITION) : null;
    if (split) return { kind: 'find', item: cleanItem(split.itemPart) };
  }
  return null;
}

function parseWhatsIn(text: string): Intent | null {
  const start = WHATS_IN_START.exec(text);
  if (!start) return null;
  const rest = ` ${text.slice(start[0].length).trim()} `;
  const match = PREPOSITION.exec(rest);
  if (!match) return null;
  const place = cleanPhrase(rest.slice(match.index));
  return hasContent(place) ? { kind: 'whatsIn', place } : null;
}

function parseFound(text: string): Intent | null {
  const match = FOUND_PATTERN.exec(text);
  if (!match?.[1]) return null;
  const stash = parseStash(match[1], { found: true });
  if (stash && stash.kind === 'stash') return stash;
  return { kind: 'found', item: cleanItem(match[1]) };
}

/**
 * Parses one line of input.
 * @param hint forces the meaning when the caller already knows it (e.g. `?q=` links).
 */
export function parseInput(raw: string, hint?: 'find' | 'stash'): Intent {
  const tidied = tidy(raw);
  if (!hasContent(tidied)) return { kind: 'empty' };

  const hasQuestion = /\?[\s!?.]*$/.test(tidied);
  const text = stripNoise(tidied.replace(/[\s?!.,;]+$/u, '')).replace(WHERE_TYPOS, 'where');
  if (!hasContent(text)) return { kind: 'empty' };

  if (hint === 'find') {
    return parseFind(text, hasQuestion) ?? { kind: 'find', item: cleanItem(text) };
  }
  if (hint === 'stash') {
    return parseStash(text) ?? { kind: 'unknown', text: cleanItem(text), reason: 'noPlace' };
  }

  const whatsIn = parseWhatsIn(text);
  if (whatsIn) return whatsIn;

  const find = parseFind(text, hasQuestion);
  if (find) return find;

  const found = parseFound(text);
  if (found) return found;

  const stash = parseStash(text);
  if (stash) {
    // "keys in the drawer?" is a question, not a new report.
    if (hasQuestion && stash.kind === 'stash' && stash.items[0]) {
      return { kind: 'find', item: stash.items[0] };
    }
    return stash;
  }

  if (ENDS_WITH_PREPOSITION.test(text)) {
    return {
      kind: 'unknown',
      text: cleanItem(text.replace(ENDS_WITH_PREPOSITION, '')),
      reason: 'noPlace',
    };
  }

  const wordCount = text.split(' ').length;
  if (hasQuestion || wordCount <= 5) return { kind: 'find', item: cleanItem(text) };
  return { kind: 'unknown', text, reason: 'confused' };
}

/** Words that refer back to whatever was searched last ("found it!"). */
export const PRONOUNS = new Set(['it', 'them', 'that', 'this', 'those', 'these', 'em', "'em"]);
