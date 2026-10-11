import { defineConfig, devices } from '@playwright/test';

// Set PW_CHROMIUM_PATH to test with an installed Chromium-based browser instead of
// Playwright's bundled one (e.g. /opt/brave.com/brave/brave).
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const baseURL = 'http://localhost:4173/dude-wheres-my-stuff/';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
