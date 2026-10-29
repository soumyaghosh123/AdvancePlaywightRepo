# Blank Playwright + TypeScript + Cucumber BDD Framework (Reusable Template) — Design Spec

**Date:** 2026-10-29 (revision 2)
**Status:** Draft, waiting for review
**Reference design:** `C:\UI_Automation_Ausiex\CTX.Web.Automation\ausiex.com.au` (Selenium + Java + Cucumber + TestNG). Used only for its structure. **No feature files, tests, locators or Java code are copied.**

---

## 1. Goals

1. A **blank, reusable framework** that any team can clone and fill with their own features, steps, page objects, locators and test data.
2. **The same layout and working style as the Selenium framework** (features → step definitions → page objects → utilities → locator files → environment property files → runner profile → hooks), so the team needs very little retraining.
3. Web and API testing (REST + SOAP) in **Cucumber BDD** format.
4. Multiple browsers, multiple operating systems, parallel runs.
5. Allure + Cucumber reports, email summary, TeamCity integration.
6. BrowserStack ready (turned on with one switch).
7. Optional enhancements: **MCP + AI** (test authoring, locator healing, failure triage), plus accessibility, visual and contract testing.

## 2. Non-goals
- Copying any existing feature files, step definitions, page objects, locators or test data.
- App-specific logic (brands, business rules). The framework is application-agnostic. Each team adds its application under `src/app/`.

## 3. Core vs. your code (the main rule)

```
src/core/   ← framework code: owned by the framework team, consumers don't edit it
src/app/    ← your code: features' steps, pages, locators, API services, custom utils
config/     ← your environments, run profiles, test data
features/   ← your Gherkin
```
- Teams **only add files** under `src/app/`, `features/`, `config/` and `test-data/`.
- Core is upgraded by pulling the template (phase 1). Later, core is published as a private npm package `@<org>/pw-bdd-core`. This works the same way as `lib/AusiexFramework-1.0-SNAPSHOT.jar` does today.
- Core reads the application folders by convention (glob discovery), so a team never has to register files.

## 4. Mapping from the Selenium framework

| Selenium framework | Playwright framework (blank) | Notes |
|---|---|---|
| `features/<module>/*.feature` | `features/<module>/*.feature` | Same Gherkin, same tags |
| `stepdefination/*StepDef.java` | `src/app/step-definitions/**/*.steps.ts` | Same `Given/When/Then` style. Optional decorator style `@When('...')` on page-object methods, which looks like Java annotations. |
| `pageobjects/*.java` | `src/app/pages/**/*.page.ts` extending `core/BasePage` | |
| `Locators.properties` | `src/app/locators/<page>.locators.json` **or** `.properties` | The loader **understands Selenium syntax** (`By.xpath("…")`, `By.id`, `By.cssSelector`, `By.name`, `By.linkText`). Teams can keep their own locator format. |
| `env.properties`, `test/uat/dev/*.properties` | `config/env/<env>.env` + `test-data/<env>/*.json` | Secrets only in `.env` / CI parameters |
| `localRun.xml` (TestNG suite: browser.connection, browser, testdata, capabilities) | `config/run-profiles/<name>.json` | Same idea: `connection` (local/headless/browserstack), `browsers`, `env`, `tags`, `workers`, `retries` |
| `Run.java` / `RunFailedScenario.java` | `npm test` / `npm run test:failed` (`--last-failed`) | |
| `Hooks.java` (@Before/@After) | `src/core/support/hooks.ts` + `src/app/hooks/*.ts` | The application can add its own hooks |
| `TestBaseProvider` (driver, ThreadLocal) | `core/fixtures` (one browser context per scenario) | Thread-safe by design |
| `ThreadLocalManager` | `ScenarioContext` (`ctx.set('orderRef', …)`) | Scoped per scenario, cleared automatically |
| `CommonUtils`, `WaitUtils`, `AssertUtils` | `core/utils/{ElementActions, WaitUtils, AssertUtils}` | Waits are mostly built in. `WaitUtils` covers the special cases. |
| `APICommonUtils` (REST-Assured + SOAP) | `core/api/{RestClient, SoapClient}` | |
| `RetryAnalyzer` / rerun.txt | `retries` + `--last-failed` | |
| `LocatorFailureAnalyzer` | `core/analysis/FailureClassifier` (+ optional AI triage) | |
| Extent / Cucumber reports | Allure + Cucumber HTML/JSON/JUnit + email | |

## 5. Technology

