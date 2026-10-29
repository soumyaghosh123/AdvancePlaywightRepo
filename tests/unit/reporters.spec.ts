import { test, expect } from '@playwright/test';
import { buildReporters } from '@core/config/reporters';
import type { FrameworkConfig, RunProfile } from '@core/config/schema';

function cfg(reports: RunProfile['reports']): FrameworkConfig {
  return {
    rootDir: '.',
    profileName: 'ci',
    env: 'uat',
    baseUrl: 'https://uat.example.invalid',
    vars: {},
    secrets: {},
    profile: {
      connection: 'headless',
      env: 'uat',
      browsers: ['chromium', 'firefox'],
      retries: 0,
      headless: true,
      trace: 'off',
      video: 'off',
      screenshot: 'off',
      stepScreenshots: 'off',
      actionTimeoutMs: 5000,
      pageReadyTimeoutMs: 2000,
      reports,
    },
  };
}

const names = (r: ReturnType<typeof buildReporters>) => r.map(([name]) => name);

test('list is always on; each report type adds its reporters', () => {
  expect(names(buildReporters(cfg([])))).toEqual(['list']);
  expect(names(buildReporters(cfg(['html'])))).toEqual(['list', 'html']);
  expect(names(buildReporters(cfg(['allure'])))).toEqual([
    'list',
    'allure-playwright',
    './src/core/support/allureReport.reporter.ts',
  ]);
  // playwright-bdd's cucumber reporter: one HTML and one JSON
  expect(buildReporters(cfg(['cucumber']))).toHaveLength(3);
});

test('report locations are under reports/', () => {
  const all = JSON.stringify(buildReporters(cfg(['html', 'allure', 'cucumber'])));
  expect(all).toContain('reports/playwright');
  expect(all).toContain('reports/allure-results');
  expect(all).toContain('reports/cucumber/report.html');
  expect(all).toContain('reports/cucumber/report.json');
});

test('allure gets the run environment and BDD-only steps', () => {
  const [, opts] = buildReporters(cfg(['allure']))[1] as [string, Record<string, unknown>];
  expect(opts.detail).toBe(false);
  expect(opts.environmentInfo).toMatchObject({
    Environment: 'uat',
    Profile: 'ci',
    Browsers: 'chromium, firefox',
    'Base URL': 'https://uat.example.invalid',
  });
});

test('cucumber JSON keeps text attachments but not screenshots, video or traces', () => {
  const json = buildReporters(cfg(['cucumber'])).find((r) => JSON.stringify(r).includes('report.json'));
  expect(JSON.stringify(json)).toContain('"skipAttachments":["image/png","video/webm","application/zip"]');
});
