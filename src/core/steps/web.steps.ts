import { expect } from '@playwright/test';
import { Given, Then } from '../fixtures';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

Given('I open url {string}', async ({ ui, resolve }, url: string) => {
  await ui.open(resolve(url));
});

Then('the page title should contain {string}', async ({ ui, resolve }, text: string) => {
  await expect(ui.page).toHaveTitle(new RegExp(escapeRegex(resolve(text))));
});