| Concern | Choice |
|---|---|
| Language / runtime | TypeScript 5 (strict), Node.js 24 LTS |
| BDD | `playwright-bdd` (Gherkin on top of the Playwright Test runner: projects, workers, sharding, retries, traces) |
| Runner | `@playwright/test` |
| API | Playwright `APIRequestContext`, `fast-xml-parser` (SOAP), `ajv` (JSON/OpenAPI schema) |
| Config validation | `zod` |
| Test data | JSON/YAML/CSV/Excel loaders (`exceljs`) + `@faker-js/faker` |
| Reports | `allure-playwright`, playwright-bdd Cucumber reporters (html/json/junit) |
| Email | `nodemailer` |
| Logging | `pino` |
| Quality | ESLint (`eslint-plugin-playwright`), Prettier, `gherkin-lint`, Husky + lint-staged |
| Scaffolding | `plop` generators |
| Cloud | `browserstack-node-sdk` |
| AI (optional) | `@playwright/mcp`, Playwright Test Agents, custom framework MCP server, pluggable LLM provider (Anthropic Claude by default) |

## 6. Folder structure

```
PlaywrightFramework/
├── features/                         # YOUR Gherkin
│   ├── _samples/web/sample.feature   # deletable samples
│   └── _samples/api/sample.feature
├── src/
│   ├── core/                         # FRAMEWORK (don't edit)
│   │   ├── config/                   # loads env + run profile + secrets, zod validation
│   │   ├── fixtures/                 # createBdd(), page/api/ctx fixtures, auto-discovery
│   │   ├── locators/                 # LocatorRepository, Selenium-syntax parser, fallbacks
│   │   ├── pages/BasePage.ts         # common actions
│   │   ├── steps/                    # GENERIC step library (section 7.3)
│   │   ├── api/                      # RestClient, SoapClient, auth providers
│   │   ├── utils/                    # ElementActions, WaitUtils, AssertUtils, DataUtils, DateUtils, Crypto, Random
│   │   ├── data/                     # TestDataManager (json/yaml/csv/xlsx, ${env.X} interpolation)
│   │   ├── support/                  # hooks, ScenarioContext, logger, attachments
│   │   ├── analysis/                 # FailureClassifier, (optional) AI triage + healing
│   │   └── reporting/                # summary builder, email sender, Allure categories
│   └── app/                          # YOUR CODE
│       ├── pages/                    # *.page.ts extends BasePage
│       ├── step-definitions/         # *.steps.ts
│       ├── locators/                 # *.locators.json | *.properties
│       ├── api/services/             # your REST/SOAP service wrappers
│       ├── hooks/                    # extra Before/After hooks
│       ├── fixtures/                 # extra fixtures (merged automatically)
│       └── utils/                    # your helpers
├── config/
│   ├── env/{dev,test,uat}.env        # base URLs, API endpoints (no secrets)
│   └── run-profiles/{local,headless,crossbrowser,ci,browserstack}.json
├── test-data/{dev,test,uat}/         # your data files
├── templates/{json,soap}/            # your API payload templates
├── scripts/                          # summary, email, zip, AI utilities
├── generators/                       # plop templates: page, steps, feature, locator, api-service
├── ai/                               # prompts, MCP configs, agent definitions (optional)
├── .teamcity/settings.kts
├── playwright.config.ts              # reads the run profile; not normally edited
├── browserstack.yml
├── .env.example · .mcp.json
├── docs/                             # onboarding, how-to, conventions
└── package.json · README.md · CONTRIBUTING.md
```

## 7. Core components

### 7.1 Config and run profiles
- Merge order (later wins): `config/env/<ENV>.env` → `config/run-profiles/<PROFILE>.json` → `.env` (secrets) → process environment variables → CLI.
- Run profile example (works like `localRun.xml`):
```json
{
  "connection": "local",
  "env": "test",
  "browsers": ["chromium", "firefox", "webkit"],
  "tags": "@smoke and not @wip",
  "workers": 4,
  "retries": 1,
  "headless": true,
  "video": "retain-on-failure",
  "trace": "on-first-retry"
}
```
- `connection` values: `local` | `headless` | `browserstack` | `remote` (Playwright `connectOptions` wsEndpoint for a self-hosted grid).
- The run stops at startup if a required key is missing, and the error names the key.

