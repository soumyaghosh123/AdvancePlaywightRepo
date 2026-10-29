/** Netwealth business steps, built on CommonUtils (`common`) and WaitUtils (`wait`). */
import { Given, When } from '@app/fixtures';

Given('I am logged in to Netwealth', async ({ ui, common, wait, resolve }) => {
  await ui.open('netwealth');
  await common.fill('netwealthLogin.username', resolve('${secret.NETWEALTH_USERNAME}'));
  await common.fill('netwealthLogin.password', resolve('${secret.NETWEALTH_PASSWORD}'));
  await common.click('netwealthLogin.loginBtn');
  await wait.waitForVisible('netwealthLogin.logoutLink');
});

When('I search the quote for {string}', async ({ common, wait, resolve }, code: string) => {
  await common.click('netwealthQuote.menuLink');
  await wait.waitForUrl('QuoteSearch.aspx');
  await common.fill('netwealthQuote.searchBox', resolve(code));
  await common.click('netwealthQuote.displayBtn');
  await wait.waitForVisible('netwealthQuote.securityName');
});
