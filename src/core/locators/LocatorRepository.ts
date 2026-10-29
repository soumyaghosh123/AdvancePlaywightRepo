import type { FrameLocator, Locator, Page } from '@playwright/test';
import { LocatorNotFoundError, UnknownLocatorError } from '../errors';
import { loadLocatorFiles, type LocatorEntry, type LocatorMap } from './loadLocatorFiles';
import { fillParams, parseKeyRef, parseLocator } from './parseLocator';

export interface FallbackEvent {
  key: string;
  usedIndex: number;
  candidate: string;
}

export interface LocatorRepositoryOptions {
  /** How long to wait for any candidate when a key has fallbacks. Default 5000. */
  fallbackTimeoutMs?: number;
  /** Called when a candidate other than the first one matched. */
  onFallback?: (e: FallbackEvent) => void;
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function build(root: Page | FrameLocator, raw: string): Locator {
  const d = parseLocator(raw);
  switch (d.kind) {
    case 'selector':
      return root.locator(d.selector);
    case 'role':
      return root.getByRole(d.role as Parameters<Page['getByRole']>[0], d.name === undefined ? {} : { name: d.name, exact: d.exact });
    case 'testid':
      return root.getByTestId(d.value);
    case 'label':
      return root.getByLabel(d.value);
    case 'placeholder':
      return root.getByPlaceholder(d.value);
  }
}

export class LocatorRepository {
  private readonly fallbackTimeoutMs: number;

  constructor(
    private readonly map: LocatorMap,
    private readonly opts: LocatorRepositoryOptions = {},
  ) {
    this.fallbackTimeoutMs = opts.fallbackTimeoutMs ?? 5000;
  }

  static fromDir(dir: string, opts?: LocatorRepositoryOptions): LocatorRepository {
    return new LocatorRepository(loadLocatorFiles(dir), opts);
  }

  keys(): string[] {
    return Object.keys(this.map).sort();
  }

  get(key: string): LocatorEntry {
    const entry = this.map[key];
    if (entry) return entry;
    const best = this.keys()
      .map((k) => ({ k, d: distance(k, key) }))
      .filter((x) => x.d <= 3)
      .sort((a, b) => a.d - b.d)[0];
    throw new UnknownLocatorError(`Unknown locator '${key}'.${best ? ` Did you mean '${best.k}'?` : ''}`);
  }

  /**
   * Resolves 'page.key' or 'page.key(arg1, arg2)' to a Locator.
   * One candidate: returned immediately (Playwright auto-waits at the action).
   * Several: waits up to fallbackTimeoutMs for any of them and returns the first that matches.
   */
  async resolve(page: Page, ref: string): Promise<Locator> {
    const { key, args } = parseKeyRef(ref);
    const entry = this.get(key);
    const root: Page | FrameLocator = entry.frame ? page.frameLocator(entry.frame) : page;
    const raws = entry.candidates.map((c) => fillParams(c, args));
    const locators = raws.map((r) => build(root, r));
    if (locators.length === 1) return locators[0];

    const any = locators.reduce((acc, l) => acc.or(l));
    try {
      await any.first().waitFor({ state: 'attached', timeout: this.fallbackTimeoutMs });
    } catch {
      const tried = raws.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
      throw new LocatorNotFoundError(`Locator '${key}' not found after ${this.fallbackTimeoutMs}ms. Tried:\n${tried}`);
    }
    for (let i = 0; i < locators.length; i++) {
      if ((await locators[i].count()) > 0) {
        if (i > 0) this.opts.onFallback?.({ key, usedIndex: i, candidate: raws[i] });
        return locators[i];
      }
    }
    return locators[0];
  }
}
