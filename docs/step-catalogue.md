# Step catalogue

These steps are built in. `npm run steps:list` prints the current list, including your own steps.

- **Locator arguments** are keys from `src/app/locators`, written `page.key`. A parameterised key takes its values in brackets, e.g. `page.key(John)` (see [locators.md](locators.md)).
- **Every string argument** is expanded first: `${data.x}`, `${env.X}`, `${secret.X}`, `${ctx.x}`, `${faker.person.firstName}`, `${today+2d:dd/MM/yyyy}` (see [test-data.md](test-data.md)).
- Cucumber ignores the keyword, so `Given`, `When`, `Then`, `And` and `But` are interchangeable.

## Navigation and actions

| Step | Example |
|---|---|
| `I open the {string} page` | `Given I open the "login" page` (URL from `PAGE_LOGIN` in `config/env/<env>.env`) |
| `I open url {string}` | `Given I open url "/account/summary"` (relative to `BASE_URL`) or a full URL |
| `I click {string}` | `When I click "login.loginBtn"` |
| `I double click {string}` | `When I double click "grid.row(3)"` |
| `I hover over {string}` | `When I hover over "menu.trading"` |
| `I enter {string} into {string}` | `When I enter "${data.users.valid.username}" into "login.username"` |
| `I clear {string}` | `When I clear "search.box"` |
| `I select {string} from {string}` | `When I select "India" from "profile.country"` (label first, then value) |
| `I check {string}` / `I uncheck {string}` | `When I check "terms.accept"` |
| `I press {string} on {string}` | `When I press "Enter" on "search.box"` |
| `I upload {string} to {string}` | `When I upload "test-data/test/doc.pdf" to "upload.input"` (path relative to the repo root) |
| `I accept the next dialog` | `When I accept the next dialog` (put it before the step that opens the alert) |
| `I click {string} and switch to the new tab` | `When I click "help.link" and switch to the new tab` |
| `I wait for {string} to be visible` / `hidden` | `When I wait for "app.spinner" to be hidden` |
| `I take a screenshot named {string}` | `When I take a screenshot named "after-login"` (attached to the report) |

## Assertions

Assertions wait until the condition holds or the action timeout expires, so no extra waits are needed.

| Step | Example |
|---|---|
| `{string} should be visible` / `hidden` | `Then "dashboard.title" should be visible` |
| `{string} should have text {string}` | `Then "dashboard.title" should have text "Dashboard"` (full text) |
| `{string} should contain text {string}` | `Then "alert.message" should contain text "saved"` |
| `{string} should have value {string}` | `Then "profile.email" should have value "a@b.com"` |
| `{string} should have attribute {string} with value {string}` | `Then "nav.home" should have attribute "aria-current" with value "page"` |
| `{string} should have count {int}` | `Then "orders.rows" should have count 5` |
| `{string} should be enabled` / `disabled` | `Then "order.submit" should be disabled` |
| `the page title should contain {string}` | `Then the page title should contain "Dashboard"` |
| `the url should contain {string}` | `Then the url should contain "/dashboard"` |

## Scenario values

| Step | Example |
|---|---|
| `I store text of {string} as {string}` | `When I store text of "order.reference" as "orderRef"`, then use `${ctx.orderRef}` later |
| `I store value {string} as {string}` | `When I store value "${faker.string.uuid}" as "requestId"` |
| `stored value {string} should be {string}` | `Then stored value "orderRef" should be "${data.orders.expectedRef}"` |

## REST API (tag the feature `@api`)

| Step | Example |
|---|---|
| `I use API {string}` | `Given I use API "orders"` (base URL `API_ORDERS_URL`, else `API_DEFAULT_URL`) |
| `I use API {string} with auth {string}` | `Given I use API "orders" with auth "oauth2"` (`none`, `bearer`, `basic`, `apikey`, `oauth2`) |
| `I set header {string} to {string}` | `Given I set header "X-Correlation-Id" to "${faker.string.uuid}"` |
| `I send {word} to {string}` | `When I send GET to "/orders/${ctx.orderId}"` |
| `I send {word} to {string} with body {string}` | `When I send POST to "/orders" with body "createOrder.json"` (file in `templates/json`) or inline `'{"qty": 1}'` |
| `response status should be {int}` | `Then response status should be 201` |
| `response path {string} should be {string}` | `Then response path "$.status" should be "OPEN"` (JSONPath) |
| `response path {string} should not be empty` | `Then response path "$.id" should not be empty` |
| `response should match schema {string}` | `Then response should match schema "order.schema.json"` (file in `templates/schemas`) |
| `I store response path {string} as {string}` | `When I store response path "$.id" as "orderId"` |

## SOAP (tag the feature `@api`)

| Step | Example |
|---|---|
| `I send SOAP request {string} to {string} with action {string}` | `When I send SOAP request "getPrice.xml" to "SOAP_MARKET_URL" with action "urn:GetPrice"` (template in `templates/soap`; URL or config key) |
| `SOAP node {string} should be {string}` | `Then SOAP node "Status" should be "OK"`, or a dotted path `"GetPriceResponse.Price"` |
| `I store SOAP node {string} as {string}` | `When I store SOAP node "OrderId" as "orderId"` |
