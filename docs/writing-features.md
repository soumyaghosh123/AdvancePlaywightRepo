# Writing features

## Feature files

Put `.feature` files anywhere under `features/`, grouped by module (`features/trading/order-placement.feature`). Start with the [generic steps](step-catalogue.md). Add custom steps when a business flow deserves one readable sentence:

```gherkin
@trading @smoke
Feature: Order placement

  Background:
    Given I am logged in as "advisor"

  Scenario: Place a market order
    When I place a market order for 100 "BHP"
    Then "orders.confirmation" should contain text "Order placed"
```

## Tags

| Tag | Effect |
|---|---|
| `@api` | Runs in the `api` project (no browser); skipped by browser projects |
| `@mode:serial` | Scenarios in this feature run one after another, in order, in one worker (for data-dependent flows such as place → amend → cancel) |
| `@retries:2` | Retries for this feature/scenario, overriding the profile |
| `@timeout:120000` | Test timeout in milliseconds |
| `@slow` | Triples the timeout |
| `@skip` / `@fixme` | Don't run |
| `@wip` | Convention for unfinished work: exclude with `TAGS='not @wip'` |
| anything else | Your own grouping (`@smoke`, `@regression`, `@trading`, …) for `TAGS` filtering |

Everything else runs in parallel: each scenario gets a fresh browser context, so cookies and storage never leak between scenarios.

## Custom steps

Create `src/app/step-definitions/<area>.steps.ts` and import from `@app/fixtures`:

```ts
import { Given, When } from '@app/fixtures';

Given('I am logged in as {string}', async ({ ui, resolve }, role: string) => {
  await ui.open('login');
  await ui.fill('login.username', resolve(`\${data.users.${role}.username}`));
  await ui.fill('login.password', resolve(`\${secret.${role.toUpperCase()}_PASSWORD}`));
  await ui.click('login.loginBtn');
});

When('I place a market order for {int} {string}', async ({ ui, ctx }, qty: number, code: string) => {
  // ...
  ctx.set('orderRef', await ui.getText('orders.reference'));
});
```

Fixtures available to every step:

| Fixture | What it is |
|---|---|
| `ui` | `BasePage`: actions on locator keys; `ui.page` is the raw Playwright page |
| `page`, `request` | Raw Playwright page and API request context |
| `locators` | Locator repository: `await locators.resolve(page, 'orders.submit')` |
| `ctx` | Scenario values: `ctx.set('x', v)` / `ctx.get('x')`, also `${ctx.x}` in features |
| `data` | Test data: `data.get('users.valid')` |
| `resolve` | Expands placeholders in a string |
| `api` | REST/SOAP session used by the API steps |
| `cfg` | Loaded configuration (`cfg.vars`, `cfg.profile`, `cfg.env`) |
| `log` | Structured logger (writes to `reports/logs/worker-<n>.log`) |
| `$testInfo` | Playwright test info (attachments, annotations) |

## Page objects

Extend `BasePage`, keep locators in the locator file, and put business methods on the class:

```ts
// src/app/pages/orders.page.ts
import { BasePage } from '@core/index';

export class OrdersPage extends BasePage {
  async placeMarketOrder(qty: number, code: string): Promise<void> {
    await this.fill('orders.code', code);
    await this.fill('orders.quantity', String(qty));
    await this.select('orders.type', 'Market');
    await this.click('orders.submit');
  }
}
```

Register it as a fixture in `src/app/fixtures.ts`, so steps receive it directly:

```ts
import { createBdd } from 'playwright-bdd';
import { test as coreTest } from '@core/fixtures';
import { OrdersPage } from './pages/orders.page';

export const test = coreTest.extend<{ ordersPage: OrdersPage }>({
  ordersPage: async ({ page, locators, cfg }, use) => use(new OrdersPage(page, locators, cfg)),
});

export const { Given, When, Then, Before, After } = createBdd(test);
```

## Hooks

`src/app/hooks/*.ts`:

```ts
import { Before, After } from '@app/fixtures';

Before({ tags: '@admin' }, async ({ ui }) => {
  await ui.open('adminHome');
});
```

The core hooks already log every scenario. For failed UI scenarios they attach the page URL and browser console errors. Screenshots, video and traces come from the run profile.

## No fixed waits

Playwright waits automatically for elements to be actionable, and assertions retry until they pass. `page.waitForTimeout` and `setTimeout` sleeps fail the lint check. To wait for something specific, use `I wait for "x" to be hidden` or `await expect(locator).toBeVisible()`.
