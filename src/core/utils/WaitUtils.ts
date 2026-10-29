import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { TimeoutError } from '../errors';
import type { LocatorRepository } from '../locators/LocatorRepository';

/** A locator key ('page.key' or 'page.key(arg)') or a Playwright Locator. */
export type Target = string | Locator;

export interface WaitUtilsOptions {
  /** Cap for waitForPageReady. 0 disables the check. Default 10000. */
  pageReadyTimeoutMs?: number;
  /** Default timeout for the explicit waits below. Default 15000. */
  timeoutMs?: number;
  /** Called when waitForPageReady gives up, e.g. to annotate the test. */
  onPageNotReady?: (reason: string) => void;
}

/** Set on a document once waitForPageReady has given up on it; a navigation clears it with the document. */
const GAVE_UP = '__waitUtilsGaveUp';

/** In-page check: document loaded and no jQuery or ASP.NET UpdatePanel request in flight. Returns why not, or ''. */
function pageBusyReason(flag: string): string {
  if ((window as unknown as Record<string, unknown>)[flag]) return '';
  if (document.readyState !== 'complete') return `document.readyState is '${document.readyState}'`;
  const w = window as unknown as {
    jQuery?: { active?: number };
    Sys?: { WebForms?: { PageRequestManager?: { getInstance?: () => { get_isInAsyncPostBack?: () => boolean } } } };
  };
  if ((w.jQuery?.active ?? 0) > 0) return `${w.jQuery?.active} jQuery AJAX request(s) pending`;
  if (w.Sys?.WebForms?.PageRequestManager?.getInstance?.()?.get_isInAsyncPostBack?.()) {
    return 'ASP.NET AJAX postback in progress';
  }
  return '';
}

/** Gap between polls of a condition. Not a fixed sleep: the caller re-checks after it, until a deadline. */
function pollGap(ms: number): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax -- polling interval, the one sanctioned use
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Dynamic waits. Use these instead of fixed sleeps.
 * CommonUtils calls waitForPageReady() before every action, so scripts rarely need to.
 */
export class WaitUtils {
  readonly pageReadyTimeoutMs: number;
  readonly timeoutMs: number;

