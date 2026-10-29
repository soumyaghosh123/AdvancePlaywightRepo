import { test, expect } from '@playwright/test';
import { interpolate, type InterpolationSources } from '@core/data/interpolate';
import { InterpolationError, ConfigError } from '@core/errors';

const sources: InterpolationSources = {
  data: (p) => ({ 'users.valid.username': 'tomsmith', 'obj.x': { a: 1 }, 'num.n': 7 })[p],
  env: { A: '1' },
  secret: (n) => {
    if (n === 'S') return 's3';
    throw new ConfigError(`Missing secret ${n}: set it in .env or as a CI parameter`);
  },
  ctx: (k) => ({ ref: 'R-9' })[k],
  now: () => new Date(2026, 9, 29, 10, 0, 0),
};

test('data env secret ctx', () => {
  expect(interpolate('${data.users.valid.username}/${env.A}/${secret.S}/${ctx.ref}', sources)).toBe('tomsmith/1/s3/R-9');
});

test('non-string values are stringified', () => {
  expect(interpolate('${data.num.n} ${data.obj.x}', sources)).toBe('7 {"a":1}');
});

test('today math and format', () => {
  expect(interpolate('${today}', sources)).toBe('2026-10-29');
  expect(interpolate('${today+2d:dd/MM/yyyy}', sources)).toBe('31/10/2026');
  expect(interpolate('${today-1m}', sources)).toBe('2026-09-29');
  expect(interpolate('${today+1w}', sources)).toBe('2026-11-05');
  expect(interpolate('${today+1y:yyyy}', sources)).toBe('2027');
});

test('faker returns non-empty', () => {
  expect(interpolate('${faker.person.firstName}', sources).length).toBeGreaterThan(0);
  expect(() => interpolate('${faker.nope.thing}', sources)).toThrow(InterpolationError);
});

test('non-placeholder dollars untouched', () => {
  for (const s of ['$100', '//a[$x]', 'cost ${', 'a $ {b}', '${}', 'plain']) {
    expect(interpolate(s, sources)).toBe(s);
  }
});

test('escaped literal', () => {
  expect(interpolate('\\${data.x}', sources)).toBe('${data.x}');
});

test('unknown root errors', () => {
  expect(() => interpolate('${foo.x}', sources)).toThrow('Unknown placeholder ${foo.x}');
});

test('missing env var and ctx value error', () => {
  expect(() => interpolate('${env.NOPE}', sources)).toThrow(/env\.NOPE/);
  expect(() => interpolate('${ctx.nope}', sources)).toThrow(/ctx\.nope/);
});

test('missing secret propagates getSecret message', () => {
  expect(() => interpolate('${secret.X}', sources)).toThrow('Missing secret X: set it in .env or as a CI parameter');
});