### 7.2 Locator repository
- Locator files are organised per page, and keys are referenced as `page.key` (e.g. `login.username`).
- Formats:
```json
// src/app/locators/login.locators.json
{
  "username": "[placeholder='Username']",
  "loginBtn": ["role=button[name='Log in']", "xpath=(//*[@type='submit'])[1]"],
  "rowByName": "xpath=//tr[td[text()='{0}']]"
}
```
```properties
# src/app/locators/login.properties  (Selenium style also accepted)
username = By.xpath(".//input[@placeholder='Username']")
loginBtn = By.cssSelector("button[type=submit]")
```
- Supported prefixes: `css=`, `xpath=`, `id=`, `text=`, `role=`, `testid=`, `label=`, `placeholder=`, plus the Selenium `By.*(...)` forms.
- **Fallback arrays:** each entry is tried in order. If an entry other than the first one matches, a warning is logged and the event is added to a "locator health" report, so teams can see which locators are going stale.
- `{0}`, `{1}` placeholders for dynamic locators.
- Frames: `"frame": "iframe#content"` in the entry, or `frameKey > elementKey`.
- At startup, `npm run locators:check` checks syntax and finds duplicate or unused keys.

### 7.3 Generic step library (write tests without code)
Teams can write scenarios straight away, using locator keys and data references, before writing any custom steps:
```gherkin
Given I open the "login" page
When I enter "${data.users.valid.username}" into "login.username"
And I enter "${secret.APP_PASSWORD}" into "login.password"
And I click "login.loginBtn"
Then "dashboard.title" should be visible
And "dashboard.title" should contain text "Dashboard"
```
Categories: navigation, click/hover/double-click, type/clear/select/check, upload/download, frames/tabs/alerts, waits, text/attribute/count/visibility assertions, table assertions, screenshot, store/reuse values (`I store text of "x" as "orderRef"`), and API steps (`I send POST to "/users" with body "createUser.json"`, `response status should be 201`, `response path "$.id" should not be empty`, `SOAP node "Status" should be "OK"`). Teams' custom steps in `src/app/step-definitions` are discovered automatically alongside the library.

### 7.4 BasePage and utilities
- `BasePage`: `open(path)`, `el(key, ...args)` (resolves through the locator repository), `click`, `fill`, `select`, `check`, `hover`, `getText`, `isVisible`, `waitFor`, `switchToTab`, `withinFrame`, `acceptDialog`, `upload`, `download`, `screenshot`.
- Teams' page objects extend `BasePage` and add business methods. They can also use raw Playwright `page`.
- `WaitUtils`: covers the cases auto-wait doesn't, such as network idle, polling until a condition holds, or a spinner disappearing. A lint rule blocks fixed sleeps.
- `AssertUtils`: soft assertions (`expect.soft`) so one scenario can collect several failures.

### 7.5 API layer
- `RestClient`: base URL per environment, auth providers (Bearer / OAuth2 client-credentials / Basic / API key / custom), JSON-schema and OpenAPI validation, automatic Allure attachment of request and response with secrets masked.
- `SoapClient`: load template → replace `${placeholders}` or XPath nodes → POST with `SOAPAction` → parse → XPath assertions.
- Teams add service wrappers in `src/app/api/services/`.

### 7.6 Test data
- `TestDataManager.get('users.valid')` reads `test-data/<ENV>/*.json|yaml|csv|xlsx`.
- Interpolation in features and data: `${data.x}`, `${env.X}`, `${secret.X}`, `${ctx.x}`, `${faker.person.firstName}`, `${today+2d:dd/MM/yyyy}`.
- Scenario Outline `Examples` can load rows from a file through a tag: `@data(test-data/users.csv)`.

### 7.7 Hooks and ScenarioContext
- Core hooks: logger tagging, attaching screenshot, URL, console errors and failed network calls on failure, cleanup.
- Application hooks: `src/app/hooks/*.ts` use the same `Before/After/BeforeAll/AfterAll` API, optionally filtered by tag (`Before({ tags: '@admin' }, …)`).

## 8. Running tests

| Capability | How |
|---|---|
| Browsers | projects: `chromium`, `chrome`, `msedge`, `firefox`, `webkit`, mobile emulation (`pixel`, `iphone`), `api` |
| Operating systems | Runs on Windows, macOS and Linux. Cross-OS via TeamCity agents and BrowserStack. |
| Parallel | `fullyParallel`, `workers`, `--shard i/n`. `@serial` tag for data-dependent features. |
| Tags | Cucumber tag expressions: `--tags "@smoke and not @wip"` |
| Rerun failed | `npm run test:failed` |
| Debug | `npm run test:debug` (headed + Playwright Inspector), `npx playwright show-trace` |
| Record | `npm run codegen` → paste the locators into the locator JSON |

npm scripts: `test`, `test:web`, `test:api`, `test:failed`, `test:debug`, `codegen`, `report:allure`, `report:open`, `report:email`, `locators:check`, `steps:list` (prints every available step, including the generic library), `generate` (plop), `lint`.

