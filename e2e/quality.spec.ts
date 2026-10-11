import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { quietMode } from './helpers';

const PAGES = ['', '#/stuff', '#/shame', '#/report', '#/settings'];

for (const scheme of ['light', 'dark'] as const) {
  test(`no serious accessibility problems (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await quietMode(page);
    await page.goto('./');
    await page.getByRole('button', { name: /Load demo stuff/ }).click();
    for (const path of PAGES) {
      await page.goto(`./${path}`);
      await page.waitForLoadState('networkidle');
      // Let entrance animations finish: half-faded text is not a real contrast problem.
      await page.waitForTimeout(1200);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        serious.map(
          (v) =>
            `${path || 'home'}: ${v.id} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
    }
  });
}

test('works offline after the first visit', async ({ page, context }) => {
  await quietMode(page);
  await page.goto('./');
  await expect(page.getByText('Ready to work offline')).toBeVisible({ timeout: 15_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#omnibox')).toBeVisible();
  await page.goto('./#/report');
  await expect(page.getByRole('heading', { name: 'Chaos Report' })).toBeVisible();
});

test('no sideways scrolling on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await quietMode(page);
  await page.goto('./');
  await page.getByRole('button', { name: /Load demo stuff/ }).click();
  for (const path of PAGES) {
    await page.goto(`./${path}`);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${path || 'home'} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
