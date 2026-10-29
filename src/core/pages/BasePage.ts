import type { Locator, Page } from '@playwright/test';
import type { FrameworkConfig } from '../config/schema';
import { ConfigError } from '../errors';
import type { LocatorRepository } from '../locators/LocatorRepository';
import { CommonUtils } from '../utils/CommonUtils';
import { WaitUtils } from '../utils/WaitUtils';

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
 * Extend it for your own page objects; use `this.common` / `this.wait` for more actions and dynamic waits,
 * and `this.page` for anything raw Playwright. Every action waits for the page to be ready first.
 */
export class BasePage {
  private activePage: Page;
  private dialogArmed = false;
  readonly wait: WaitUtils;
  readonly common: CommonUtils;

  constructor(
    page: Page,
    protected readonly locators: LocatorRepository,
    protected readonly cfg: FrameworkConfig,
    opts: { onPageNotReady?: (reason: string) => void } = {},
  ) {
    this.activePage = page;
    const getPage = () => this.activePage;
    this.wait = new WaitUtils(getPage, locators, {
      pageReadyTimeoutMs: cfg.profile.pageReadyTimeoutMs,
      timeoutMs: cfg.profile.actionTimeoutMs,
      onPageNotReady: opts.onPageNotReady,
    });
    this.common = new CommonUtils(getPage, locators, this.wait);
  }

  get page(): Page {
    return this.activePage;
  }

  /** Switch the active tab. */
  usePage(page: Page): void {
    this.activePage = page;
  }

  /** allowMissing: don't wait for or require the element (for hidden/count/visibility checks on keys with fallbacks). */
  el(ref: string, opts?: { allowMissing?: boolean }): Promise<Locator> {
    return this.locators.resolve(this.activePage, ref, opts);
  }

  /** URL, '/path' (relative to BASE_URL) or a page name looked up as PAGE_<NAME> in config/env/<env>.env. */
  async open(target: string): Promise<void> {
    let url = target;
    if (!/^[a-z]+:/i.test(target) && !target.startsWith('/')) {
      const key = `PAGE_${pageVarName(target)}`;
      const value = this.cfg.vars[key];
      if (!value) {
        throw new ConfigError(
          `No URL for page '${target}'. Add ${key}=<url or /path> to config/env/${this.cfg.env}.env`,
        );
      }
      url = value;
    }
    if (url.startsWith('/')) url = this.cfg.baseUrl.replace(/\/$/, '') + url;
    // Not 'load': a hanging third-party script would block it; actions auto-wait for their elements anyway.
    await this.activePage.goto(url, { waitUntil: 'domcontentloaded' });
    await this.wait.waitForPageReady();
  }

  async click(ref: string): Promise<void> {
    await this.common.click(ref);
  }

  async doubleClick(ref: string): Promise<void> {
    await this.common.doubleClick(ref);
  }

  async hover(ref: string): Promise<void> {
    await this.common.hover(ref);
  }

  async fill(ref: string, value: string): Promise<void> {
    await this.common.fill(ref, value);
  }

  async clear(ref: string): Promise<void> {
    await this.common.clear(ref);
  }

  /** Selects by visible label first, then by value. */
  async select(ref: string, valueOrLabel: string): Promise<void> {
    await this.common.select(ref, valueOrLabel);
  }

  async check(ref: string): Promise<void> {
    await this.common.check(ref);
  }

  async uncheck(ref: string): Promise<void> {
    await this.common.uncheck(ref);
  }

  async press(ref: string, keys: string): Promise<void> {
    await this.common.press(ref, keys);
  }

  async upload(ref: string, filePath: string): Promise<void> {
    await this.common.upload(ref, filePath);
  }

  async getText(ref: string): Promise<string> {
    return this.common.getText(ref);
  }

  async isVisible(ref: string): Promise<boolean> {
    return this.common.isVisible(ref);
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
    await this.wait.waitForPageReady();
    const el = await this.el(ref);
    const [tab] = await Promise.all([this.activePage.context().waitForEvent('page'), el.click()]);
    await tab.waitForLoadState();
    this.activePage = tab;
    return tab;
  }
}