## 9. Reporting and email
- **Allure**: main dashboard. Trends (history kept between builds), categories (Locator / Test data / Environment / Assertion / Product defect), attachments, retries and flaky tests.
- **Cucumber**: HTML (business view), JSON (tool integration), JUnit XML (TeamCity Tests tab).
- **Playwright HTML**: trace viewer for debugging.
- **Locator health report**: lists fallback usage and stale locators.
- **Email** (`nodemailer`, SMTP): subject `[PASS|FAIL] <APP> <ENV> — passed/total (pass%) — Build #n`. The body has run details, counts, failures grouped by category, the flaky list and links. Attachments are included only when under `MAIL_MAX_ATTACH_MB`. `MAIL_ON=always|failure|never`. If sending fails, the build only gets a warning.
- Extent is not used because it has no maintained Node version. Allure covers the same features.

## 10. TeamCity
- Kotlin DSL in `.teamcity/settings.kts`: template `PW_BDD_Template`, configurations `Run – Windows / Linux / macOS` (agent OS requirement), composite `Run – All OS`, and an optional `Merge Reports` for sharded runs.
- Steps: `npm ci` → `playwright install --with-deps` (build cache) → fetch Allure history → `npm run test:ci` → `report:allure` (always runs) → `report:email` (always runs).
- Parameters: `env.PROFILE`, `env.ENV`, `env.TAGS`, `env.BROWSERS`, `env.WORKERS`, `env.RETRIES`, `env.MAIL_TO`, `env.MAIL_ON`. Secrets are **password** parameters.
- Features: XML Report Processing (JUnit), Build Cache, report tabs **Allure** and **Cucumber**, artifacts, failure conditions (≥1 test failed; test count drops by more than 20%).
- Proxy: `HTTPS_PROXY`/`NO_PROXY` support for browsers, API clients and BrowserStack Local.

## 11. BrowserStack
- Run profile `browserstack.json` (`connection: "browserstack"`) plus `browserstack.yml` platforms → `browserstack-node-sdk playwright test`.
- BrowserStack Local tunnel for internal URLs, through the proxy. The session link is added to Allure.
- Credentials only from `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` parameters.

## 12. Enhancements (beyond the Selenium framework)

### 12.1 MCP and AI (all **optional and off by default**; no AI call happens unless turned on)

| # | Feature | What it does | How |
|---|---|---|---|
| A1 | **Playwright MCP for authoring** | An AI assistant (Claude Code / Copilot / Cursor) opens the app in a real browser, explores a flow, and drafts the feature, locator JSON, page object and steps **in this framework's conventions** | `.mcp.json` with `@playwright/mcp`. Prompt files in `ai/prompts/` (e.g. `create-feature-from-story.md`). |
| A2 | **Framework MCP server** (`ai/mcp-server`) | Exposes tools such as `list_steps`, `list_locators`, `validate_feature`, `run_tests(tags)`, `get_last_failures`, `get_trace_summary`, so the AI reuses existing steps and locators instead of creating duplicates | Node MCP server using `@modelcontextprotocol/sdk`, registered in `.mcp.json` |
| A3 | **Playwright Test Agents** | Planner / Generator / Healer agents that explore the app, write tests and fix failing ones | `npx playwright init-agents`, set up to output Gherkin + steps in this layout |
| A4 | **User story → Gherkin** | Turns acceptance criteria (pasted text or a Jira issue) into draft `.feature` files that use the generic step library. A person reviews the draft before it's committed. | `npm run ai:feature -- --story story.md` |
| A5 | **Locator healing suggestions** | After all fallbacks fail, sends the failing key and a DOM snapshot to the LLM, which proposes a new locator. It is **never applied silently**: suggestions go into the locator-health report, and a PR patch can be generated from them. | `AI_HEALING=suggest` (default `off`) |
| A6 | **AI failure triage** | Clusters failures, explains the likely root cause (locator / data / environment / product), and adds a short summary to Allure and the email | Rule-based classifier first. LLM summary only when `AI_TRIAGE=on`. |
| A7 | **Gherkin quality review** | Checks for vague or duplicated steps, missing `Then`, and scenarios that are too long | `npm run ai:review-features` (also available as a PR check) |

Guardrails: a pluggable provider (`AI_PROVIDER=anthropic|azure-openai|bedrock`) so company policy decides which one is used. Default model is configurable (e.g. `claude-sonnet-5-5` for cost, `claude-opus-5-5` for complex generation). **PII/secret redaction** runs on DOM snapshots and logs before anything is sent. Token and cost caps apply per run. Every AI-generated artifact goes through code review.

