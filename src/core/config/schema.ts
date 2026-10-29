import { z } from 'zod';

export const ReportTypes = ['html', 'allure', 'cucumber'] as const;

export const BrowserNames = ['chromium', 'chrome', 'msedge', 'firefox', 'webkit', 'pixel', 'iphone'] as const;
export type BrowserName = (typeof BrowserNames)[number];

export const RunProfileSchema = z
  .object({
    connection: z.enum(['local', 'headless', 'browserstack', 'remote']).default('local'),
    env: z.string().min(1).default('test'),
    browsers: z.array(z.enum(BrowserNames)).min(1).default(['chromium']),
    tags: z.string().optional(),
    workers: z.number().int().positive().optional(),
    retries: z.number().int().min(0).default(0),
    headless: z.boolean().default(true),
    trace: z.enum(['off', 'on', 'retain-on-failure', 'on-first-retry']).default('on-first-retry'),
    video: z.enum(['off', 'on', 'retain-on-failure']).default('retain-on-failure'),
    screenshot: z.enum(['off', 'on', 'only-on-failure']).default('only-on-failure'),
    /** Screenshot attached after every UI step (on), only after a failed step, or never. */
    stepScreenshots: z.enum(['off', 'on', 'only-on-failure']).default('on'),
    actionTimeoutMs: z.number().int().positive().default(15000),
    /** Before every action, wait up to this long for the page to finish loading and AJAX to settle (0 = off). */
    pageReadyTimeoutMs: z.number().int().min(0).default(10000),
    /** html: Playwright report. allure: Allure results. cucumber: Cucumber HTML + JSON. The console list is always on. */
    reports: z.array(z.enum(ReportTypes)).default(['html', 'allure', 'cucumber']),
    remoteWsEndpoint: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.connection === 'remote' && !p.remoteWsEndpoint) {
      ctx.addIssue({ code: 'custom', path: ['remoteWsEndpoint'], message: "required when connection is 'remote'" });
    }
  });

export type RunProfile = z.infer<typeof RunProfileSchema>;

export interface FrameworkConfig {
  rootDir: string;
  profileName: string;
  profile: RunProfile;
  env: string;
  /** vars.BASE_URL, required. */
  baseUrl: string;
  /** config/env/<env>.env + .env + process env, later wins. */
  vars: Record<string, string>;
  /** .env + process env only: values in config/env files are never secrets. */
  secrets: Record<string, string>;
}
