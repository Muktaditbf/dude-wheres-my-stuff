import { expect, test } from '@playwright/test';
import { omnibox, quietMode, resultCard, say } from './helpers';

test.beforeEach(async ({ page }) => {
  await quietMode(page);
  await page.goto('./');
});

test('stash something, find it again, close the case', async ({ page }) => {
  await say(page, 'passport in the black bag, top shelf');
  await expect(resultCard(page).getByText('Noted 📝', { exact: true })).toBeVisible();

  await say(page, "where's my passport?");
  const card = resultCard(page);
  await expect(card.getByText('Found it (in my notes)', { exact: true })).toBeVisible();
  await expect(card.getByRole('heading', { name: 'passport' })).toBeVisible();
  await expect(card.getByText('in the black bag, top shelf', { exact: true })).toBeVisible();

  await card.getByRole('button', { name: 'Got it!' }).click();
  await expect(card.getByText('Case closed', { exact: true })).toBeVisible();
});

test('when it is not there, it shows where it usually ends up', async ({ page }) => {
  await say(page, 'charger next to the bed');
  await say(page, 'charger in the living room');
  await say(page, 'charger next to the bed');
  await say(page, 'charger in my backpack');

  await say(page, 'where is the charger');
  await resultCard(page)
    .getByRole('button', { name: /not there/i })
    .click();
  await expect(page.getByText('It usually ends up next to the bed (2 of 4 times).')).toBeVisible();

  const spot = page.getByRole('listitem').filter({ hasText: 'next to the bed' });
  await spot.getByRole('button', { name: 'Found it here!' }).click();
  await expect(resultCard(page).getByText('Case closed', { exact: true })).toBeVisible();
  await expect(resultCard(page).locator('p', { hasText: /^next to the bed$/ })).toBeVisible();
});

test('lists everything in a place', async ({ page }) => {
  await say(page, 'passport and birth certificate in the black bag');
  await say(page, 'umbrella by the door');
  await say(page, "what's in the black bag?");
  const card = resultCard(page);
  await expect(card.getByText("What's in the black bag", { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: /passport/ })).toBeVisible();
  await expect(card.getByRole('button', { name: /birth certificate/ })).toBeVisible();
  await expect(card.getByRole('button', { name: /umbrella/ })).toHaveCount(0);
});

test('undo takes a stash back', async ({ page }) => {
  await say(page, 'keys in the bowl');
  await resultCard(page).getByRole('button', { name: 'Undo' }).click();
  await expect(resultCard(page).getByText('Undone', { exact: true })).toBeVisible();
  await page.goto('./#/stuff');
  await expect(page.getByText('Nothing yet. Suspiciously organized.')).toBeVisible();
});

test('unknown things get a roast and a shortcut to stash them', async ({ page }) => {
  await say(page, 'where is my unicorn');
  await expect(resultCard(page).getByText('No record 🤷', { exact: true })).toBeVisible();
  await resultCard(page).getByRole('button', { name: 'Stash it now' }).click();
  await expect(omnibox(page)).toHaveValue('unicorn in ');
  await expect(omnibox(page)).toBeFocused();
});

test('typos and synonyms still find the right thing', async ({ page }) => {
  await say(page, 'glasses on the nightstand');
  await say(page, 'where are my specs');
  await expect(resultCard(page).getByRole('heading', { name: 'glasses' })).toBeVisible();
  await say(page, 'wher are my glases');
  await expect(resultCard(page).getByRole('heading', { name: 'glasses' })).toBeVisible();
});

test('links can stash things without typing', async ({ page }) => {
  await page.goto('./?add=wallet%20in%20the%20car#/');
  await expect(resultCard(page).getByText('Noted 📝', { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/add=/);
  await page.reload();
  await page.goto('./#/stuff');
  await expect(page.getByRole('button', { name: /wallet/ })).toHaveCount(1);
});

test('the item sheet shows history and can rename and delete with undo', async ({ page }) => {
  await say(page, 'drill in the garage');
  await say(page, 'lent my drill to Rafi');
  await page.goto('./#/stuff');
  await page.getByRole('button', { name: /drill/ }).click();

  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('with Rafi').first()).toBeVisible();
  await expect(sheet.getByText('Lent', { exact: true })).toBeVisible();
  await expect(sheet.getByText('in the garage').first()).toBeVisible();

  await sheet.getByRole('button', { name: 'Rename' }).click();
  await sheet.getByLabel('New name').fill('Cordless drill');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet.getByRole('heading', { name: 'Cordless drill' })).toBeVisible();

  await sheet.getByRole('button', { name: 'Delete' }).click();
  await sheet.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /Cordless drill/ })).toBeVisible();
});

test('backups survive a wipe', async ({ page }) => {
  await say(page, 'passport in the safe');
  await page.goto('./#/settings');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const file = test.info().outputPath('backup.json');
  await (await download).saveAs(file);

  await page.getByRole('button', { name: 'Wipe everything' }).click();
  await page.getByRole('button', { name: 'Yes, wipe it' }).click();
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(file);
  await expect(page.getByText('Restored 1 thing. Welcome back! 🎉')).toBeVisible();

  await page.goto('./#/stuff');
  await expect(page.getByRole('button', { name: /passport/ })).toBeVisible();
});

test('demo stuff fills every page', async ({ page }) => {
  await page.getByRole('button', { name: /Load demo stuff/ }).click();
  await page.goto('./#/shame');
  await expect(page.getByText('WANTED').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /TV remote/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Ghosted/ })).toBeVisible();
  await expect(page.getByText('Spare house key')).toBeVisible();
  await page.goto('./#/report');
  await expect(
    page.getByRole('heading', { name: /Gremlin|Squirrel|Goldfish|Legend/ }),
  ).toBeVisible();
});

test('drama mode: searching theatre and the plot twist', async ({ page }) => {
  await quietMode(page, true);
  await page.goto('./');
  await say(page, 'keys in the bowl');
  await omnibox(page).fill('where are my keys');
  await omnibox(page).press('Enter');
  await expect(page.getByRole('status').filter({ hasText: '…' })).toBeVisible();
  await resultCard(page)
    .getByRole('button', { name: /not there/i })
    .click();
  const twist = page.getByText('plot twist', { exact: true });
  await expect(twist).toBeVisible();
  await expect(twist).toBeHidden();
});

test('auto-backup keeps one file up to date with every change', async ({ page }) => {
  // Stand-in for the browser's "save file" picker, recording what gets written.
  await page.addInitScript(() => {
    const w = window as unknown as { written: string[]; showSaveFilePicker: unknown };
    w.written = [];
    w.showSaveFilePicker = async () => ({
      name: 'stuff-backup.json',
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      createWritable: async () => ({
        write: async (data: string) => {
          w.written.push(data);
        },
        close: async () => {},
      }),
    });
  });
  await page.goto('./#/settings');
  await page.reload();
  await page.getByRole('button', { name: 'Turn on auto-backup' }).click();
  await expect(page.getByText('stuff-backup.json')).toBeVisible();

  await page.getByRole('link', { name: 'Home', exact: true }).first().click();
  await say(page, 'passport in the safe');
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { written: string[] }).written.at(-1) ?? ''),
    )
    .toContain('in the safe');
  const writes = await page.evaluate(
    () => (window as unknown as { written: string[] }).written.length,
  );
  expect(writes).toBeGreaterThanOrEqual(2);
});
