import { test, expect } from '@playwright/test';
import { buildProjects } from '@core/config/projects';
import type { FrameworkConfig, RunProfile } from '@core/config/schema';

function cfg(p: Partial<RunProfile>): FrameworkConfig {
  return {
    rootDir: '.',
    profileName: 'x',
    env: 'test',
    baseUrl: 'http://localhost:3999',
    vars: {},
    secrets: {},
    profile: {
      connection: 'local',
      env: 'test',
      browsers: ['chromium'],
      retries: 0,
      headless: true,
      trace: 'off',
      video: 'off',
      screenshot: 'off',
      stepScreenshots: 'off',
      actionTimeoutMs: 5000,
      pageReadyTimeoutMs: 2000,
      reports: ['html'],
      ...p,
    },
  };
}

test('one project per browser plus api', () => {
  expect(buildProjects(cfg({ browsers: ['chromium', 'firefox'] })).map((p) => p.name)).toEqual([
    'chromium',
    'firefox',
    'api',
  ]);
});

test('branded channels and mobile devices', () => {
  const [chrome, edge, pixel, iphone] = buildProjects(cfg({ browsers: ['chrome', 'msedge', 'pixel', 'iphone'] }));
  expect(chrome.use?.channel).toBe('chrome');
  expect(edge.use?.channel).toBe('msedge');
  expect(pixel.use?.isMobile).toBe(true);
  expect(iphone.use?.defaultBrowserType).toBe('webkit');
});

test('web projects exclude @api, api project only runs @api', () => {
  const [web, api] = buildProjects(cfg({}));
  expect(web.grepInvert).toEqual(/@api\b/);
  expect(web.grep).toBeUndefined();
  expect(api.grep).toEqual(/@api\b/);
});

test('headless connection forces headless, local uses profile value', () => {
  expect(buildProjects(cfg({ connection: 'headless', headless: false }))[0].use?.headless).toBe(true);
  expect(buildProjects(cfg({ connection: 'local', headless: false }))[0].use?.headless).toBe(false);
});

test('remote sets connectOptions.wsEndpoint', () => {
  const [web] = buildProjects(cfg({ connection: 'remote', remoteWsEndpoint: 'ws://grid:3000' }));
  expect(web.use?.connectOptions).toEqual({ wsEndpoint: 'ws://grid:3000' });
});

test('browserstack is deferred to phase 5', () => {
  expect(() => buildProjects(cfg({ connection: 'browserstack' }))).toThrow(/phase 5/);
});
