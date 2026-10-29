import { After, AfterStep, Before } from '../fixtures';

Before(async ({ log, $testInfo }) => {
  log.info({ scenario: $testInfo.title, project: $testInfo.project.name, retry: $testInfo.retry }, 'scenario start');
});

/**
 * Screenshot of the active tab after each UI step, named "step-NN <step text>.png" in the report.
 * Controlled by the profile's stepScreenshots (on | only-on-failure | off) or STEP_SCREENSHOTS.
 * A failed screenshot never fails the step.
 */
const stepNumbers = new WeakMap<object, number>();

AfterStep({ tags: 'not @api' }, async ({ ui, cfg, log, $step, $testInfo }) => {
  const n = (stepNumbers.get($testInfo) ?? 0) + 1;
  stepNumbers.set($testInfo, n);
  const mode = cfg.profile.stepScreenshots;
  const failed = $step.error !== undefined;
  if (mode === 'off' || (mode === 'only-on-failure' && !failed)) return;
  if (ui.page.isClosed()) return;
  const title = $step.title.slice(0, 100);
  try {
    const body = await ui.page.screenshot({ timeout: 5000 });
    await $testInfo.attach(`step-${String(n).padStart(2, '0')} ${failed ? 'FAILED ' : ''}${title}.png`, {
      body,
      contentType: 'image/png',
    });
  } catch (e) {
    log.warn({ step: $step.title, error: (e as Error).message }, 'step screenshot failed');
  }
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
