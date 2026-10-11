/**
 * Everything Lefty says.
 *
 * Want to add a roast? Add a line to the right situation and level, keep it
 * about forgetting things (never about the person), and keep it short enough
 * to read in one breath. Placeholders in {curly braces} are filled in at
 * runtime; the test suite checks that only known placeholders are used.
 *
 *   {item}      what was stashed or searched ("Passport")
 *   {place}     where it is, as a phrase ("in the black bag")
 *   {spot}      the short name of the place ("black bag")
 *   {prev}      where it was before, as a phrase
 *   {prevSpot}  short name of where it was before
 *   {ago}       "3 days ago"      {since}  "3 days"
 *   {count}     how many times    {ordinal} "4th"
 *   {time}      clock time ("2:14 AM")
 *   {n}         number of things  {person} who borrowed it
 *   {query}     what was searched {text}   what was typed
 */
import type { RoastLevel } from './settings';

export const SITUATIONS = [
  'greeting',
  'greetingWithStuff',
  'stashNew',
  'stashMoved',
  'stashSame',
  'stashMany',
  'stashLent',
  'stashFound',
  'findFirst',
  'findAgain',
  'findOften',
  'findLegend',
  'findOld',
  'findMissing',
  'findLent',
  'findNight',
  'findSock',
  'findUnknown',
  'findCar',
  'found',
  'notThere',
  'stillThere',
  'whatsIn',
  'whatsInEmpty',
  'needPlace',
  'confused',
  'undo',
  'deleted',
] as const;

export type Situation = (typeof SITUATIONS)[number];

export const PLACEHOLDERS = [
  'item',
  'place',
  'spot',
  'prev',
  'prevSpot',
  'ago',
  'since',
  'count',
  'ordinal',
  'time',
  'n',
  'person',
  'query',
  'text',
] as const;

