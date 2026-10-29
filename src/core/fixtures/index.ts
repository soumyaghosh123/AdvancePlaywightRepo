import path from 'node:path';
import type { Logger } from 'pino';
import { createBdd, test as base } from 'playwright-bdd';
import { getConfig, getSecret } from '../config/loadConfig';
import type { FrameworkConfig } from '../config/schema';
import { TestDataManager } from '../data/TestDataManager';
import { interpolate } from '../data/interpolate';
import { loadLocatorFiles, type LocatorMap } from '../locators/loadLocatorFiles';
import { LocatorRepository } from '../locators/LocatorRepository';
import { BasePage } from '../pages/BasePage';
import { ScenarioContext } from '../support/ScenarioContext';
import { createLogger } from '../support/logger';

export interface WorkerFixtures {
  cfg: FrameworkConfig;
  locatorMap: LocatorMap;
  data: TestDataManager;
  log: Logger;
}

export interface TestFixtures {
  /** Values shared between steps of one scenario. */
  ctx: ScenarioContext;
  /** Locator repository for this scenario; fallback usage is recorded as a test annotation. */
  locators: LocatorRepository;
  /** Expands ${data.x} ${env.X} ${secret.X} ${ctx.x} ${faker.a.b} ${today...} in step arguments. */
  resolve: (text: string) => string;
  /** Console errors and page errors seen on the page during the scenario. */
  consoleErrors: string[];
  /** Generic page actions on locator keys. */
  ui: BasePage;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures need an object pattern
  cfg: [async ({}, use) => use(getConfig()), { scope: 'worker' }],
  locatorMap: [
    async ({ cfg }, use) => use(loadLocatorFiles(path.join(cfg.rootDir, 'src', 'app', 'locators'))),
    { scope: 'worker' },
  ],
  data: [
    async ({ cfg }, use) => use(await TestDataManager.load(path.join(cfg.rootDir, 'test-data', cfg.env))),
    { scope: 'worker' },
  ],
  log: [async ({ cfg }, use, workerInfo) => use(createLogger({ workerIndex: workerInfo.workerIndex, dir: path.join(cfg.rootDir, 'reports', 'logs') })), { scope: 'worker' }],

  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures need an object pattern
  ctx: async ({}, use) => use(new ScenarioContext()),
  locators: async ({ locatorMap }, use, testInfo) =>
    use(
      new LocatorRepository(locatorMap, {
        onFallback: (e) =>
          testInfo.annotations.push({
            type: 'locator-fallback',
            description: `${e.key} → candidate #${e.usedIndex + 1}: ${e.candidate}`,
          }),
      }),
    ),
  resolve: async ({ cfg, data, ctx }, use) =>
    use((text) =>
      interpolate(text, {
        data: (p) => data.get(p),
        env: cfg.vars,
        secret: (n) => getSecret(cfg, n),
        ctx: (k) => ctx.get(k),
      }),
    ),
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await use(errors);
  },
  ui: async ({ page, locators, cfg, consoleErrors }, use) => {
    void consoleErrors; // start collecting as soon as the scenario touches the UI
    await use(new BasePage(page, locators, cfg));
  },
});

export const { Given, When, Then, Before, After, BeforeAll, AfterAll } = createBdd(test);
