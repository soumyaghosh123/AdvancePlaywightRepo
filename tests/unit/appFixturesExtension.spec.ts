import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Child bddgen must not inherit the Playwright worker's env (TEST_*, PW_*), or it thinks it runs inside a worker. */
const cleanEnv = () => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TEST_|PW_|PLAYWRIGHT_)/.test(k))),
  PROFILE: 'headless',
});
const ROOT = path.resolve(__dirname, '..', '..');
const COPY = [
  'playwright.config.ts',
  'tsconfig.json',
  'package.json',
  'src',
  'config',
  'features',
  'templates',
  'test-data',
];

test('extending the core test in src/app/fixtures.ts keeps bddgen working for core-only features', () => {
  test.setTimeout(120_000);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwfw-ext-'));
  for (const item of COPY) fs.cpSync(path.join(ROOT, item), path.join(dir, item), { recursive: true });
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'junction');

  fs.writeFileSync(
    path.join(dir, 'src/app/fixtures.ts'),
    `import { createBdd } from 'playwright-bdd';
import { test as coreTest } from '@core/fixtures';
export const test = coreTest.extend<{ greeting: string }>({
  greeting: async ({}, use) => use('hello'),
});
export const { Given, When, Then, Before, After } = createBdd(test);
`,
  );
  fs.writeFileSync(
    path.join(dir, 'src/app/step-definitions/greeting.steps.ts'),
    `import { Then } from '@app/fixtures';
Then('the app greeting is {string}', async ({ greeting }, expected: string) => {
  if (greeting !== expected) throw new Error(greeting);
});
`,
  );
  fs.writeFileSync(
    path.join(dir, 'features/_samples/web/greeting.feature'),
    `Feature: App fixture\n\n  Scenario: Mixed core and app steps\n    Given I store value "x" as "k"\n    Then the app greeting is "hello"\n`,
  );

  let output = '';
  try {
    output = execSync('npx bddgen', { cwd: dir, encoding: 'utf8', stdio: 'pipe', env: cleanEnv() });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    output = `FAILED\n${err.stdout ?? ''}${err.stderr ?? ''}`;
  } finally {
    fs.rmSync(path.join(dir, 'node_modules'), { force: true });
  }
  expect(output).not.toContain('FAILED');
});
