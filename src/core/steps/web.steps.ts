/**
 * Generic web steps. Locator arguments are keys from src/app/locators ('page.key' or 'page.key(arg)').
 * Every string argument is expanded with resolve() first (${data.x}, ${env.X}, ${secret.X}, ${ctx.x}, ...).
 */
import path from 'node:path';
import { expect } from '@playwright/test';
import { Given, Then, When } from '../fixtures';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

Given('I open the {string} page', async ({ ui, resolve }, name: string) => {
  await ui.open(resolve(name));
});

Given('I open url {string}', async ({ ui, resolve }, url: string) => {
  await ui.open(resolve(url));
});

When('I click {string}', async ({ ui, resolve }, ref: string) => {
  await ui.click(resolve(ref));
});

When('I double click {string}', async ({ ui, resolve }, ref: string) => {
  await ui.doubleClick(resolve(ref));
});

When('I hover over {string}', async ({ ui, resolve }, ref: string) => {
  await ui.hover(resolve(ref));
});

When('I enter {string} into {string}', async ({ ui, resolve }, value: string, ref: string) => {
  await ui.fill(resolve(ref), resolve(value));
});

When('I clear {string}', async ({ ui, resolve }, ref: string) => {
  await ui.clear(resolve(ref));
});

When('I select {string} from {string}', async ({ ui, resolve }, value: string, ref: string) => {
  await ui.select(resolve(ref), resolve(value));
});

When('I check {string}', async ({ ui, resolve }, ref: string) => {
  await ui.check(resolve(ref));
});

When('I uncheck {string}', async ({ ui, resolve }, ref: string) => {
  await ui.uncheck(resolve(ref));
});

When('I press {string} on {string}', async ({ ui, resolve }, keys: string, ref: string) => {
  await ui.press(resolve(ref), resolve(keys));
});

When('I upload {string} to {string}', async ({ ui, resolve, cfg }, file: string, ref: string) => {
  await ui.upload(resolve(ref), path.resolve(cfg.rootDir, resolve(file)));
});

When('I accept the next dialog', async ({ ui }) => {
  ui.acceptNextDialog();
});

When('I click {string} and switch to the new tab', async ({ ui, resolve }, ref: string) => {
  await ui.clickAndSwitchToNewTab(resolve(ref));
});

When('I wait for {string} to be visible', async ({ ui, resolve }, ref: string) => {
  await (await ui.el(resolve(ref))).waitFor({ state: 'visible' });
});

When('I wait for {string} to be hidden', async ({ ui, resolve }, ref: string) => {
  await (await ui.el(resolve(ref), { allowMissing: true })).waitFor({ state: 'hidden' });
});

When('I take a screenshot named {string}', async ({ ui, resolve, $testInfo }, name: string) => {
  await $testInfo.attach(`${resolve(name)}.png`, { body: await ui.page.screenshot(), contentType: 'image/png' });
});

Then('the page title should contain {string}', async ({ ui, resolve }, text: string) => {
  await expect(ui.page).toHaveTitle(new RegExp(escapeRegex(resolve(text))));
});

Then('the url should contain {string}', async ({ ui, resolve }, text: string) => {
  await expect(ui.page).toHaveURL(new RegExp(escapeRegex(resolve(text))));
});
