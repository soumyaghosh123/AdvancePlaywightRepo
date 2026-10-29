/**
 * Driven by the run profile (config/run-profiles/<PROFILE>.json) and environment (config/env/<ENV>.env).
 * You normally don't edit this file: change the profile, or override with PROFILE / ENV / BROWSERS / TAGS / WORKERS / RETRIES.
 */
import fs from 'node:fs';
import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { getConfig } from './src/core/config/loadConfig';
import { buildProjects } from './src/core/config/projects';

const cfg = getConfig();

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  // The core fixtures file must be listed so playwright-bdd can relate app fixtures that extend it.
  steps: ['src/core/fixtures/index.ts', 'src/core/steps/**/*.ts', 'src/core/support/hooks.ts', 'src/app/**/*.ts'],
  tags: cfg.profile.tags,
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  workers: cfg.profile.workers,
  retries: cfg.profile.retries,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }]],
  use: {
    baseURL: cfg.baseUrl,
    trace: cfg.profile.trace,
    video: cfg.profile.video,
    screenshot: cfg.profile.screenshot,
    actionTimeout: cfg.profile.actionTimeoutMs,
  },
  projects: buildProjects(cfg),
  webServer: fs.existsSync('features/_samples')
    ? {
        command: 'npx tsx tests/mock-server/server.ts',
        url: 'http://localhost:3999/health',
        reuseExistingServer: true,
      }
    : undefined,
});
