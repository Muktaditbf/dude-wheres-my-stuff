# Contributing

Thanks for helping people find their stuff! 🧦

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173/dude-wheres-my-stuff/
npm test           # unit tests
npm run check      # lint + format + types
```

For end-to-end tests, install a browser once with `npx playwright install chromium`, then run `npm run e2e`.
To test with a browser you already have, point `PW_CHROMIUM_PATH` at any Chromium-based browser binary.

## Adding a roast

Roasts live in [`src/lib/roasts.ts`](src/lib/roasts.ts), grouped by situation (`findLegend`, `notThere`, …)
and by level (`chill`, `bro`, `unhinged`).

Good roasts:

- are about **forgetting things**, never about the person (no jokes about looks, age, gender, intelligence, etc.)
- are short enough to read in one breath
- still contain the useful part when the situation needs it (for example `{place}` when answering "where is it?")
- only use the placeholders listed at the top of the file; the tests check this

`chill` lines must stay polite: no roasting at all. That level exists for people who just want the facts.

## Improving the parser

The parser ([`src/lib/parser.ts`](src/lib/parser.ts)) is rule-based on purpose: offline, instant and predictable.
If a sentence is misunderstood:

1. Add it to [`src/lib/parser.test.ts`](src/lib/parser.test.ts) with the result you expect.
2. Make the test pass without breaking the others.

## Pull requests

- Keep changes focused; one idea per PR.
- `npm run check`, `npm test` and `npm run e2e` should pass. CI runs all three.
- For UI changes, include a screenshot (phone size, light and dark if colors changed).
- Respect the privacy promise: no analytics, no trackers, no network requests with user data.
