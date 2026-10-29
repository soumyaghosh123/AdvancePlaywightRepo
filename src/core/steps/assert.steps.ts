/** Generic assertion steps (web-first: they wait until the condition holds or the timeout expires). */
import { expect } from '@playwright/test';
import { Then } from '../fixtures';

Then('{string} should be visible', async ({ ui, resolve }, ref: string) => {
  await expect(await ui.el(resolve(ref))).toBeVisible();
});

Then('{string} should be hidden', async ({ ui, resolve }, ref: string) => {
  await expect(await ui.el(resolve(ref))).toBeHidden();
});

Then('{string} should have text {string}', async ({ ui, resolve }, ref: string, text: string) => {
  await expect(await ui.el(resolve(ref))).toHaveText(resolve(text));
});

Then('{string} should contain text {string}', async ({ ui, resolve }, ref: string, text: string) => {
  await expect(await ui.el(resolve(ref))).toContainText(resolve(text));
});

Then('{string} should have value {string}', async ({ ui, resolve }, ref: string, value: string) => {
  await expect(await ui.el(resolve(ref))).toHaveValue(resolve(value));
});

Then(
  '{string} should have attribute {string} with value {string}',
  async ({ ui, resolve }, ref: string, name: string, value: string) => {
    await expect(await ui.el(resolve(ref))).toHaveAttribute(resolve(name), resolve(value));
  },
);

Then('{string} should have count {int}', async ({ ui, resolve }, ref: string, count: number) => {
  await expect(await ui.el(resolve(ref))).toHaveCount(count);
});

Then('{string} should be enabled', async ({ ui, resolve }, ref: string) => {
  await expect(await ui.el(resolve(ref))).toBeEnabled();
});

Then('{string} should be disabled', async ({ ui, resolve }, ref: string) => {
  await expect(await ui.el(resolve(ref))).toBeDisabled();
});
