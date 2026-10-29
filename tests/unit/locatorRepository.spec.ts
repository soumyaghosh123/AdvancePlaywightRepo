import { test, expect } from '@playwright/test';
import { LocatorRepository, type FallbackEvent } from '@core/locators/LocatorRepository';
import type { LocatorMap } from '@core/locators/loadLocatorFiles';
import { LocatorNotFoundError, UnknownLocatorError } from '@core/errors';

const entry = (...candidates: string[]) => ({ candidates, source: 'test' });
const map: LocatorMap = {
  'login.username': entry('[placeholder="Username"]'),
  'login.missingSingle': entry('#does-not-exist'),
  'login.loginBtn': entry('text=Log in'),
  'login.fallback': entry('#nope', 'text=Log in'),
  'login.ghost': entry('#a', '#b'),
  'login.role': entry("role=button[name='Log in']"),
  'login.label': entry('label=Email'),
  'login.testid': entry('testid=save'),
  'login.selenium': entry('By.xpath("//input[@placeholder=\'Username\']")'),
  'table.rowByName': entry("xpath=//tr[td[text()='{0}']]"),
  'frame.inner': { candidates: ['#inner'], frame: 'iframe#f', source: 'test' },
};

test.beforeEach(async ({ page }) => {
  await page.setContent(`
    <input placeholder="Username"><button>Log in</button>
    <label>Email <input id="email"></label><button data-testid="save">Save</button>
    <iframe id="f" srcdoc="<p id=inner>hi</p>"></iframe>
    <table><tr><td>John</td></tr><tr><td>Jane</td></tr></table>`);
});

test('single candidate resolves without polling', async ({ page }) => {
  const repo = new LocatorRepository(map, { fallbackTimeoutMs: 5000 });
  const t = Date.now();
  const loc = await repo.resolve(page, 'login.missingSingle');
  expect(Date.now() - t).toBeLessThan(50);
  await expect(loc).toHaveCount(0);
});

test('first candidate used, no fallback event', async ({ page }) => {
  const events: FallbackEvent[] = [];
  const repo = new LocatorRepository(map, { onFallback: (e) => events.push(e) });
  await expect(await repo.resolve(page, 'login.loginBtn')).toHaveText('Log in');
  expect(events).toEqual([]);
});

test('fallback used and reported', async ({ page }) => {
  const events: FallbackEvent[] = [];
  const repo = new LocatorRepository(map, { onFallback: (e) => events.push(e) });
  await expect(await repo.resolve(page, 'login.fallback')).toHaveText('Log in');
  expect(events).toEqual([{ key: 'login.fallback', usedIndex: 1, candidate: 'text=Log in' }]);
});

test('none match lists key and all candidates', async ({ page }) => {
  const repo = new LocatorRepository(map, { fallbackTimeoutMs: 300 });
  const err = await repo.resolve(page, 'login.ghost').catch((e: Error) => e);
  expect(err).toBeInstanceOf(LocatorNotFoundError);
  expect((err as Error).message).toMatch(/Locator 'login\.ghost' not found after 300ms[\s\S]*1\. #a[\s\S]*2\. #b/);
});

test('parameterised ref', async ({ page }) => {
  const repo = new LocatorRepository(map);
  await expect(await repo.resolve(page, 'table.rowByName(John)')).toHaveCount(1);
});

test('frame entry resolves inside iframe', async ({ page }) => {
  const repo = new LocatorRepository(map);
  await expect(await repo.resolve(page, 'frame.inner')).toHaveText('hi');
});

test('role, label, testid and Selenium descriptors build locators', async ({ page }) => {
  const repo = new LocatorRepository(map);
  await expect(await repo.resolve(page, 'login.role')).toHaveText('Log in');
  await expect(await repo.resolve(page, 'login.label')).toHaveId('email');
  await expect(await repo.resolve(page, 'login.testid')).toHaveText('Save');
  await expect(await repo.resolve(page, 'login.selenium')).toHaveCount(1);
});

test('unknown key suggests closest', () => {
  const repo = new LocatorRepository(map);
  expect(() => repo.get('login.usrname')).toThrow(UnknownLocatorError);
  expect(() => repo.get('login.usrname')).toThrow("Unknown locator 'login.usrname'. Did you mean 'login.username'?");
  expect(() => repo.get('zzz.qqqqqqqq')).toThrow("Unknown locator 'zzz.qqqqqqqq'.");
});
