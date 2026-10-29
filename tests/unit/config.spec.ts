import { test, expect } from '@playwright/test';
import path from 'node:path';
import { loadConfig, getSecret } from '@core/config/loadConfig';
import { ConfigError } from '@core/errors';
import { tempRoot } from './helpers/tempRoot';

const FIX = path.join(__dirname, 'fixtures', 'config');
const load = (env: Record<string, string> = {}, extra: Record<string, string> = {}) =>
  loadConfig({ rootDir: tempRoot(FIX, extra), processEnv: env });

test('defaults to local profile and test env', () => {
  const cfg = load();
  expect(cfg.profileName).toBe('local');
  expect(cfg.env).toBe('test');
  expect(cfg.baseUrl).toBe('http://localhost:3999');
  expect(cfg.profile.headless).toBe(false);
  expect(cfg.profile.retries).toBe(0);
  expect(cfg.profile.trace).toBe('on-first-retry');
  expect(cfg.profile.actionTimeoutMs).toBe(15000);
});

test('profile values override env file, process env overrides profile', () => {
  const cfg = load({ PROFILE: 'crossbrowser', BROWSERS: 'firefox,webkit', WORKERS: '6', HEADLESS: 'false', TAGS: '@smoke' });
  expect(cfg.profile.connection).toBe('headless');
  expect(cfg.profile.browsers).toEqual(['firefox', 'webkit']);
  expect(cfg.profile.workers).toBe(6);
  expect(cfg.profile.retries).toBe(1);
  expect(cfg.profile.headless).toBe(false);
  expect(cfg.profile.tags).toBe('@smoke');
});

test('ENV selects env file', () => {
  expect(load({ ENV: 'uat' }).baseUrl).toBe('https://uat.example.invalid');
});

test('.env values are loaded and process env wins', () => {
  const cfg = load({ SECRET_A: 'proc' }, { '.env': 'SECRET_A=file\nSECRET_B=fromdotenv\n' });
  expect(getSecret(cfg, 'SECRET_A')).toBe('proc');
  expect(getSecret(cfg, 'SECRET_B')).toBe('fromdotenv');
  expect(cfg.vars.SECRET_B).toBe('fromdotenv');
});

test('values in config/env files are not secrets', () => {
  const cfg = load();
  expect(cfg.vars.SECRET_IN_FILE).toBe('should-not-be-a-secret');
  expect(() => getSecret(cfg, 'SECRET_IN_FILE')).toThrow(ConfigError);
});

test('missing env file names the file', () => {
  expect(() => load({ ENV: 'nope' })).toThrow(/config[\/]env[\/]nope\.env/);
});

test('missing BASE_URL names the key and file', () => {
  expect(() => load({}, { 'config/env/test.env': 'A=1\n' })).toThrow(/BASE_URL.*test\.env/);
});

test('unknown profile names the profile file', () => {
  expect(() => load({ PROFILE: 'ghost' })).toThrow(/run-profiles[\/]ghost\.json/);
});

test('invalid profile JSON reports field', () => {
  expect(() => load({ PROFILE: 'bad' })).toThrow(/bad\.json: browsers/);
});

test('unparseable profile JSON names the file', () => {
  expect(() => load({ PROFILE: 'broken' })).toThrow(/broken\.json: invalid JSON/);
});

test('remote connection requires remoteWsEndpoint', () => {
  expect(() => load({ PROFILE: 'remote' })).toThrow(/remoteWsEndpoint/);
});

test('non-numeric WORKERS is rejected', () => {
  expect(() => load({ WORKERS: 'many' })).toThrow(/workers/);
});

test('CRLF and BOM in env files are stripped', () => {
  const cfg = load({}, { 'config/env/test.env': '﻿BASE_URL=http://x\r\nA=1\r\n' });
  expect(cfg.baseUrl).toBe('http://x');
  expect(cfg.vars.A).toBe('1');
});

test('getSecret error explains where to set it', () => {
  expect(() => getSecret(load(), 'NOPE')).toThrow('Missing secret NOPE: set it in .env or as a CI parameter');
});
