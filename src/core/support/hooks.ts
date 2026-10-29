import { After, Before } from '../fixtures';

Before(async ({ log, $testInfo }) => {
  log.info({ scenario: $testInfo.title, project: $testInfo.project.name, retry: $testInfo.retry }, 'scenario start');
});

/** On failure of a UI scenario, attach the current URL and any console errors. Screenshot/trace/video come from playwright.config. */
After({ tags: 'not @api' }, async ({ ui, consoleErrors, log, $testInfo }) => {
  const failed = $testInfo.status !== $testInfo.expectedStatus;
  log.info({ scenario: $testInfo.title, status: $testInfo.status }, 'scenario end');
  if (!failed) return;
  await $testInfo.attach('page-url.txt', { body: ui.page.url(), contentType: 'text/plain' });
  if (consoleErrors.length) {
    await $testInfo.attach('console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
  }
});
