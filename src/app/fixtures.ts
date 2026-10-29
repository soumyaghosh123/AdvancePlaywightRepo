/**
 * YOUR fixture extension point. Import Given/When/Then from here in your step definitions:
 *
 *   import { Given, When, Then } from '@app/fixtures';
 *
 * To add your own page objects or helpers as fixtures, extend the core test:
 *
 *   import { LoginPage } from './pages/login.page';
 *   export const test = coreTest.extend<{ loginPage: LoginPage }>({
 *     loginPage: async ({ page, locators, cfg }, use) => use(new LoginPage(page, locators, cfg)),
 *   });
 */
import { createBdd } from 'playwright-bdd';
import { test as coreTest } from '@core/fixtures';

export const test = coreTest;

export const { Given, When, Then, Before, After } = createBdd(test);
