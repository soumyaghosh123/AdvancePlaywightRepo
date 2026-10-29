import { devices, type PlaywrightTestProject } from '@playwright/test';
import { ConfigError } from '../errors';
import type { BrowserName, FrameworkConfig } from './schema';

const browserUse: Record<BrowserName, PlaywrightTestProject['use']> = {
  chromium: { ...devices['Desktop Chrome'] },
  chrome: { ...devices['Desktop Chrome'], channel: 'chrome' },
  msedge: { ...devices['Desktop Edge'], channel: 'msedge' },
  firefox: { ...devices['Desktop Firefox'] },
  webkit: { ...devices['Desktop Safari'] },
  pixel: { ...devices['Pixel 7'] },
  iphone: { ...devices['iPhone 15'] },
};

const API_TAG = /@api\b/;

/** One project per profile browser (excluding @api scenarios) plus an 'api' project that runs only @api scenarios. */
export function buildProjects(cfg: FrameworkConfig): PlaywrightTestProject[] {
  const { profile } = cfg;
  if (profile.connection === 'browserstack') {
    throw new ConfigError("connection 'browserstack' is enabled in phase 5 (BrowserStack plan)");
  }
  const headless = profile.connection === 'local' ? profile.headless : true;
  const connectOptions =
    profile.connection === 'remote' && profile.remoteWsEndpoint ? { wsEndpoint: profile.remoteWsEndpoint } : undefined;

  const web: PlaywrightTestProject[] = profile.browsers.map((name) => ({
    name,
    grepInvert: API_TAG,
    use: { ...browserUse[name], headless, ...(connectOptions ? { connectOptions } : {}) },
  }));
  return [...web, { name: 'api', grep: API_TAG, use: {} }];
}
