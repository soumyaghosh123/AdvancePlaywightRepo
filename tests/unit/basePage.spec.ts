import { test, expect } from '@playwright/test';
import { BasePage } from '@core/pages/BasePage';
import { LocatorRepository } from '@core/locators/LocatorRepository';
import type { FrameworkConfig } from '@core/config/schema';
import { ConfigError } from '@core/errors';

const e = (c: string) => ({ candidates: [c], source: 'test' });
const repo = new LocatorRepository({
  'login.username': e('placeholder=Username'),
  'login.loginBtn': e("role=button[name='Log in']"),
  'login.out': e('#out'),
  'form.country': e('#country'),
  'form.agree': e('#agree'),
  'form.newTab': e('a[target=_blank]'),
});

function cfg(vars: Record<string, string> = {}): FrameworkConfig {
  return {
    rootDir: '.',
    profileName: 'local',
    env: 'test',
    baseUrl: 'about:blank',
    vars: { BASE_URL: 'about:blank', ...vars },
    secrets: {},
    profile: {
      connection: 'local',
      env: 'test',
      browsers: ['chromium'],
      retries: 0,
      headless: true,
      trace: 'off',
      video: 'off',
      screenshot: 'off',
      actionTimeoutMs: 5000,
    },
  };
}

const FORM = `
  <input placeholder="Username"><button onclick="document.getElementById('out').textContent='clicked '+document.querySelector('input').value">Log in</button>
  <div id="out"></div>
  <select id="country"><option value="au">Australia</option><option value="in">India</option></select>
  <input type="checkbox" id="agree">
  <a target="_blank" href="about:blank#2">open</a>`;

test('open resolves PAGE_ var from camelCase and spaced names', async ({ page }) => {
  const ui = new BasePage(page, repo, cfg({ PAGE_SAMPLE_LOGIN: 'about:blank#login' }));
  await ui.open('sampleLogin');
  expect(page.url()).toBe('about:blank#login');
  await ui.open('sample login');
  expect(page.url()).toBe('about:blank#login');
});

test('open unknown page names the var to add', async ({ page }) => {
  const ui = new BasePage(page, repo, cfg());
  await expect(ui.open('ghost')).rejects.toThrow(ConfigError);
  await expect(ui.open('ghost')).rejects.toThrow(
    "No URL for page 'ghost'. Add PAGE_GHOST=<url or /path> to config/env/test.env",
  );
});

test('fill, click and getText via locator keys', async ({ page }) => {
  await page.setContent(FORM);
  const ui = new BasePage(page, repo, cfg());
  await ui.fill('login.username', 'bob');
  await ui.click('login.loginBtn');
  expect(await ui.getText('login.out')).toBe('clicked bob');
  // eslint-disable-next-line playwright/prefer-web-first-assertions -- this test covers BasePage.isVisible itself
  expect(await ui.isVisible('login.out')).toBe(true);
});

test('isVisible is false for a missing key with fallbacks (no throw)', async ({ page }) => {
  await page.setContent(FORM);
  const r = new LocatorRepository(
    { 'x.gone': { candidates: ['#old', '#new'], source: 'test' } },
    { fallbackTimeoutMs: 300 },
  );
  const ui = new BasePage(page, r, cfg());
  // eslint-disable-next-line playwright/prefer-web-first-assertions -- this test covers BasePage.isVisible itself
  expect(await ui.isVisible('x.gone')).toBe(false);
});

test('select by label then by value, check and uncheck', async ({ page }) => {
  await page.setContent(FORM);
  const ui = new BasePage(page, repo, cfg());
  await ui.select('form.country', 'India');
  await expect(page.locator('#country')).toHaveValue('in');
  await ui.select('form.country', 'au');
  await expect(page.locator('#country')).toHaveValue('au');
  await ui.check('form.agree');
  await expect(page.locator('#agree')).toBeChecked();
  await ui.uncheck('form.agree');
  await expect(page.locator('#agree')).not.toBeChecked();
});

test('clickAndSwitchToNewTab returns the new page and makes it active', async ({ page }) => {
  await page.setContent(FORM);
  const ui = new BasePage(page, repo, cfg());
  const tab = await ui.clickAndSwitchToNewTab('form.newTab');
  expect(tab).not.toBe(page);
  expect(ui.page).toBe(tab);
  ui.usePage(page);
  expect(ui.page).toBe(page);
});
