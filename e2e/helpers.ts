import { expect, type Page } from '@playwright/test';

/** Turns off sounds and the fake "searching" delay so tests run fast. */
export async function quietMode(page: Page, drama = false) {
  await page.addInitScript((dramaOn) => {
    localStorage.setItem('dwms:settings', JSON.stringify({ sounds: false, drama: dramaOn }));
  }, drama);
}

export const omnibox = (page: Page) => page.locator('#omnibox');

/** Types a sentence into the main input, presses Enter and waits until it is handled. */
export async function say(page: Page, text: string) {
  await omnibox(page).fill(text);
  await omnibox(page).press('Enter');
  await expect(omnibox(page)).toHaveValue('');
}

/** The card that appears under the input. */
export const resultCard = (page: Page) => page.locator('main article').first();