export const ROASTS: Record<Situation, Partial<Record<RoastLevel, string[]>>> = {
  greeting: {
    chill: ['Tell me where you put something, or ask me where it is.'],
    bro: [
      "Yo! I'm Lefty, the sock that came back. Tell me where you put stuff and I'll remember it.",
      'Put something somewhere? Tell me. Future you will be SO grateful.',
      "I remember stuff so your brain doesn't have to. Try me.",
    ],
    unhinged: [
      'I AM LEFTY. I ESCAPED THE DRYER. NOW I REMEMBER EVERYTHING.',
      'Feed me information. Where did you put your things. TELL ME.',
    ],
  },
  greetingWithStuff: {
    chill: ['Tracking {n} things for you.'],
    bro: [
      '{n} things tracked. Your brain is basically on vacation.',
      "Holding {n} secrets about where your stuff is. Ask away, I don't judge. (I judge a little.)",
      "{n} things on file. Let's see what you lose today.",
    ],
    unhinged: [
      'I KNOW WHERE {n} OF YOUR THINGS ARE. This is power. This is responsibility.',
      '{n} things. {n} locations. Zero thanks so far. Just saying.',
    ],
  },
  stashNew: {
    chill: ['Saved: {item} is {place}.', 'Got it. {item} is {place}.'],
    bro: [
      'NOTED 📝 {item} is {place}. Your brain can relax now.',
      'Locked in. {item} is {place}. Future you says thanks.',
      'Saved. Now you can forget it on purpose.',
      '{item} is {place}. Written down harder than your exam notes.',
      "Copy that. {item} is officially {place}. Don't make me remind you.",
      "Done. That's one less thing to panic about at 8 AM.",
    ],
    unhinged: [
      'IT IS WRITTEN. {item}, {place}. Carved into my database for ALL ETERNITY.',
      'Witnessed. {item} is {place}. I will defend this knowledge with my life.',
      'BREAKING NEWS: {item} spotted {place}. More at 11.',
      'Logged. {item}. {place}. The prophecy is complete.',
    ],
  },
  stashMoved: {
    chill: ['Updated: {item} is now {place} (it was {prev}).'],
    bro: [
      '{item} is now {place}. RIP {prevSpot}, you served well.',
      "{item} relocated {place}. It used to be {prev}, but sure, we're doing this.",
      "Updated. Stop moving {item} around like it's in witness protection.",
      '{item} has a new home: {place}. The {prevSpot} is heartbroken.',
    ],
    unhinged: [
      '{item} HAS MIGRATED. From {prev} to {place}. Nature is healing.',
      'Plot development: {item} is now {place}. The {prevSpot} will never be the same.',
      'Moved again. {item} has more addresses than a spy at this point.',
    ],
  },
  stashSame: {
    chill: ['Confirmed: {item} is still {place}.'],
    bro: [
      'Same spot as last time. Look at you, building habits. 👏',
      '{item} {place}. Again. Consistency icon.',
      'Back {place}, where it belongs. That is growth.',
      'Same place as always. Honestly? Proud of you.',
    ],
    unhinged: [
      "SAME SPOT. CONSISTENCY. I'm literally crying right now.",
      '{item} is back {place}. The prodigal item has come home. 😭',
      'You put it in the SAME PLACE? Who ARE you?',
    ],
  },
  stashMany: {
    chill: ['Saved {n} things {place}.'],
    bro: [
      '{n} things {place}. A whole squad. Saved.',
      'Saved all {n}. The {spot} is getting crowded, bro.',
      'Group booking: {n} items {place}. Noted.',
    ],
    unhinged: [
      "{n} ITEMS {place}?! That's not storage, that's a heist stash. Saved.",
      'Logged {n} things {place}. This is how treasure maps start.',
    ],
  },
  stashLent: {
    chill: ['Saved: {item} is {place}.'],
    bro: [
      "Noted: {item} is {place}. I'll remember who has it, even if they 'forget'.",
      '{item} is {place}. Receipts saved. 🧾',
      "Logged. If {person} ghosts you, I've got the evidence.",
    ],
    unhinged: [
      "{item} is {place}. I'm watching {person}. 👀",
      'Loan recorded. {person} now owes you one {item} and probably an explanation.',
    ],
  },
  stashFound: {
    chill: ['Found it! Saved: {item} is {place}.'],
    bro: [
      'FOUND IT. {item} was {place} the whole time. Saved for next time.',
      'W. {item}: {place}. Writing that down before it escapes again.',
    ],
    unhinged: [
      'THE LOST HAS BEEN FOUND. {item}. {place}. Remember this day.',
      'IT WAS {place} ALL ALONG?! Saved. Never again. (Again.)',
    ],
  },
  findFirst: {
    chill: ['{item} is {place}. You saved it {ago}.'],
    bro: [
      'Easy. {item} is {place}. You told me {ago}.',
      "Found it (in my notes): {place}. You're welcome.",
      "Relax, it's {place}. Been there since {ago}.",
      '{place}. You put it there {ago}. Classic.',
    ],
    unhinged: [
      'THE SEARCH IS OVER. {item}. {place}. Case closed before it even opened.',
      "I KNEW you'd ask. It's {place}. I've been waiting {since} for this moment.",
    ],
  },
  findAgain: {
    chill: ['{item} is {place}. You saved it {ago}.'],
    bro: [
      "{place}. That's the {ordinal} time you've asked. Just saying.",
      'Still {place}, bro. Same as when you asked last time.',
      "{ordinal} time asking. It's {place}. I'm starting a spreadsheet.",
      "It's {place}. Are we doing this every week now?",
    ],
    unhinged: [
      '{ordinal} TIME. {place}. Write it on your hand. Tattoo it. Anything.',
      "It's {place}. I've said this before. I'll say it again. I'll say it at your wedding.",
    ],
  },
  findOften: {
    chill: ['{item} is {place}. You saved it {ago}.'],
    bro: [
      '{place}. {count} searches now. {item} is basically a lifestyle.',
      'Bro. {place}. {count} times. Should I just glue it to you?',
      "It's {place}. At this point {item} is avoiding you.",
      '{place}. You and your {item} need couples therapy.',
    ],
    unhinged: [
      "{count} TIMES. {place}. I'm calling your mom.",
      '{place}. That is search number {count}. Scientists want to study you.',
    ],
  },
  findLegend: {
    chill: ['{item} is {place}. You saved it {ago}.'],
    bro: [
      "{place}. {ordinal} time. You've unlocked: Hall of Shame. 🏆",
      "It's {place}. {count} searches. {item} should be paying you rent.",
      "Bro... {place}. Again. {count} times. I'm not mad, I'm impressed.",
      "{place}. Honestly, at {count} searches I'd just buy a second one.",
    ],
    unhinged: [
      "{ordinal} TIME. {place}. I'm putting this on a T-shirt.",
      "{place}. {count} times. Legends say you're still looking for it to this day.",
      "It's {place}. I've answered this {count} times. I've aged. I have grey pixels now.",
    ],
  },
  findOld: {
    chill: ['{item} was saved {place}, but that was {ago}. It may have moved.'],
    bro: [
      "It's {place}... as of {ago}. Things may have migrated since then.",
      'Last seen {place}, {ago}. Archaeologists recommend checking anyway.',
    ],
    unhinged: [
      '{place}. {ago}. That info is OLD. Fossil-level. Bring a torch.',
      'According to ancient scrolls (my notes from {ago}): {place}.',
    ],
  },
  findMissing: {
    chill: ["Last time, it wasn't {place}. Its other spots are listed below."],
    bro: [
      'Still officially missing. 😬 Last known: {place}. Check the usual suspects below.',
      "This one's on the run. Last seen {place}.",
    ],
    unhinged: ['STILL. AT. LARGE. Last seen {place}. Suspects listed below.'],
  },
  findLent: {
    chill: ['{item} is {place}. You lent it {ago}.'],
    bro: [
      "{item} is {place}. Lent {ago}. Time for a 'hey, quick thing' text. 📱",
      '{person} has it. Has had it for {since}. A polite reminder is recommended.',
    ],
    unhinged: [
      "{person} has had your {item} for {since}. That's not borrowing, that's adoption.",
      '{person}. Has. Your. {item}. For {since}. Do you want me to write the text?',
    ],
  },
  findNight: {
    bro: [
      "It's {time}. Why do you need your {item} at {time}? Anyway: {place}.",
      '{place}. Also, go to sleep. It is {time}.',
    ],
    unhinged: [
      "{time}?! What are you doing with your {item} at {time}?! It's {place}. I'm not asking questions.",
    ],
  },
  findSock: {
    bro: ["{place}. Also, as a sock myself, I'm offended you lost one. 🧦"],
    unhinged: ['{place}. A SOCK. You lost a SOCK. I am a SOCK. This is PERSONAL. 🧦'],
  },
  findUnknown: {
    chill: ['No record of "{query}" yet. Want to save where it is?'],
    bro: [
      'No record of "{query}". Either it never existed, or you never told me. Both are your fault.',
      '"{query}"? Never heard of it. Stash it next time, bro.',
      'I\'ve got nothing on "{query}". That one\'s on you, chief.',
      'Zero results for "{query}". I can only remember what you tell me. 🤷',
    ],
    unhinged: [
      '"{query}"? NOT IN MY RECORDS. Did you even OWN a "{query}"?',
      'I have searched EVERYWHERE (my database). No "{query}". Maybe it was a dream.',
    ],
  },
  findCar: {
    chill: ["I don't know where your car is. Save it next time you park!"],
    bro: ["Dude. Where's YOUR car? 🚗 (You never told me.)"],
    unhinged: ["DUDE. WHERE'S YOUR CAR?! 🚗 I DON'T KNOW. YOU NEVER TOLD ME."],
  },
  found: {
    chill: ['Nice, found it.', 'Found. Marked as safe.'],
    bro: [
      'SECURED. ✅ +1 to your dignity.',
      'Reunited. Somebody cue the music. 🎶',
      'Found it! Your blood pressure says thanks.',
      'Case closed. Go touch some grass. 🌱',
      'Back in your hands. Try not to lose it again. (You will.)',
    ],
    unhinged: [
      'THE CHOSEN ONE HAS RETURNED. ✅',
      'REUNITED AND IT FEELS SO GOOD. 🎶🎶',
      "FOUND IT. I'm crying. You're crying. The {item} is crying.",
      "VICTORY. Somebody write a song about this. I'll wait.",
    ],
  },
  notThere: {
    chill: ["Hmm, it's not there. Here's where else it has been."],
    bro: [
      'BRO. 💀 Plot twist. Someone moved it. (It was you.)',
      "Not there?! Okay, don't panic. Check these spots:",
      "It's not there? The betrayal. Usual suspects below. 👇",
      "Huh. Then it's on the run. Here's where it's been before.",
    ],
    unhinged: [
      'WHAT. 💀 IT ESCAPED. Check these locations IMMEDIATELY:',
      'DUN DUN DUNNN. The plot thickens. Suspects listed below.',
      'This is not a drill. (Unless it is your drill.) Check below.',
    ],
  },
  stillThere: {
    chill: ['Thanks, marked as still there.'],
    bro: [
      'Love that for you. Timer reset. ⏱️',
      'Still there. Low-key iconic.',
      'Confirmed. {item} is chilling {place}.',
    ],
    unhinged: ['IT NEVER LEFT. LOYALTY. 🥹', 'Still {place}?! Some things really are forever.'],
  },
  whatsIn: {
    chill: ['{n} things {place}:'],
    bro: [
      "Here's what's living {place}:",
      '{n} things {place}. A whole ecosystem:',
      'The {spot} contains {n} things. Basically a storage unit:',
    ],
    unhinged: [
      "{n} ITEMS {place}. It's not a {spot}, it's a lifestyle:",
      'Opening the {spot}... 🎺 Behold:',
    ],
  },
  whatsInEmpty: {
    chill: ['Nothing saved {place} yet.'],
    bro: [
      'Nothing {place}. Either it is empty or you never told me.',
      'The {spot}? Empty. As far as I know. Which is everything you tell me.',
    ],
    unhinged: ['The {spot}: EMPTY. A void. Nothing. Not even dust (that I know of).'],
  },
  needPlace: {
    chill: ['Where is it? Add a place, like "{text} in the drawer".'],
    bro: [
      'Okay but WHERE? Try "{text} in the drawer".',
      'You told me what, but not where, bro. Try "{text} on the shelf".',
    ],
    unhinged: ['WHERE?! You can\'t leave me on a cliffhanger like that. "{text} in the... ?"'],
  },
  confused: {
    chill: ['I didn\'t catch that. Try "keys in the blue drawer" or "where are my keys?"'],
    bro: [
      'I didn\'t get that, bro. Try "keys in the blue drawer" or "where are my keys?"',
      'That\'s a lot of words. I only speak "thing in place" and "where\'s my thing?"',
    ],
    unhinged: [
      'I\'m a sock, not a therapist. Try "keys in the blue drawer" or "where are my keys?"',
    ],
  },
  undo: {
    chill: ['Undone.'],
    bro: ['Undone. Like it never happened. 🫥', "Ctrl+Z'd. We don't talk about it."],
    unhinged: ['ERASED FROM HISTORY. 🫥'],
  },
  deleted: {
    chill: ['Deleted {item}.'],
    bro: [
      '{item} has left the chat. 👋',
      'Deleted {item}. Gone, but not forgotten. (Actually forgotten.)',
    ],
    unhinged: ['{item} HAS BEEN YEETED INTO THE VOID.'],
  },
};

