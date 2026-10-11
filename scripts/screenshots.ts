/**
 * Generates the README screenshots, the README banner and the social preview image.
 *
 *   npm run build && npm run preview     # in one terminal
 *   npm run screenshots                  # in another
 *
 * Set PW_CHROMIUM_PATH to use an installed Chromium-based browser instead of
 * Playwright's bundled one.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { type Browser, chromium, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/dude-wheres-my-stuff/';
const OUT = 'docs/screenshots';
const PHONE = { width: 390, height: 844 };

async function newPage(
  browser: Browser,
  opts: { dark?: boolean; width?: number; height?: number; scale?: number },
) {
  const context = await browser.newContext({
    viewport: { width: opts.width ?? PHONE.width, height: opts.height ?? PHONE.height },
    deviceScaleFactor: opts.scale ?? 2,
    colorScheme: opts.dark ? 'dark' : 'light',
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('dwms:settings', JSON.stringify({ sounds: false, drama: true }));
  });
  await page.goto(BASE);
  await page.waitForSelector('#omnibox');
  return page;
}

async function loadDemo(page: Page) {
  await page.getByRole('button', { name: /Load demo stuff/ }).click();
  await page.waitForTimeout(300);
  await dismissToasts(page);
}

async function dismissToasts(page: Page) {
  for (const button of await page.getByRole('button', { name: 'Dismiss' }).all()) {
    await button.click().catch(() => {});
  }
  await page.waitForTimeout(300);
}

async function ask(page: Page, text: string) {
  await page.fill('#omnibox', text);
  await page.press('#omnibox', 'Enter');
  await page.waitForTimeout(1400);
  await page.locator('#omnibox').blur();
}

/** Scrolls so the result card sits nicely under the header, and makes Lefty look at it. */
async function frameCard(page: Page) {
  const card = page.locator('main article').first();
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -96));
  const box = await card.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.waitForTimeout(500);
}

async function shot(page: Page, name: string) {
  await dismissToasts(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png`);
  await page.context().close();
}

async function dataUrl(name: string) {
  return `data:image/png;base64,${(await readFile(`${OUT}/${name}.png`)).toString('base64')}`;
}

/** Lays out screenshots on a poster, using the app's own fonts and styles. */
async function poster(
  browser: Browser,
  name: string,
  size: { width: number; height: number },
  phones: string[],
  compact = false,
) {
  const page = await newPage(browser, { ...size, scale: 1 });
  const images = await Promise.all(phones.map(dataUrl));
  await page.evaluate(
    ({ images, compact, logo }) => {
      const tilts = ['-5deg', '3deg', '-2deg'];
      const offsets = compact ? ['0px'] : ['40px', '-10px', '60px'];
      const phoneWidth = compact ? 240 : 316;
      document.body.innerHTML = `
        <div style="height:100vh;display:flex;align-items:center;justify-content:space-between;gap:48px;padding:0 ${compact ? 64 : 96}px;box-sizing:border-box;overflow:hidden">
          <div style="max-width:${compact ? 640 : 600}px">
            <img src="${logo}" width="${compact ? 96 : 120}" height="${compact ? 96 : 120}" alt="" style="transform:rotate(-6deg)"/>
            <h1 class="font-extrabold uppercase tracking-tight" style="font-size:${compact ? 70 : 96}px;line-height:0.92;margin:20px 0 0">
              <span class="sticker-sm inline-block -rotate-3 bg-yellow px-3 text-on-accent">Dude,</span>
              <span class="block" style="margin-top:12px">where's my</span>
              <span class="sticker-sm inline-block rotate-2 bg-pink px-3 text-on-accent" style="margin-top:8px">stuff?!</span>
            </h1>
            <p class="font-marker" style="font-size:${compact ? 28 : 34}px;line-height:1.3;margin-top:28px">
              Tell it where you put your stuff.<br/>Ask it later. Get roasted.
            </p>
            ${
              compact
                ? ''
                : `<div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap">
                    ${['100% offline', 'No account', 'Private by design', 'Open source']
                      .map(
                        (t) =>
                          `<span class="sticker-sm bg-surface px-4 py-2 text-xl font-extrabold">${t}</span>`,
                      )
                      .join('')}
                  </div>`
            }
          </div>
          <div style="display:flex;gap:28px;align-items:center">
            ${images
              .map(
                (src, i) => `
                <div class="sticker" style="padding:10px;border-radius:44px;transform:rotate(${tilts[i]}) translateY(${offsets[i]});background:var(--line)">
                  <img src="${src}" style="width:${phoneWidth}px;border-radius:34px;display:block"/>
                </div>`,
              )
              .join('')}
          </div>
        </div>`;
    },
    { images, compact, logo: `${BASE}logo.svg` },
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: name });
  console.log(`✓ ${name}`);
  await page.context().close();
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
await mkdir(OUT, { recursive: true });

{
  const page = await newPage(browser, {});
  await loadDemo(page);
  await page.fill('#omnibox', 'passport in the black bag, top shelf');
  await page.mouse.move(300, 700);
  await page.waitForTimeout(300);
  await shot(page, 'home');
}
{
  const page = await newPage(browser, {});
  await loadDemo(page);
  await ask(page, "where's my remote?");
  await frameCard(page);
  await shot(page, 'found');
}
{
  const page = await newPage(browser, {});
  await loadDemo(page);
  await ask(page, "where's my passport?");
  await page.getByRole('button', { name: 'Got it!' }).click();
  await page.waitForTimeout(250);
  await frameCard(page);
  await shot(page, 'secured');
}
{
  const page = await newPage(browser, { dark: true });
  await loadDemo(page);
  await ask(page, 'where is my charger');
  await page.getByRole('button', { name: /not there/i }).click();
  await page.waitForTimeout(1600);
  await frameCard(page);
  await shot(page, 'not-there');
}
{
  const page = await newPage(browser, {});
  await loadDemo(page);
  await page.goto(`${BASE}#/shame`);
  await page.waitForTimeout(900);
  await shot(page, 'shame');
}
{
  const page = await newPage(browser, { dark: true });
  await loadDemo(page);
  await page.goto(`${BASE}#/report`);
  await page.waitForTimeout(900);
  await shot(page, 'report');
}
{
  const page = await newPage(browser, { width: 1280, height: 800, scale: 1.5 });
  await loadDemo(page);
  await ask(page, 'where are my keys');
  await page.mouse.move(640, 600);
  await shot(page, 'desktop');
}

await poster(browser, 'docs/banner.png', { width: 1920, height: 960 }, [
  'found',
  'secured',
  'not-there',
]);
await poster(browser, 'public/og.png', { width: 1200, height: 630 }, ['found'], true);

await browser.close();