  constructor(
    private readonly getPage: () => Page,
    private readonly locators: LocatorRepository,
    private readonly opts: WaitUtilsOptions = {},
  ) {
    this.pageReadyTimeoutMs = opts.pageReadyTimeoutMs ?? 10000;
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  get page(): Page {
    return this.getPage();
  }

  /** Resolves a locator key to a Locator; Locators pass through. */
  async el(target: Target, opts?: { allowMissing?: boolean }): Promise<Locator> {
    return typeof target === 'string' ? this.locators.resolve(this.page, target, opts) : target;
  }

  /**
   * Waits until the page is fully loaded: document.readyState 'complete' and no pending jQuery / ASP.NET AJAX.
   * Soft: after the cap it reports the reason via onPageNotReady and returns, because a hanging third-party
   * script must not fail the test. Playwright still checks the element itself before acting.
   * It gives up at most once per document: later calls on the same page return at once.
   */
  async waitForPageReady(timeoutMs = this.pageReadyTimeoutMs): Promise<void> {
    if (timeoutMs <= 0) return;
    const deadline = Date.now() + timeoutMs;
    let reason = '';
    while (Date.now() < deadline) {
      try {
        reason = await this.page.evaluate(pageBusyReason, GAVE_UP);
      } catch {
        reason = 'page is navigating'; // execution context destroyed mid-navigation: try again
      }
      if (!reason) return;
      await pollGap(Math.min(100, Math.max(0, deadline - Date.now())));
    }
    await this.page
      .evaluate((flag) => ((window as unknown as Record<string, unknown>)[flag] = true), GAVE_UP)
      .catch(() => undefined); // navigated meanwhile: the new page gets its own wait
    this.opts.onPageNotReady?.(`${this.page.url()}: ${reason} after ${timeoutMs}ms`);
  }

  async waitForVisible(target: Target, timeoutMs = this.timeoutMs): Promise<void> {
    await (await this.el(target)).waitFor({ state: 'visible', timeout: timeoutMs });
  }

  async waitForHidden(target: Target, timeoutMs = this.timeoutMs): Promise<void> {
    await (await this.el(target, { allowMissing: true })).waitFor({ state: 'hidden', timeout: timeoutMs });
  }

  /** Attached to the DOM, visible or not. */
  async waitForAttached(target: Target, timeoutMs = this.timeoutMs): Promise<void> {
    await (await this.el(target)).waitFor({ state: 'attached', timeout: timeoutMs });
  }

  async waitForDetached(target: Target, timeoutMs = this.timeoutMs): Promise<void> {
    await (await this.el(target, { allowMissing: true })).waitFor({ state: 'detached', timeout: timeoutMs });
  }

  async waitForEnabled(target: Target, timeoutMs = this.timeoutMs): Promise<void> {
    await expect(await this.el(target)).toBeEnabled({ timeout: timeoutMs });
  }

  /** Text contains `text` (string) or matches it (RegExp). */
  async waitForText(target: Target, text: string | RegExp, timeoutMs = this.timeoutMs): Promise<void> {
    await expect(await this.el(target)).toContainText(text, { timeout: timeoutMs });
  }

  async waitForValue(target: Target, value: string | RegExp, timeoutMs = this.timeoutMs): Promise<void> {
    await expect(await this.el(target)).toHaveValue(value, { timeout: timeoutMs });
  }

  async waitForAttribute(
    target: Target,
    name: string,
    value: string | RegExp,
    timeoutMs = this.timeoutMs,
  ): Promise<void> {
    await expect(await this.el(target)).toHaveAttribute(name, value, { timeout: timeoutMs });
  }

  async waitForCount(target: Target, count: number, timeoutMs = this.timeoutMs): Promise<void> {
    await expect(await this.el(target, { allowMissing: true })).toHaveCount(count, { timeout: timeoutMs });
  }

  /** A loading spinner/overlay: waits for it to appear briefly (it may never show), then to disappear. */
  async waitForSpinnerToDisappear(target: Target, timeoutMs = this.timeoutMs): Promise<void> {
    const spinner = await this.el(target, { allowMissing: true });
    await spinner.waitFor({ state: 'visible', timeout: 1000 }).catch(() => undefined);
    await spinner.waitFor({ state: 'hidden', timeout: timeoutMs });
  }

  async waitForUrl(part: string | RegExp, timeoutMs = this.timeoutMs): Promise<void> {
    await this.page.waitForURL(typeof part === 'string' ? (u) => u.href.includes(part) : part, {
      timeout: timeoutMs,
      waitUntil: 'commit',
    });
  }

  async waitForTitle(part: string | RegExp, timeoutMs = this.timeoutMs): Promise<void> {
    await expect(this.page).toHaveTitle(
      typeof part === 'string' ? new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : part,
      {
        timeout: timeoutMs,
      },
    );
  }

  /** No network traffic for 500ms. Can hang on pages that poll; prefer waitForPageReady or waitForResponse. */
  async waitForNetworkIdle(timeoutMs = this.timeoutMs): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: timeoutMs });
  }

  /** Runs `action` and waits for a response whose URL contains `urlPart` (armed before the action, so none is missed). */
  async waitForResponseAfter(
    urlPart: string | RegExp,
    action: () => Promise<unknown>,
    timeoutMs = this.timeoutMs,
  ): Promise<Response> {
    const match = (u: string) => (typeof urlPart === 'string' ? u.includes(urlPart) : urlPart.test(u));
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => match(r.url()), { timeout: timeoutMs }),
      action(),
    ]);
    return response;
  }

  /** Polls `condition` until it returns true. */
  async waitUntil(
    condition: () => boolean | Promise<boolean>,
    o: { timeoutMs?: number; intervalMs?: number; message?: string } = {},
  ): Promise<void> {
    const timeoutMs = o.timeoutMs ?? this.timeoutMs;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (await condition()) return;
      if (Date.now() >= deadline) {
        throw new TimeoutError(`${o.message ?? 'Condition was not met'} (waited ${timeoutMs}ms)`);
      }
      await pollGap(o.intervalMs ?? 250);
    }
  }
}
