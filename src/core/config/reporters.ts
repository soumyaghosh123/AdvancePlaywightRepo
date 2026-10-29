import type { ReporterDescription } from '@playwright/test';
import { cucumberReporter } from 'playwright-bdd';
import type { FrameworkConfig } from './schema';

export const REPORT_DIRS = {
  html: 'reports/playwright',
  allureResults: 'reports/allure-results',
  allureReport: 'reports/allure-report',
  cucumber: 'reports/cucumber',
} as const;

/** Reporters for playwright.config, from the profile's `reports` (or REPORTS). */
export function buildReporters(cfg: FrameworkConfig): ReporterDescription[] {
  const reports = new Set(cfg.profile.reports);
  const out: ReporterDescription[] = [['list']];
  if (reports.has('html')) out.push(['html', { outputFolder: REPORT_DIRS.html, open: 'never' }]);
  if (reports.has('allure')) {
    out.push([
      'allure-playwright',
      {
        resultsDir: REPORT_DIRS.allureResults,
        // Only the Gherkin steps, not Playwright's internal fixture and hook steps.
        detail: false,
        environmentInfo: {
          Environment: cfg.env,
          Profile: cfg.profileName,
          Browsers: cfg.profile.browsers.join(', '),
          'Base URL': cfg.baseUrl,
          'Node.js': process.version,
          OS: process.platform,
        },
      },
    ]);
    // After allure-playwright: turns the results into reports/allure-report/index.html.
    out.push(['./src/core/support/allureReport.reporter.ts']);
  }
  if (reports.has('cucumber')) {
    out.push(
      cucumberReporter('html', { outputFile: `${REPORT_DIRS.cucumber}/report.html` }) as ReporterDescription,
      cucumberReporter('json', {
        outputFile: `${REPORT_DIRS.cucumber}/report.json`,
        // Text attachments (page URL, console errors) only: screenshots/video/trace would bloat the JSON CI tools read.
        skipAttachments: ['image/png', 'video/webm', 'application/zip'],
      }) as ReporterDescription,
    );
  }
  return out;
}
