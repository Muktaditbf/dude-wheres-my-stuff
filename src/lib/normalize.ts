/**
 * Text normalization shared by the parser, the search and the database.
 *
 * "My Keys", "the keys" and "keys" must all point at the same thing, otherwise
 * the app would happily track three different sets of keys. Everything here is
 * pure and synchronous so it is easy to unit-test.
 */

/** Words that can sit in front of an item or place without changing what it is. */
const FILLER = new Set([
  'a',
  'an',
  'the',
  'my',
  'our',
  'your',
  'his',
  'her',
  'their',
  'its',
  'this',
  'that',
  'these',
  'those',
  'some',
  'both',
  'all',
  'me',
]);

/** Words that look plural but are the normal way to name a single thing. */
const NO_SINGULAR = new Set([
  'glasses',
  'sunglasses',
  'eyeglasses',
  'headphones',
  'earphones',
  'scissors',
  'pants',
  'jeans',
  'shorts',
  'trousers',
  'tights',
  'leggings',
  'pajamas',
  'pyjamas',
  'tongs',
  'pliers',
  'tweezers',
  'binoculars',
  'goggles',
  'clothes',
  'news',
  'series',
  'species',
  'chess',
  'canvas',
  'atlas',
  'christmas',
  'overalls',
  'briefs',
  'boxers',
  'suspenders',
  'earmuffs',
  'mathematics',
  'physics',
  'economics',
  'chaos',
]);

const IRREGULAR: Record<string, string> = {
  mice: 'mouse',
  children: 'child',
  teeth: 'tooth',
  feet: 'foot',
  geese: 'goose',
  people: 'person',
  men: 'man',
  women: 'woman',
  knives: 'knife',
  wives: 'wife',
  lives: 'life',
  scarves: 'scarf',
  shelves: 'shelf',
  leaves: 'leaf',
  halves: 'half',
  loaves: 'loaf',
  wolves: 'wolf',
  thieves: 'thief',
  shoes: 'shoe',
  toes: 'toe',
  potatoes: 'potato',
  tomatoes: 'tomato',
  heroes: 'hero',
  lenses: 'lens',
  buses: 'bus',
};

/** Singular forms that end in "ie", so "cookies" becomes "cookie" and not "cooky". */
const IE_WORDS = new Set([
  'cookie',
  'movie',
  'hoodie',
  'selfie',
  'zombie',
  'brownie',
  'smoothie',
  'rookie',
  'calorie',
  'beanie',
  'onesie',
  'tie',
  'pie',
  'goalie',
  'bootie',
  'nightie',
  'necktie',
  'bowtie',
  'freebie',
  'birdie',
  'magpie',
  'auntie',
  'walkie-talkie',
]);

/** Singular forms that end in "che", so "caches" becomes "cache" and not "cach". */
const CHE_WORDS = new Set(['cache', 'niche', 'headache', 'moustache', 'mustache', 'quiche']);

export function singularize(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3 || NO_SINGULAR.has(w)) return w;
  const irregular = IRREGULAR[w];
  if (irregular) return irregular;
  if (IE_WORDS.has(w.slice(0, -1)) || CHE_WORDS.has(w.slice(0, -1))) return w.slice(0, -1);
  if (/(ss|us|is)$/.test(w)) return w;
  if (/[^aeiou]ies$/.test(w) && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(x|ch|sh|zz|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}

/** Straightens curly quotes and dashes that phones love to insert. */
export function straighten(text: string): string {
  return text
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—]/g, '-');
}

/** Trims, collapses whitespace and removes wrapping quotes and trailing punctuation. */
export function cleanPhrase(text: string): string {
  return straighten(text)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s.,;:!?]+$/u, '')
    .replace(/^[\s.,;:!?-]+/u, '')
    .trim();
}

/** Drops leading filler words ("all my", "the") while keeping the original casing. */
export function stripLeadingFiller(text: string): string {
  const words = text.split(' ');
  while (words.length > 1 && FILLER.has((words[0] ?? '').toLowerCase())) words.shift();
  return words.join(' ');
}

/** Human-friendly name: cleaned, no leading filler, original casing kept. */
export function displayName(text: string): string {
  return stripLeadingFiller(cleanPhrase(text));
}

/** Lowercase words with punctuation removed (apostrophes and hyphens inside words survive). */
export function words(text: string): string[] {
  return straighten(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\- ]+/gu, ' ')
    .replace(/(^|\s)['-]+|['-]+(\s|$)/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/**
 * The identity of an item. Two names with the same key are the same thing:
 * "My Keys" → "key", "the TV remotes" → "tv remote".
 */
export function itemKey(name: string): string {
  const list = words(name);
  while (list.length > 1 && FILLER.has(list[0] ?? '')) list.shift();
  const last = list.length - 1;
  if (last >= 0) list[last] = singularize(list[last] ?? '');
  return list.join(' ');
}

/** Prepositions that can start or split a place description, longest first. */
export const PLACE_PREPOSITIONS = [
  'on top of',
  'in front of',
  'in between',
  'inside of',
  'next to',
  'close to',
  'underneath',
  'beneath',
  'between',
  'behind',
  'beside',
  'inside',
  'under',
  'into',
  'onto',
  'near',
  'with',
  'in',
  'on',
  'at',
  'by',
] as const;

const LEADING_PLACE_WORDS = new Set([
  ...FILLER,
  'up',
  'down',
  'over',
  'out',
  'back',
  'right',
  'just',
]);
const SPLIT_PREPOSITIONS = new Set(['in', 'on', 'under', 'inside', 'behind', 'near', 'at', 'by']);

/**
 * The "container" a place is about, used to group stuff that lives together:
 * "in the black bag, top shelf" → "black bag", "under the beds" → "bed".
 */
export function placeKey(place: string): string {
  const firstPart = straighten(place).split(/[,;(]/)[0] ?? '';
  let list = words(firstPart);

  // Drop leading prepositions and filler: "up in the attic" → "attic".
  let changed = true;
  while (changed && list.length > 1) {
    changed = false;
    for (const prep of PLACE_PREPOSITIONS) {
      const prepWords = prep.split(' ');
      if (prepWords.every((w, i) => list[i] === w) && list.length > prepWords.length) {
        list = list.slice(prepWords.length);
        changed = true;
        break;
      }
    }
    while (list.length > 1 && LEADING_PLACE_WORDS.has(list[0] ?? '')) {
      list = list.slice(1);
      changed = true;
    }
  }

  // Keep only the main container: "black bag on the top shelf" → "black bag".
  const cut = list.findIndex((w, i) => i > 0 && SPLIT_PREPOSITIONS.has(w));
  if (cut > 0) list = list.slice(0, cut);

  const last = list.length - 1;
  if (last >= 0) list[last] = singularize(list[last] ?? '');
  return list.join(' ');
}

/** Capitalizes the first letter and leaves the rest alone. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
