# Coming from the Selenium framework

The structure is deliberately the same as the Selenium + Java + Cucumber + TestNG framework.

| Selenium framework | This framework |
|---|---|
| `features/<module>/*.feature` | `features/<module>/*.feature`: same Gherkin, same tags |
| `stepdefination/*StepDef.java` | `src/app/step-definitions/*.steps.ts` |
| `pageobjects/*.java` | `src/app/pages/*.page.ts` extending `BasePage` |
| `Locators.properties` | `src/app/locators/locators.json`, one section per page (same `By.*` syntax); `<page>.properties` also read while migrating |
| `env.properties`, `uat/test/dev/*.properties` | `config/env/<env>.env` + `test-data/<env>/*` + `.env` for secrets |
| `localRun.xml` (browser.connection, browser, testdata, capabilities) | `config/run-profiles/<name>.json` (`connection`, `browsers`, `env`, …) |
| `-Dbrowsertype=firefox -Denvname=uat` | `BROWSERS=firefox ENV=uat` |
| `Constants.featureTags` | `TAGS='@shakedown'` or `tags` in the profile |
| `Run.java` / `RunFailedScenario.java` | `npm test` / `npm run test:failed` |
| `Hooks.java` | core hooks + `src/app/hooks/*.ts` |
| `TestBaseProvider` (ThreadLocal driver) | fixtures: a fresh browser context per scenario, thread-safe by design |
| `ThreadLocalManager` (order refs etc.) | `ctx.set('orderRef', v)` / `${ctx.orderRef}` |
| `CommonUtils.click/enterText/getText/...` | `ui.click/fill/getText/...` (`BasePage`) |
| `WaitUtils`, `Thread.sleep` | Not needed: auto-wait and retrying assertions |
| `AssertUtils` | `Then "x" should …` steps or `expect(...)` |
| `APICommonUtils` (REST-Assured, SOAP XML) | API steps, `RestClient`, `SoapClient`, `templates/` |
| `RetryAnalyzer`, `rerun.txt` | `retries` in the profile, `npm run test:failed` |
| `LocatorFailureAnalyzer` | Locator fallbacks + `locator-fallback` annotations + clear "Tried:" errors |
| `drivers/*.exe`, WebDriverManager | `npx playwright install` (no driver binaries) |

## A step, before and after

**Java (Selenium)**

```java
@When("^User enters the valid credentials$")
public void userEntersValidCredentials() {
    CommonUtils.enterText(By(locator().getProperty("usrName_ausiex")), Properties().getProperty("username_ausiex"));
    CommonUtils.enterText(By(locator().getProperty("pwd_ausiex")), Properties().getProperty("password_ausiex"));
    CommonUtils.click(By(locator().getProperty("loginBtn")));
    WaitUtils.waitForPageToLoad();
}
```

**TypeScript (this framework)**

```ts
When('User enters the valid credentials', async ({ ui, resolve }) => {
  await ui.fill('login.username', resolve('${data.users.valid.username}'));
  await ui.fill('login.password', resolve('${secret.APP_PASSWORD}'));
  await ui.click('login.loginBtn');
});
```

You often don't need a custom step at all. The same thing with generic steps:

```gherkin
When I enter "${data.users.valid.username}" into "login.username"
And I enter "${secret.APP_PASSWORD}" into "login.password"
And I click "login.loginBtn"
```

## Reusing a Locators.properties file

Each section of your `Locators.properties` becomes a section of `src/app/locators/locators.json`; `By.xpath("...")` values can be pasted as JSON strings. As a stop-gap, a section can also be copied into `src/app/locators/<page>.properties` and is read as-is (comments and section header lines are ignored). Then run `npm run locators:check`.

Two differences to know:

- **Keys include the page (section) name.** `usrName_ausiex` in the `login` section becomes `login.usrName_ausiex`.
- **Brand suffixes become separate files or environments.** Instead of `txtDashBoard_westpac` / `txtDashBoard_ausiex`, keep one key per page and split brands by section, or by `ENV` and `config/env` values.

## Things that work differently

- **No sleeps.** Remove `Thread.sleep` and explicit waits when you port a step. Playwright waits for elements to be visible, enabled and stable before acting.
- **Secrets aren't in property files.** Put them in `.env` locally and in CI password parameters, and reference them as `${secret.NAME}`.
- **Safari.** Locally you get WebKit, which is close to Safari. Real Safari on macOS comes through BrowserStack, which is planned for phase 5.
