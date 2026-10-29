import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ScenarioContext } from '@core/support/ScenarioContext';
import { createLogger } from '@core/support/logger';
import { tempRoot } from './helpers/tempRoot';

test('ctx set/get/has and keys', () => {
  const ctx = new ScenarioContext();
  ctx.set('orderRef', 'R-1');
  ctx.set('count', 3);
  expect(ctx.get('orderRef')).toBe('R-1');
  expect(ctx.get<number>('count')).toBe(3);
  expect(ctx.has('orderRef')).toBe(true);
  expect(ctx.has('nope')).toBe(false);
  expect(ctx.keys()).toEqual(['count', 'orderRef']);
});

test('ctx missing key error lists stored keys', () => {
  const ctx = new ScenarioContext();
  ctx.set('a', 1);
  ctx.set('b', 2);
  expect(() => ctx.get('x')).toThrow("Scenario value 'x' was never stored. Stored keys: a, b");
  expect(() => new ScenarioContext().get('x')).toThrow("Scenario value 'x' was never stored. Stored keys: (none)");
});

test('logger writes one file per worker', () => {
  const dir = tempRoot('');
  const log = createLogger({ workerIndex: 3, dir });
  log.info({ scenario: 'S1' }, 'hello');
  log.flush();
  const text = fs.readFileSync(path.join(dir, 'worker-3.log'), 'utf8');
  expect(text).toContain('"msg":"hello"');
  expect(text).toContain('"scenario":"S1"');
});
