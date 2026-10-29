import type { Locator, Page } from '@playwright/test';
import type { LocatorRepository } from '../locators/LocatorRepository';
import { WaitUtils, type Target } from './WaitUtils';

/**
 * Common web actions for steps and page objects. Every method first waits for the page to be ready
 * (WaitUtils.waitForPageReady), then resolves the target: a locator key ('page.key') or a Playwright Locator.
 *
 *   When('I save the order', async ({ common }) => {
 *     await common.fill('orders.qty', '10');
 *     await common.click('orders.saveBtn');
 *   });
 */
export class CommonUtils {
  readonly wait: WaitUtils;

  constructor(
    private readonly getPage: () => Page,
    locators: LocatorRepository,
    wait?: WaitUtils,
  ) {
    this.wait = wait ?? new WaitUtils(getPage, locators);
  }

  get page(): Page {
    return this.getPage();
  }

  /** Page ready, then the element. */
  private async ready(target: Target): Promise<Locator> {
    await this.wait.waitForPageReady();
    return this.wait.el(target);
  }

  // ---- Mouse ----

  async click(target: Target): Promise<void> {
    await (await this.ready(target)).click();
  }

  async doubleClick(target: Target): Promise<void> {
    await (await this.ready(target)).dblclick();
  }

  async rightClick(target: Target): Promise<void> {
    await (await this.ready(target)).click({ button: 'right' });
  }

  async hover(target: Target): Promise<void> {
    await (await this.ready(target)).hover();
  }

  /** DOM click via JavaScript, for elements an overlay keeps Playwright from clicking. Prefer click(). */
  async jsClick(target: Target): Promise<void> {
    await (await this.ready(target)).evaluate((el) => (el as HTMLElement).click());
  }

  async dragAndDrop(source: Target, destination: Target): Promise<void> {
    const from = await this.ready(source);
    await from.dragTo(await this.wait.el(destination));
  }

  async scrollIntoView(target: Target): Promise<void> {
    await (await this.ready(target)).scrollIntoViewIfNeeded();
  }

  // ---- Keyboard and inputs ----

  /** Replaces the field's value. */
  async fill(target: Target, value: string): Promise<void> {
    await (await this.ready(target)).fill(value);
  }

  /** Types key by key, for fields with key handlers (autocomplete, masks). */
  async typeSlowly(target: Target, value: string, delayMs = 50): Promise<void> {
    const el = await this.ready(target);
    await el.clear();
    await el.pressSequentially(value, { delay: delayMs });
  }

  async clear(target: Target): Promise<void> {
    await (await this.ready(target)).clear();
  }

  /** Key or chord on the element, e.g. 'Enter', 'Control+A'. */
  async press(target: Target, keys: string): Promise<void> {
    await (await this.ready(target)).press(keys);
  }

  /** Key or chord on whatever has focus. */
  async pressKey(keys: string): Promise<void> {
    await this.wait.waitForPageReady();
    await this.page.keyboard.press(keys);
  }

  async focus(target: Target): Promise<void> {
    await (await this.ready(target)).focus();
  }

  async upload(target: Target, filePath: string | string[]): Promise<void> {
    await (await this.ready(target)).setInputFiles(filePath);
  }

  // ---- Dropdowns and checkboxes ----

  /** Selects by visible label first, then by value. */
  async select(target: Target, valueOrLabel: string): Promise<void> {
    const el = await this.ready(target);
    const labels = await el.locator('option').allInnerTexts();
    await el.selectOption(labels.map((l) => l.trim()).includes(valueOrLabel) ? { label: valueOrLabel } : valueOrLabel);
  }

  async selectByIndex(target: Target, index: number): Promise<void> {
    await (await this.ready(target)).selectOption({ index });
  }

  async check(target: Target): Promise<void> {
    await (await this.ready(target)).check();
  }

  async uncheck(target: Target): Promise<void> {
    await (await this.ready(target)).uncheck();
  }

  // ---- Reads ----

  async getText(target: Target): Promise<string> {
    return (await (await this.ready(target)).innerText()).trim();
  }

  /** Trimmed text of every match, e.g. all cells of a column. */
  async getAllTexts(target: Target): Promise<string[]> {
    await this.wait.waitForPageReady();
    return (await (await this.wait.el(target, { allowMissing: true })).allInnerTexts()).map((t) => t.trim());
  }

  async getValue(target: Target): Promise<string> {
    return (await this.ready(target)).inputValue();
  }

  async getAttribute(target: Target, name: string): Promise<string | null> {
    return (await this.ready(target)).getAttribute(name);
  }

  async getSelectedOption(target: Target): Promise<string> {
    const el = await this.ready(target);
    return (await el.locator('option:checked').innerText()).trim();
  }

  // ---- State (no waiting for the element: these answer "right now") ----

  async isVisible(target: Target): Promise<boolean> {
    await this.wait.waitForPageReady();
    return (await this.wait.el(target, { allowMissing: true })).isVisible();
  }

  async isEnabled(target: Target): Promise<boolean> {
    await this.wait.waitForPageReady();
    return (await this.wait.el(target, { allowMissing: true })).isEnabled();
  }

  async isChecked(target: Target): Promise<boolean> {
    await this.wait.waitForPageReady();
    return (await this.wait.el(target, { allowMissing: true })).isChecked();
  }

  async count(target: Target): Promise<number> {
    await this.wait.waitForPageReady();
    return (await this.wait.el(target, { allowMissing: true })).count();
  }
}