### 12.2 Other enhancements

| # | Feature | How |
|---|---|---|
| E1 | Scaffolding generators | `npm run generate` → page + locators + steps + feature skeleton |
| E2 | Accessibility testing | `@axe-core/playwright`: step `Then the page should have no "serious" accessibility violations` |
| E3 | Visual regression | `toHaveScreenshot()` step with masks; baselines per OS/browser |
| E4 | API contract testing | OpenAPI schema validation of responses |
| E5 | Network mocking / HAR | Steps to stub endpoints or replay a HAR, for unstable downstream systems |
| E6 | Login session reuse | `storageState` cache per user role, so tests don't log in through the UI every time |
| E7 | Performance signals | Collect Web Vitals / navigation timing and attach them to Allure (optional thresholds) |
| E8 | Test-management sync | Upload results to Jira Xray / Zephyr (by `@TC-123` tags) |
| E9 | Chat notifications | Teams / Slack webhook alongside email |
| E10 | Secrets vault | Optional Azure Key Vault / HashiCorp Vault provider in addition to environment variables |
| E11 | Flaky-test quarantine | `@quarantine` tag runs but doesn't fail the build; tracked in the report |
| E12 | Dev container / Docker | Same environment for local runs and Linux CI agents |
| E13 | Core as npm package | `@<org>/pw-bdd-core` on Artifactory/Nexus, versioned like the Selenium jar |
| E14 | DB utilities | Optional SQL Server / Oracle / Postgres query helpers for test-data setup and checks |

## 13. Documentation and onboarding
- `README.md`: 10-minute quick start.
- `docs/`: writing features, the generic step catalogue (generated by `steps:list`), locator guide (formats, priority, fallbacks), page objects, API testing, test data, run profiles, reports, TeamCity, BrowserStack, AI features, troubleshooting, and **"Coming from the Selenium framework"** (based on section 4).
- `CONTRIBUTING.md`: rules for core vs app code, naming, PR checklist.

## 14. Testing the framework itself
- Unit tests for config merging, locator parsing (all formats, including Selenium `By.*`), data interpolation, SoapClient, the summary builder and email rendering.
- Self-test suite: the deletable `_samples` features (web against a public demo site, API against a local mock server started by the test) run in CI on every core change, across chromium, firefox and webkit.

## 15. Delivery phases

| Phase | Scope | Done when |
|---|---|---|
| **1. Core skeleton** | Repo, TS/lint/Husky, config + run profiles, fixtures + auto-discovery, hooks, ScenarioContext, BasePage, LocatorRepository (JSON + Selenium syntax + fallbacks), npm scripts | A sample web feature runs on 3 browsers in parallel |
| **2. Libraries** | Generic step library (web + API), RestClient, SoapClient, TestDataManager, utils, generators, `steps:list`, `locators:check` | Web and API samples pass using only generic steps; generator output compiles |
| **3. Reporting** | Allure (+categories, history), Cucumber HTML/JSON/JUnit, locator health, summary, email | One run produces all reports and the email arrives |
| **4. TeamCity** | Kotlin DSL, OS configurations, composite build, tabs, cache, failure conditions | Green composite build on Windows + Linux with email |
| **5. BrowserStack** | Profile, yml, Local tunnel, session links | Samples pass on BrowserStack Win Chrome + macOS Safari from TeamCity |
| **6. AI & MCP** | A1, A2, A6 first; then A4, A5, A3, A7 | AI drafts a passing feature for a sample story through MCP; triage summary appears in the email |
| **7. Extras** | E1–E14 by priority (suggested: E6, E2, E3, E11, E9, E8 first) | Per feature |
| **Throughout** | Docs and onboarding | A new user runs their first test in under 10 minutes using the README alone |

## 16. Risks

| Risk | Mitigation |
|---|---|
| Teams edit `src/core` and fork the framework | Lint rule plus CODEOWNERS on `src/core`. Core published as an npm package (E13). |
| Generic steps grow into an unmanageable keyword language | Fixed catalogue with review. Business flows belong in custom steps and page objects. |
| AI sends sensitive data out | Off by default, redaction, provider chosen by policy, audit log of prompts |
| Wrong AI-healed locators hide real bugs | Healing is suggestion-only. It never changes test results. |
| No macOS agent | Use BrowserStack for macOS/Safari. WebKit on Linux in the meantime. |
| SMTP restrictions | Configurable SMTP. Fall back to the TeamCity notifier or a Teams webhook. |
