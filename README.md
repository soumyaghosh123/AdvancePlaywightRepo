# Playwright + TypeScript + Cucumber BDD Framework

A blank, reusable test automation framework for **web and API (REST + SOAP)** testing in **Cucumber BDD** format.
It runs on several browsers and operating systems, in parallel.
You bring your own features, steps, page objects, locators and test data. The framework provides everything else.

It is laid out like the Selenium + Java + Cucumber framework it replaces (features → steps → page objects → locator files → environment files → run profile → hooks), so the way of working stays familiar. See [docs/coming-from-selenium.md](docs/coming-from-selenium.md).

## Quick start (about 10 minutes)

Prerequisite: **Node.js 24**.

```bash
npm ci
npx playwright install          # browsers (one-off, large download)
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
npm test                        # runs the bundled samples against a local mock app
npm run report:open             # Playwright HTML report
```

The samples in `features/_samples` run against a local mock application that starts automatically, so they need no internet access or proxy.

## Where your code goes

```
features/                 YOUR Gherkin (.feature)
src/app/
  step-definitions/       your custom steps   (import { Given, When, Then } from '@app/fixtures')
  pages/                  your page objects   (extend BasePage from '@core/index')
  locators/               your locator files  (*.locators.json or Selenium-style *.properties)
  api/services/           your REST/SOAP service wrappers
  hooks/                  your Before/After hooks
  fixtures.ts             add your own fixtures here
config/
  env/<env>.env           BASE_URL, page URLs, API URLs (no secrets)
  run-profiles/*.json     browsers, workers, retries, tags, headless (replaces localRun.xml)
test-data/<env>/          your data files (json, yaml, csv, xlsx)
templates/                API payloads: json/, soap/, schemas/
.env                      secrets for local runs (git-ignored)

src/core/                 FRAMEWORK: don't edit (owned by the framework team, see CODEOWNERS)
```

## Commands

| Command | What it does |
|---|---|
| `npm test` | Generate specs from features and run everything in the active profile |
| `npm run test:web` | Web scenarios only (everything not tagged `@api`) |
| `npm run test:api` | API scenarios only (`@api`) |
| `npm run test:failed` | Re-run the scenarios that failed last time |
| `npm run test:debug` | Headed run with the Playwright Inspector |
| `npm run report:open` | Open the HTML report (traces, screenshots, video) |
| `npm run codegen -- <url>` | Record actions to discover locators |
| `npm run steps:list` | Print every available step |
| `npm run locators:check` | Check locator syntax, duplicates and unused keys |
| `npm run generate` | Scaffold a page object + locators + steps + feature |
| `npm run lint` / `npm run lint:gherkin` | Lint TypeScript / feature files |
| `npm run test:unit` | The framework's own unit tests |
| `npm run clean:samples` | Remove the bundled samples |

### Choosing profile, environment, browsers and tags

| | PowerShell | bash |
|---|---|---|
| Profile | `$env:PROFILE='crossbrowser'; npm test` | `PROFILE=crossbrowser npm test` |
| Environment | `$env:ENV='uat'; npm test` | `ENV=uat npm test` |
| Browsers | `$env:BROWSERS='chrome,firefox'; npm test` | `BROWSERS=chrome,firefox npm test` |
| Tags | `$env:TAGS='@smoke and not @wip'; npm test` | `TAGS='@smoke and not @wip' npm test` |
| One project | `npm test -- --project=firefox` | same |
| Workers | `npm test -- --workers=6` | same |

PowerShell keeps `$env:` values for the rest of the session. Clear one with `Remove-Item Env:PROFILE`.

## Start your own project

1. `npm run clean:samples`
2. Set `BASE_URL` (and `PAGE_*` / `API_*` URLs) in `config/env/test.env`, `uat.env` and `dev.env`.
3. Put secrets in `.env` locally and in CI password parameters.
4. `npm run generate`: pick `page` and give it a name such as `Login`.
5. Fill in the locator file, write scenarios with the [generic steps](docs/step-catalogue.md), and add custom steps where business flows need them.

## Guides

- [Writing features](docs/writing-features.md): tags, custom steps, page objects, fixtures
- [Step catalogue](docs/step-catalogue.md): every built-in step with an example
- [Locators](docs/locators.md): formats, Selenium `By.*`, fallbacks, frames, parameters
- [Test data and placeholders](docs/test-data.md)
- [API testing](docs/api-testing.md): REST, auth, SOAP, schemas
- [Run profiles and configuration](docs/run-profiles.md)
- [Coming from the Selenium framework](docs/coming-from-selenium.md)
