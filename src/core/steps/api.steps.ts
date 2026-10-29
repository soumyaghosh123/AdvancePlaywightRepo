/**
 * Generic REST and SOAP steps. API base URLs and credentials come from API_<NAME>_* keys
 * (config/env/<env>.env for URLs, .env / CI parameters for secrets). Tag API features with @api.
 */
import { expect } from '@playwright/test';
import type { AuthKind } from '../api/auth';
import { Given, Then, When } from '../fixtures';

Given('I use API {string}', async ({ api, resolve }, name: string) => {
  api.use(resolve(name));
});

Given('I use API {string} with auth {string}', async ({ api, resolve }, name: string, auth: string) => {
  api.use(resolve(name), resolve(auth) as AuthKind);
});

Given('I set header {string} to {string}', async ({ api, resolve }, name: string, value: string) => {
  api.setHeader(resolve(name), resolve(value));
});

When('I send {word} to {string}', async ({ api, resolve }, method: string, apiPath: string) => {
  await api.send(method, resolve(apiPath));
});

When('I send {word} to {string} with body {string}', async ({ api, resolve }, method: string, apiPath: string, body: string) => {
  await api.send(method, resolve(apiPath), body);
});

Then('response status should be {int}', async ({ api }, status: number) => {
  expect(api.last.status, `Response body: ${api.last.text.slice(0, 500)}`).toBe(status);
});

Then('response path {string} should be {string}', async ({ api, resolve }, expr: string, expected: string) => {
  const values = api.jsonPath(resolve(expr));
  expect(values.length, `No value at ${expr}`).toBeGreaterThan(0);
  expect(String(values[0])).toBe(resolve(expected));
});

Then('response path {string} should not be empty', async ({ api, resolve }, expr: string) => {
  const [value] = api.jsonPath(resolve(expr));
  expect(value === undefined || value === null || value === '', `Value at ${expr} is empty`).toBe(false);
});

Then('response should match schema {string}', async ({ api, resolve }, file: string) => {
  const errors = api.validateSchema(resolve(file));
  expect(errors, `Schema ${file} violations:\n${errors.join('\n')}`).toEqual([]);
});

When('I store response path {string} as {string}', async ({ api, ctx, resolve }, expr: string, name: string) => {
  const values = api.jsonPath(resolve(expr));
  if (!values.length) throw new Error(`No value at ${expr} in response: ${api.last.text.slice(0, 500)}`);
  ctx.set(resolve(name), values[0]);
});

When(
  'I send SOAP request {string} to {string} with action {string}',
  async ({ api, resolve }, template: string, urlOrVar: string, action: string) => {
    await api.sendSoap(resolve(template), resolve(urlOrVar), resolve(action));
  },
);

Then('SOAP node {string} should be {string}', async ({ api, resolve }, node: string, expected: string) => {
  expect(api.lastSoap.node(resolve(node)), `SOAP node ${node}`).toBe(resolve(expected));
});

When('I store SOAP node {string} as {string}', async ({ api, ctx, resolve }, node: string, name: string) => {
  const value = api.lastSoap.node(resolve(node));
  if (value === undefined) throw new Error(`SOAP node ${node} not found in response`);
  ctx.set(resolve(name), value);
});