/** Loading lines while Lefty "searches". Pure theatre; the answer is instant. */
export const SEARCHING_LINES = [
  'Asking the couch cushions…',
  'Checking under the bed…',
  'Interrogating the junk drawer…',
  'Consulting the clothes chair…',
  'Bribing the cat…',
  'Looking in the fridge, just in case…',
  'Retracing your steps…',
  'Checking the pocket of that jacket you wore once…',
  'Lifting every pillow dramatically…',
  'Calling your mom…',
];

/** Rewards printed on Hall of Shame posters. */
export const REWARDS = [
  'Inner peace',
  'One (1) less panic attack',
  'Your mom stops asking',
  'Leaving the house on time',
  'Eternal glory',
  'A snack, probably',
];

/** Examples rotated in the input placeholder. */
export const EXAMPLES = [
  'keys in the blue bowl by the door',
  "where's my passport?",
  'charger next to the bed',
  "what's in the black bag?",
  'lent my drill to Rafi',
  'glasses on top of my head',
];

/** Lefty's short speech-bubble reactions, by mood. Chill mode gets the polite ones. */
export const REACTIONS = {
  happy: { chill: ['Saved.'], fun: ['Noted! 📝', 'Got it, boss.', 'Saved. 🧠✨'] },
  smug: {
    chill: ['Here you go.'],
    fun: ['Told you. 😎', 'Easy.', 'I never forget. Unlike some people.'],
  },
  party: { chill: ['Found it!'], fun: ["LET'S GOOO 🎉", 'W 🏆', 'REUNITED 🥹'] },
  shocked: { chill: ['Oh no.'], fun: ['WAIT WHAT 😱', 'BRO. 💀', 'Plot twist?!'] },
  sad: {
    chill: ['Not found.'],
    fun: ['I got nothing. 😭', 'Never heard of it.', 'Not in my notes…'],
  },
  confused: { chill: ['Hmm?'], fun: ['Huh? 🤔', 'Come again?', "I'm just a sock."] },
} as const;
