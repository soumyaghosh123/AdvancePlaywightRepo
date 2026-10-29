import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { ConfigError } from '../errors';
import { RunProfileSchema, type FrameworkConfig } from './schema';

type Env = Record<string, string | undefined>;

function parseEnvFile(file: string): Record<string, string> {
  return dotenv.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function definedOnly(env: Env): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => e[1] !== undefined));
}

function toNumber(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value;
}

/** Environment variables that override run-profile fields. */
function profileOverrides(env: Env): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (env.ENV) o.env = env.ENV;
  if (env.BROWSERS)
    o.browsers = env.BROWSERS.split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  if (env.TAGS) o.tags = env.TAGS;
  if (env.WORKERS) o.workers = toNumber(env.WORKERS);
  if (env.RETRIES) o.retries = toNumber(env.RETRIES);
  if (env.HEADLESS) o.headless = env.HEADLESS === 'true' ? true : env.HEADLESS === 'false' ? false : env.HEADLESS;
  if (env.CONNECTION) o.connection = env.CONNECTION;
  if (env.STEP_SCREENSHOTS) o.stepScreenshots = env.STEP_SCREENSHOTS;
  if (env.REPORTS)
    o.reports = env.REPORTS.split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  if (env.PAGE_READY_TIMEOUT_MS) o.pageReadyTimeoutMs = toNumber(env.PAGE_READY_TIMEOUT_MS);
  return o;
}

export function loadConfig(opts: { rootDir?: string; processEnv?: Env } = {}): FrameworkConfig {
  const rootDir = opts.rootDir ?? process.cwd();
  const processEnv = opts.processEnv ?? process.env;

  const dotEnvFile = path.join(rootDir, '.env');
  // .env first, process env wins: both may set PROFILE and profile overrides, and both are secrets sources.
  const secrets = {
    ...(fs.existsSync(dotEnvFile) ? parseEnvFile(dotEnvFile) : {}),
    ...definedOnly(processEnv),
  };
  const profileName = secrets.PROFILE || 'local';
  const profileRel = path.posix.join('config', 'run-profiles', `${profileName}.json`);
  const profileFile = path.join(rootDir, profileRel);
  if (!fs.existsSync(profileFile)) {
    throw new ConfigError(`Run profile not found: ${profileRel} (set PROFILE to an existing profile)`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(profileFile, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    throw new ConfigError(`${profileRel}: invalid JSON: ${(e as Error).message}`);
  }
  const parsed = RunProfileSchema.safeParse({ ...(raw as object), ...profileOverrides(secrets) });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${profileRel}: ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new ConfigError(issues.join('\n'));
  }
  const profile = parsed.data;

  const envRel = path.posix.join('config', 'env', `${profile.env}.env`);
  const envFile = path.join(rootDir, envRel);
  if (!fs.existsSync(envFile)) {
    throw new ConfigError(`Environment file not found: ${envRel} (set ENV or the profile "env")`);
  }
  const vars = { ...parseEnvFile(envFile), ...secrets };
  if (!vars.BASE_URL) throw new ConfigError(`Missing required config key BASE_URL in ${envRel}`);

  return { rootDir, profileName, profile, env: profile.env, baseUrl: vars.BASE_URL, vars, secrets };
}

let cached: FrameworkConfig | undefined;

/** loadConfig() for the current process, computed once. */
export function getConfig(): FrameworkConfig {
  cached ??= loadConfig();
  return cached;
}

export function getSecret(cfg: FrameworkConfig, name: string): string {
  const value = cfg.secrets[name];
  if (!value) throw new ConfigError(`Missing secret ${name}: set it in .env or as a CI parameter`);
  return value;
}
