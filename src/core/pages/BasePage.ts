import type { Locator, Page } from '@playwright/test';
import type { FrameworkConfig } from '../config/schema';
import { ConfigError } from '../errors';
import type { LocatorRepository } from '../locators/LocatorRepository';

/** "sampleLogin" | "sample login" | "sample-login" → "SAMPLE_LOGIN" */
function pageVarName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
}

/**
 * Common actions on locator keys ('page.key' or 'page.key(arg)').
 * Extend it for your own page objects; use `this.page` for anything raw Playwright.
 */
export class BasePage {
  private activePage: Page;
  private dialogArmed = false;

  constructor(
    page: Page,
    protected readonly locators: LocatorRepository,
    protected readonly cfg: FrameworkConfig,
  ) {
    this.activePage = page;
  }

  get page(): Page {
    return this.activePage;
  }

  /** Switch the active tab. */
  usePage(page: Page): void {
    this.activePage = page;
  }

  el(ref: string): Promise<Locator> {
    return this.locators.resolve(this.activePage, ref);
  }

  /** URL, '/path' (relative to BASE_URL) or a page name looked up as PAGE_<NAME> in config/env/<env>.env. */
  async open(target: string): Promise<void> {
    let url = target;
    if (!/^[a-z]+:/i.test(target) && !target.startsWith('/')) {
      const key = `PAGE_${pageVarName(target)}`;
      const value = this.cfg.vars[key];
      if (!value) {
        throw new ConfigError(`No URL for page '${target}'. Add ${key}=<url or /path> to config/env/${this.cfg.env}.env`);
      }
      url = value;
    }
    if (url.startsWith('/')) url = this.cfg.baseUrl.replace(/\/$/, '') + url;
    await this.activePage.goto(url);
  }

  async click(ref: string): Promise<void> {
    await (await this.el(ref)).click();
  }

  async doubleClick(ref: string): Promise<void> {
    await (await this.el(ref)).dblclick();
  }

  async hover(ref: string): Promise<void> {
    await (await this.el(ref)).hover();
  }

  async fill(ref: string, value: string): Promise<void> {
    await (await this.el(ref)).fill(value);
  }

  async clear(ref: string): Promise<void> {
    await (await this.el(ref)).clear();
  }

  /** Selects by visible label first, then by value. */
  async select(ref: string, valueOrLabel: string): Promise<void> {
    const el = await this.el(ref);
    const labels = await el.locator('option').allInnerTexts();
    await el.selectOption(labels.map((l) => l.trim()).includes(valueOrLabel) ? { label: valueOrLabel } : valueOrLabel);
  }

  async check(ref: string): Promise<void> {
    await (await this.el(ref)).check();
  }

  async uncheck(ref: string): Promise<void> {
    await (await this.el(ref)).uncheck();
  }

  async press(ref: string, keys: string): Promise<void> {
    await (await this.el(ref)).press(keys);
  }

  async upload(ref: string, filePath: string): Promise<void> {
    await (await this.el(ref)).setInputFiles(filePath);
  }

  async getText(ref: string): Promise<string> {
    return (await (await this.el(ref)).innerText()).trim();
  }

  async isVisible(ref: string): Promise<boolean> {
    return (await this.el(ref)).isVisible();
  }

  /** Accepts the next alert/confirm/prompt that opens on the active page. */
  acceptNextDialog(): void {
    if (this.dialogArmed) return;
    this.dialogArmed = true;
    this.activePage.once('dialog', (d) => {
      this.dialogArmed = false;
      void d.accept();
    });
  }

  /** Clicks a link/button that opens a new tab and makes that tab active. */
  async clickAndSwitchToNewTab(ref: string): Promise<Page> {
    const el = await this.el(ref);
    const [tab] = await Promise.all([this.activePage.context().waitForEvent('page'), el.click()]);
    await tab.waitForLoadState();
    this.activePage = tab;
    return tab;
  }
}
