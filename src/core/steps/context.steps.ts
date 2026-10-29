/** Store values in the scenario context and reuse them later as ${ctx.name}. */
import { expect } from '@playwright/test';
import { Then, When } from '../fixtures';

When('I store text of {string} as {string}', async ({ ui, ctx, resolve }, ref: string, name: string) => {
  ctx.set(resolve(name), await ui.getText(resolve(ref)));
});

When('I store value {string} as {string}', async ({ ctx, resolve }, value: string, name: string) => {
  ctx.set(resolve(name), resolve(value));
});

Then('stored value {string} should be {string}', async ({ ctx, resolve }, name: string, expected: string) => {
  expect(String(ctx.get(resolve(name)))).toBe(resolve(expected));
});
