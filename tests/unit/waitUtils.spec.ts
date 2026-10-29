import { test, expect } from '@playwright/test';
import { LocatorRepository } from '@core/locators/LocatorRepository';
import { WaitUtils } from '@core/utils/WaitUtils';
import { CommonUtils } from '@core/utils/CommonUtils';
import { TimeoutError } from '@core/errors';

const e = (c: string) => ({ candidates: [c], source: 'test' });
const repo = new LocatorRepository({
  'form.save': e('#save'),
  'form.name': e('#name'),
  'form.msg': e('#msg'),
});

/** Simulates an AJAX call in flight (jQuery.active) that finishes after `ms`; #save records whether it had finished. */
const BUSY_PAGE = (ms: number) => `
  <input id="name"><button id="save" onclick="window.clickedWhenIdle = window.jQuery.active === 0">Save</button>
  <div id="msg" style="display:none">Saved</div>
  <script>
    window.jQuery = { active: 1 };
    ${ms >= 0 ? `setTimeout(() => (window.jQuery.active = 0), ${ms});` : ''}
  </script>`;

function utils(page: import('@playwright/test').Page, pageReadyTimeoutMs = 5000) {
  const notReady: string[] = [];
  const wait = new WaitUtils(() => page, repo, {
    pageReadyTimeoutMs,
    timeoutMs: 2000,
    onPageNotReady: (reason) => notReady.push(reason),
  });
  return { wait, common: new CommonUtils(() => page, repo, wait), notReady };
}

test('waitForPageReady returns at once on an idle, loaded page', async ({ page }) => {
  await page.setContent('<p>idle</p>');
  const { wait, notReady } = utils(page);
  const start = Date.now();
  await wait.waitForPageReady();
  expect(Date.now() - start).toBeLessThan(1000);
  expect(notReady).toEqual([]);
});

test('waitForPageReady waits for pending AJAX to finish', async ({ page }) => {
  await page.setContent(BUSY_PAGE(400));
  const { wait } = utils(page);
  await wait.waitForPageReady();
  expect(await page.evaluate(() => (window as unknown as { jQuery: { active: number } }).jQuery.active)).toBe(0);
});

test('waitForPageReady is soft: gives up after the cap, reports it, does not throw', async ({ page }) => {
  await page.setContent(BUSY_PAGE(-1)); // never finishes
  const { wait, notReady } = utils(page, 300);
  await wait.waitForPageReady();
  expect(notReady).toHaveLength(1);
  expect(notReady[0]).toMatch(/AJAX/);
});

test('waitForPageReady gives up at most once per page load, then until the next navigation', async ({ page }) => {
  await page.setContent(BUSY_PAGE(-1));
  const { wait, notReady } = utils(page, 300);
  await wait.waitForPageReady();
  const start = Date.now();
  await wait.waitForPageReady();
  expect(Date.now() - start).toBeLessThan(250);
  expect(notReady).toHaveLength(1);

  // A real navigation (setContent keeps the same window): waits and reports again.
  await page.goto(`data:text/html,${encodeURIComponent(BUSY_PAGE(-1))}`);
  await wait.waitForPageReady();
  expect(notReady).toHaveLength(2);
});

test('pageReadyTimeoutMs 0 disables the page-ready check', async ({ page }) => {
  await page.setContent(BUSY_PAGE(-1));
  const { wait, notReady } = utils(page, 0);
  await wait.waitForPageReady();
  expect(notReady).toEqual([]);
});

test('every action waits for the page to be ready first', async ({ page }) => {
  await page.setContent(BUSY_PAGE(400));
  const { common } = utils(page);
  await common.click('form.save');
  expect(await page.evaluate(() => (window as unknown as { clickedWhenIdle: boolean }).clickedWhenIdle)).toBe(true);
});

test('actions accept a locator key or a Playwright Locator', async ({ page }) => {
  await page.setContent('<input id="name">');
  const { common } = utils(page);
  await common.fill('form.name', 'by key');
  expect(await common.getValue(page.locator('#name'))).toBe('by key');
});

test('waitUntil polls a condition and throws TimeoutError with the message', async ({ page }) => {
  await page.setContent('<p></p>');
  const { wait } = utils(page);
  let n = 0;
  await wait.waitUntil(() => ++n >= 3, { intervalMs: 10 });
  expect(n).toBe(3);
  await expect(wait.waitUntil(() => false, { timeoutMs: 100, message: 'never true' })).rejects.toThrow(TimeoutError);
  await expect(wait.waitUntil(() => false, { timeoutMs: 100, message: 'never true' })).rejects.toThrow(/never true/);
});

test('waitForText and waitForVisible wait for dynamic content', async ({ page }) => {
  await page.setContent(`<div id="msg" style="display:none"></div>
    <script>setTimeout(() => { const m = document.getElementById('msg'); m.textContent = 'Saved'; m.style.display = 'block'; }, 300);</script>`);
  const { wait } = utils(page);
  await wait.waitForVisible('form.msg');
  await wait.waitForText('form.msg', 'Saved');
  await expect(page.locator('#msg')).toHaveText('Saved');
});
