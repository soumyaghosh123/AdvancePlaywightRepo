# Core Skeleton & Libraries (Phases 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the blank, reusable Playwright + TypeScript + Cucumber BDD framework core: config and run profiles, a locator repository that accepts Selenium syntax, test data, fixtures, BasePage, a generic web and API step library, REST and SOAP clients, tooling and docs. Bundled samples must run offline on 3 browsers in parallel.

**Architecture:** `playwright-bdd` turns Gherkin into Playwright Test specs. Framework code lives in `src/core` and is never edited by consumers. Consumer code lives in `src/app`, `features/`, `config/`, `test-data/` and `templates/`, and is discovered by glob. `src/app/fixtures.ts` extends the core `test`, so app steps and core generic steps share one fixture tree. Samples run against a local mock server, so they need no internet or proxy.

**Tech Stack:** Node.js 24, TypeScript 5 (strict, CommonJS), `@playwright/test`, `playwright-bdd` 8.x, `zod`, `dotenv`, `yaml`, `csv-parse`, `exceljs`, `@faker-js/faker`, `date-fns`, `jsonpath-plus`, `ajv`, `fast-xml-parser`, `pino`, `tsx`, ESLint (`typescript-eslint`, `eslint-plugin-playwright`), Prettier, `gherkin-lint`, `plop`, Husky + lint-staged.

**Spec:** `docs/superpowers/specs/2026-10-29-playwright-bdd-framework-design.md` (sections 3–8, 13, 14, phases 1–2 of section 15)

## Global Constraints

- Node.js **24 LTS**. TypeScript `strict: true`. CommonJS (no `"type": "module"`).
- Path aliases: `@core/*` → `src/core/*`, `@app/*` → `src/app/*` (tsconfig `paths`; Playwright resolves them).
- Consumers only add files under `src/app/`, `features/`, `config/`, `test-data/`, `templates/`. `src/core/` is framework-owned.
- **No fixed sleeps.** ESLint must reject `page.waitForTimeout` and `setTimeout`-based waits in `src/**`.
- Secrets are read only from `.env` or the process environment, never from `config/env/*.env` or the repo. `.env` is git-ignored.
- Config merge order (later wins): `config/env/<ENV>.env` → `config/run-profiles/<PROFILE>.json` → `.env` → process env → (CLI where Playwright supports it).
- Default profile `local`, default env `test`.
- Browser projects: `chromium`, `chrome`, `msedge`, `firefox`, `webkit`, `pixel`, `iphone`, plus `api`. API features are tagged `@api`. Web projects `grepInvert` `@api`, and the `api` project `grep`s `@api`.
- Locator prefixes: `css=`, `xpath=`, `id=`, `text=`, `role=`, `testid=`, `label=`, `placeholder=`, plus Selenium `By.xpath|id|cssSelector|name|linkText|partialLinkText|className|tagName("…")`.
- Locator keys are `page.key`. Page = locator file basename without `.locators.json` / `.properties`. Parameterised keys use `{0}`, `{1}` in values and `page.key(arg1, arg2)` in references.
- Interpolation: `${data.x}`, `${env.X}`, `${secret.X}`, `${ctx.x}`, `${faker.<module>.<fn>}`, `${today}`, `${today±N(d|w|m|y)[:format]}`. Default date format `yyyy-MM-dd`. `\${` is a literal.
- Outputs go under `reports/` (git-ignored). Playwright HTML → `reports/playwright`.
- Mock server for samples: `http://localhost:3999`.
- Commit after every task. Messages use `feat:` / `chore:` / `docs:` / `test:` prefixes and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Selenium `.properties` values containing `=`, single quotes, or escaped double quotes** (e.g. `By.xpath("//a[@href='x=1' and text()=\"Go\"]")`). These must parse whole; the first `=` is the key separator. Test in Task 4.
2. **CRLF line endings and UTF-8 BOM** in `.properties` and `.env` files written on Windows. Keys and values must not keep `\r` or the BOM. Test in Tasks 2 and 4.
3. **Text containing `$` that isn't a placeholder** (`"$100"`, XPath `$var`, `"${"` without closing) must pass through `interpolate` unchanged. Only a well-formed `${…}` is processed, and an unknown root errors. Test in Task 5.
4. **Missing env file, missing `BASE_URL`, unknown `PROFILE`, or invalid profile JSON.** The error must name the file or key. Test in Task 2.
5. **Locator with fallbacks where nothing matches.** The error names the key and every candidate tried. A single-candidate locator must not pre-poll (it relies on Playwright auto-wait). Test in Task 4.

Bonus check in Task 9: tokens and passwords must be masked as `***` in API attachments.

---

## File Map

```
package.json, tsconfig.json, .gitignore, .prettierrc, eslint.config.mjs, .gherkinrc / .gherkin-lintrc,
playwright.config.ts, playwright.unit.config.ts, plopfile.cjs, CODEOWNERS, .env.example, README.md
config/env/{dev,test,uat}.env
config/run-profiles/{local,headless,crossbrowser,ci}.json
src/core/index.ts                         public exports for app code
src/core/errors.ts                        ConfigError, LocatorSyntaxError, UnknownLocatorError, LocatorNotFoundError, InterpolationError
src/core/config/schema.ts                 RunProfileSchema, BrowserName, FrameworkConfig
src/core/config/loadConfig.ts             loadConfig(), getConfig(), getSecret()
src/core/config/projects.ts               buildProjects(cfg)
src/core/locators/parseLocator.ts         parseLocator(), parseKeyRef(), fillParams()
src/core/locators/loadLocatorFiles.ts     loadLocatorFiles(), parseProperties()
src/core/locators/LocatorRepository.ts    LocatorRepository
src/core/data/TestDataManager.ts          TestDataManager
src/core/data/interpolate.ts              interpolate()
src/core/support/ScenarioContext.ts       ScenarioContext
src/core/support/logger.ts                createLogger()
src/core/support/hooks.ts                 core Before/After
src/core/pages/BasePage.ts                BasePage
src/core/fixtures/index.ts                test, Given/When/Then/Before/After
src/core/api/mask.ts                      maskSecrets()
src/core/api/auth.ts                      AuthProvider + factories + createAuth()
src/core/api/RestClient.ts                RestClient
src/core/api/SoapClient.ts                SoapClient
src/core/api/ApiSession.ts                ApiSession
src/core/steps/{web,assert,context,api}.steps.ts
src/app/fixtures.ts                       consumer fixture extension point (template)
src/app/{pages,step-definitions,locators,api/services,hooks,utils}/.gitkeep
src/app/locators/{sampleLogin.locators.json,sampleSecure.properties,sampleTable.locators.json}
features/_samples/web/*.feature, features/_samples/api/*.feature
test-data/test/users.json, templates/json/createUser.json, templates/soap/echo.xml, templates/schemas/user.schema.json
tests/mock-server/server.ts
tests/unit/*.spec.ts
scripts/locators-check.ts, scripts/clean-samples.ts
generators/*.hbs
docs/{writing-features,step-catalogue,locators,test-data,api-testing,run-profiles,coming-from-selenium}.md
```

---

### Task 1: Project bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.prettierrc`, `eslint.config.mjs`, `playwright.unit.config.ts`, `tests/unit/sanity.spec.ts`

**Interfaces:**
- Produces: npm scripts `test:unit`, `lint`, `typecheck`. Aliases `@core/*`, `@app/*`.

- [ ] **Step 1: Initialise the repo.** Run `git init` in `C:\PlaywrightFramework`. Then `npm init -y`, set `"private": true` and `"engines": { "node": ">=24" }`.
- [ ] **Step 2: Install dependencies.**
  Runtime: `@playwright/test playwright-bdd zod dotenv yaml csv-parse exceljs @faker-js/faker date-fns jsonpath-plus ajv ajv-formats fast-xml-parser pino`.
  Dev: `typescript tsx @types/node eslint typescript-eslint eslint-plugin-playwright prettier gherkin-lint plop husky lint-staged`.
  Then `npx playwright install chromium firefox webkit`.
- [ ] **Step 3: Write `tsconfig.json`.** `strict`, `target ES2022`, `module commonjs`, `moduleResolution node`, `esModuleInterop`, `resolveJsonModule`, `experimentalDecorators: false`, `baseUrl "."`, `paths { "@core/*": ["src/core/*"], "@app/*": ["src/app/*"] }`. Include `src`, `tests`, `scripts`, `*.ts`.
- [ ] **Step 4: Write `.gitignore`.** `node_modules/ reports/ test-results/ .features-gen/ .env playwright/.cache/ blob-report/`
- [ ] **Step 5: Write `eslint.config.mjs`.** Flat config with `typescript-eslint` recommended and `eslint-plugin-playwright`, plus this `no-restricted-syntax` rule for `src/**`:
```js
{ selector: "CallExpression[callee.property.name='waitForTimeout']", message: 'Fixed sleeps are banned. Use auto-wait, expect.poll or WaitUtils.' },
{ selector: "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']", message: 'Fixed sleeps are banned.' }
```
- [ ] **Step 6: Write `playwright.unit.config.ts`.** `testDir: 'tests/unit'`, one project `unit` using `devices['Desktop Chrome']` (some unit tests need `page.setContent`), `reporter: 'list'`.
- [ ] **Step 7: Write the sanity test** `tests/unit/sanity.spec.ts`: `test('alias resolves', async () => { const m = await import('@core/errors'); expect(m.ConfigError).toBeDefined(); })`.
- [ ] **Step 8: Run `npm run test:unit`.** Expected: FAIL, cannot find module `@core/errors`.
- [ ] **Step 9: Create `src/core/errors.ts`.** Classes `ConfigError`, `LocatorSyntaxError`, `UnknownLocatorError`, `LocatorNotFoundError` and `InterpolationError`, each `extends Error` with `name` set to the class name.
- [ ] **Step 10: Add scripts:** `"test:unit": "playwright test -c playwright.unit.config.ts"`, `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`. Run `npm run test:unit && npm run lint && npm run typecheck`. Expected: all pass.
- [ ] **Step 11: Commit** `chore: bootstrap TypeScript Playwright project`.

---

### Task 2: Config loader and run profiles

**Files:**
- Create: `src/core/config/schema.ts`, `src/core/config/loadConfig.ts`, `config/env/{dev,test,uat}.env`, `config/run-profiles/{local,headless,crossbrowser,ci}.json`, `.env.example`
- Test: `tests/unit/config.spec.ts` (fixtures under `tests/unit/fixtures/config/`)

**Interfaces:**
- Produces:
```ts
export const BrowserNames = ['chromium','chrome','msedge','firefox','webkit','pixel','iphone'] as const;
export type BrowserName = typeof BrowserNames[number];
export const RunProfileSchema: z.ZodType<RunProfile>;  // fields + defaults below
export interface RunProfile {
  connection: 'local'|'headless'|'browserstack'|'remote';   // default 'local'
  env: string;                     // default 'test'
  browsers: BrowserName[];         // default ['chromium']
  tags?: string;                   // cucumber tag expression
  workers?: number;                // positive int
  retries: number;                 // default 0
  headless: boolean;               // default true
  trace: 'off'|'on'|'retain-on-failure'|'on-first-retry'; // default 'on-first-retry'
  video: 'off'|'on'|'retain-on-failure';                  // default 'retain-on-failure'
  screenshot: 'off'|'on'|'only-on-failure';               // default 'only-on-failure'
  actionTimeoutMs: number;         // default 15000
  remoteWsEndpoint?: string;       // required when connection='remote'
}
export interface FrameworkConfig {
  rootDir: string; profileName: string; profile: RunProfile; env: string;
  baseUrl: string;                 // vars.BASE_URL, required
  vars: Record<string,string>;     // env file + .env + process env merged
}
export function loadConfig(opts?: { rootDir?: string; processEnv?: Record<string,string|undefined> }): FrameworkConfig;
export function getConfig(): FrameworkConfig;            // cached loadConfig()
export function getSecret(cfg: FrameworkConfig, name: string): string;
```
- Env overrides read from `processEnv`: `PROFILE`, `ENV`, `BROWSERS` (comma list), `TAGS`, `WORKERS`, `RETRIES`, `HEADLESS` (`true|false`), `CONNECTION`.

- [ ] **Step 1: Write failing tests** in `tests/unit/config.spec.ts`. Each test uses a temp `rootDir` copied from `tests/unit/fixtures/config/`.
```ts
test('defaults to local profile and test env', ...)            // expect(cfg.profileName).toBe('local'); expect(cfg.env).toBe('test'); expect(cfg.baseUrl).toBe('http://localhost:3999')
test('profile values override env file, process env overrides profile', ...) // processEnv {PROFILE:'crossbrowser', BROWSERS:'firefox,webkit', WORKERS:'6'} → browsers ['firefox','webkit'], workers 6
test('ENV selects env file', ...)                              // ENV=uat → cfg.vars.BASE_URL from uat.env
test('.env values are loaded and process env wins', ...)        // .env SECRET_A=file, processEnv SECRET_A=proc → getSecret(cfg,'SECRET_A')==='proc'
test('missing env file names the file', ...)                   // ENV=nope → toThrow(/config[\\/]env[\\/]nope\.env/)
test('missing BASE_URL names the key and file', ...)           // toThrow(/BASE_URL.*test\.env/)
test('unknown profile names the profile file', ...)            // PROFILE=ghost → toThrow(/run-profiles[\\/]ghost\.json/)
test('invalid profile JSON reports field', ...)                // browsers:['opera'] → toThrow(/browsers/)
test('remote connection requires remoteWsEndpoint', ...)       // toThrow(/remoteWsEndpoint/)
test('CRLF and BOM in env files are stripped', ...)            // file "\uFEFFBASE_URL=http://x\r\nA=1\r\n" → baseUrl 'http://x', vars.A==='1'
test('getSecret error explains where to set it', ...)          // toThrow('Missing secret NOPE: set it in .env or as a CI parameter')
```
- [ ] **Step 2: Run** `npx playwright test -c playwright.unit.config.ts config`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `schema.ts` and `loadConfig.ts`.** Parse env files with `dotenv.parse` after stripping the BOM (`dotenv` handles CRLF). All errors are `ConfigError`. Zod issues are formatted as `"<profile file>: <path>: <message>"`.
- [ ] **Step 4: Create the config files.**
  - `config/env/test.env`: `BASE_URL=http://localhost:3999`, `API_DEFAULT_URL=http://localhost:3999/api`, `PAGE_SAMPLE_LOGIN=http://localhost:3999/sample/login`, `PAGE_SAMPLE_TABLE=http://localhost:3999/sample/table`, `API_SAMPLE_URL=http://localhost:3999/api`, `API_SAMPLE_TOKEN_URL=http://localhost:3999/api/token`, `SOAP_SAMPLE_URL=http://localhost:3999/soap/echo`, `SAMPLE_USERNAME=tomsmith`, `SAMPLE_PASSWORD=sample-password`. Add a header comment: "Replace BASE_URL with your application. Non-secret values only."
  - `dev.env` and `uat.env`: the same keys, with `BASE_URL=https://dev.example.invalid` / `https://uat.example.invalid` placeholders and the same comment.
  - Profiles:
    - `local.json`: `{"connection":"local","headless":false,"browsers":["chromium"]}`
    - `headless.json`: `{"connection":"headless","browsers":["chromium"]}`
    - `crossbrowser.json`: `{"connection":"headless","browsers":["chromium","firefox","webkit"],"workers":4,"retries":1}`
    - `ci.json`: `{"connection":"headless","browsers":["chromium"],"workers":4,"retries":1}`
  - `.env.example`: lists `API_SAMPLE_CLIENT_ID=sample-client`, `API_SAMPLE_CLIENT_SECRET=sample-secret` and commented examples `# APP_PASSWORD=`.
- [ ] **Step 5: Run the tests.** Expected: PASS (11 tests).
- [ ] **Step 6: Commit** `feat: config loader with env files, run profiles and secrets`.

---

### Task 3: Locator syntax parser

**Files:**
- Create: `src/core/locators/parseLocator.ts`
- Test: `tests/unit/parseLocator.spec.ts`

**Interfaces:**
- Produces:
```ts
export type LocatorDescriptor =
  | { kind: 'selector'; selector: string }             // passed to root.locator()
  | { kind: 'role'; role: string; name?: string; exact?: boolean }
  | { kind: 'testid' | 'label' | 'placeholder'; value: string };
export function parseLocator(raw: string): LocatorDescriptor;      // throws LocatorSyntaxError
export function parseKeyRef(ref: string): { key: string; args: string[] }; // "table.row(John, 2)" → {key:'table.row', args:['John','2']}
export function fillParams(raw: string, args: string[]): string;    // replaces {0},{1}; throws LocatorSyntaxError if a placeholder has no arg
```

- [ ] **Step 1: Write failing tests**, table-driven:
```ts
const cases: [string, LocatorDescriptor][] = [
  ['css=button.primary', { kind:'selector', selector:'css=button.primary' }],
  ['xpath=//a', { kind:'selector', selector:'xpath=//a' }],
  ['//div[@id="x"]', { kind:'selector', selector:'xpath=//div[@id="x"]' }],
  ['(//*[@type="submit"])[1]', { kind:'selector', selector:'xpath=(//*[@type="submit"])[1]' }],
  ['[placeholder="Username"]', { kind:'selector', selector:'[placeholder="Username"]' }],
  ['id=password', { kind:'selector', selector:'id=password' }],
  ['text=Log in', { kind:'selector', selector:'text=Log in' }],
  ["role=button[name='Log in']", { kind:'role', role:'button', name:'Log in' }],
  ['role=heading', { kind:'role', role:'heading' }],
  ['testid=submit', { kind:'testid', value:'submit' }],
  ['label=Email', { kind:'label', value:'Email' }],
  ['placeholder=Search', { kind:'placeholder', value:'Search' }],
  ['By.xpath(".//input[@placeholder=\'Username\']")', { kind:'selector', selector:"xpath=.//input[@placeholder='Username']" }],
  ['By.xpath("//a[@href=\'x=1\' and text()=\\"Go\\"]")', { kind:'selector', selector:'xpath=//a[@href=\'x=1\' and text()="Go"]' }],
  ['By.id("password")', { kind:'selector', selector:'id=password' }],
  ['By.cssSelector("button[type=submit]")', { kind:'selector', selector:'css=button[type=submit]' }],
  ['By.name("q")', { kind:'selector', selector:'css=[name="q"]' }],
  ['By.linkText("Help")', { kind:'selector', selector:'css=a:text-is("Help")' }],
  ['By.partialLinkText("Hel")', { kind:'selector', selector:'css=a:has-text("Hel")' }],
  ['By.className("btn")', { kind:'selector', selector:'css=.btn' }],
  ['By.tagName("h1")', { kind:'selector', selector:'css=h1' }],
  ['  By.id("x")  ', { kind:'selector', selector:'id=x' }],
];
test('By.foo is rejected', () => expect(() => parseLocator('By.foo("x")')).toThrow(LocatorSyntaxError));
test('empty is rejected', () => expect(() => parseLocator('  ')).toThrow(/empty locator/));
test('parseKeyRef', ...)   // 'login.btn' → args []; 'table.row(John Smith, 2)' → ['John Smith','2']; 'a.b()' → []
test('fillParams', ...)    // "//tr[td='{0}'][{1}]" + ['A','2'] → "//tr[td='A'][2]"; missing arg → toThrow(/\{1\}/)
```
- [ ] **Step 2: Run** `npx playwright test -c playwright.unit.config.ts parseLocator`. Expected: FAIL.
- [ ] **Step 3: Implement.** For Selenium forms, match `^By\.(\w+)\(\s*"((?:[^"\\]|\\.)*)"\s*\)$`, then unescape `\"` → `"`. For `role=`, parse `^role=([a-z]+)(?:\[name=(['"])(.*)\2\])?$`. Strings starting with `/` or `(/` get the `xpath=` prefix.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: locator parser supporting Playwright prefixes and Selenium By syntax`.

---

### Task 4: Locator files and LocatorRepository with fallbacks

**Files:**
- Create: `src/core/locators/loadLocatorFiles.ts`, `src/core/locators/LocatorRepository.ts`
- Test: `tests/unit/locatorFiles.spec.ts`, `tests/unit/locatorRepository.spec.ts` (fixtures in `tests/unit/fixtures/locators/`)

**Interfaces:**
- Consumes: `parseLocator`, `parseKeyRef`, `fillParams` (Task 3). Errors (Task 1).
- Produces:
```ts
export interface LocatorEntry { candidates: string[]; frame?: string; source: string }
export type LocatorMap = Record<string, LocatorEntry>;          // key 'page.key'
export function parseProperties(text: string): Record<string,string>;
export function loadLocatorFiles(dir: string): LocatorMap;      // recursive; *.locators.json + *.properties
export interface FallbackEvent { key: string; usedIndex: number; candidate: string }
export class LocatorRepository {
  constructor(map: LocatorMap, opts?: { fallbackTimeoutMs?: number; onFallback?: (e: FallbackEvent) => void });
  static fromDir(dir: string, opts?: ConstructorParameters<typeof LocatorRepository>[1]): LocatorRepository;
  keys(): string[];
  get(key: string): LocatorEntry;                               // UnknownLocatorError "Unknown locator 'login.usrname'. Did you mean 'login.username'?"
  resolve(root: Page, ref: string): Promise<Locator>;           // ref may include args: 'table.row(John)'
}
```
- JSON value forms: `"sel"` | `["sel1","sel2"]` | `{ "candidates": [...], "frame": "iframe#x" }` | `{ "value": "sel", "frame": "..." }`.
- `.properties` rules: `#`, `!` and `//` lines are comments. Lines without `=` are ignored (Selenium section headers). Split on the first `=`, then trim key and value. Strip the BOM and `\r`.
- Resolution: with one candidate, return the locator immediately (no polling). With several, poll every 100 ms up to `fallbackTimeoutMs` (default 5000) and return the first whose `count() > 0`. If the matching index is above 0, call `onFallback`. If none matches, throw `LocatorNotFoundError` with this message:
  `Locator 'page.key' not found after 5000ms. Tried:\n  1. <c1>\n  2. <c2>`
- Duplicate keys across files throw `ConfigError` naming both source files.

- [ ] **Step 1: Write failing tests for files.**
```ts
test('json string, array and object forms', ...)    // map['login.username'].candidates == ['[placeholder="Username"]']; ['login.loginBtn'].candidates.length==2; ['frame.inner'].frame=='iframe#f'
test('properties with Selenium values, = and quotes inside', ...) // advance=By.xpath("//a[text()='Advanced Search']|//button[contains(text(),'Advanced')]") parsed whole
test('properties ignores comments and section headers', ...) // "//****\nLogin_Page\n# c\nk=v" → {k:'v'}
test('CRLF and BOM are stripped', ...)               // "\uFEFFa=b\r\nc=d\r\n" → {a:'b', c:'d'}
test('page name from file name', ...)                // sampleSecure.properties → 'sampleSecure.flash'
test('duplicate key across files names both files', ...) // toThrow(/a\.locators\.json.*a\.properties/s)
```
- [ ] **Step 2: Write failing repository tests.** These use the `page` fixture and `page.setContent('<input placeholder="Username"><button>Log in</button><iframe id="f" srcdoc="<p id=inner>hi</p>"></iframe><table><tr><td>John</td></tr></table>')`.
```ts
test('single candidate resolves without polling', ...)   // const t=Date.now(); await repo.resolve(page,'login.missingSingle'); expect(Date.now()-t).toBeLessThan(50)
test('first candidate used, no fallback event', ...)
test('fallback used and reported', ...)                   // candidates ['#nope','text=Log in'] → onFallback called with {key, usedIndex:1, candidate:'text=Log in'}
test('none match lists key and all candidates', ...)      // fallbackTimeoutMs 300 → toThrow(/Locator 'login.ghost' not found after 300ms[\s\S]*1\. #a[\s\S]*2\. #b/)
test('parameterised ref', ...)                            // 'table.rowByName(John)' with "xpath=//tr[td[text()='{0}']]" → toHaveCount(1)
test('frame entry resolves inside iframe', ...)           // await expect(await repo.resolve(page,'frame.inner')).toHaveText('hi')
test('role, label, testid descriptors build getBy* locators', ...)
test('unknown key suggests closest', ...)                 // toThrow("Unknown locator 'login.usrname'. Did you mean 'login.username'?")
```
- [ ] **Step 3: Run** `npx playwright test -c playwright.unit.config.ts locator`. Expected: FAIL.
- [ ] **Step 4: Implement both files.** Build descriptors with `root.locator()`, `getByRole(role, { name, exact })`, `getByTestId`, `getByLabel` and `getByPlaceholder`. When `frame` is set, the root becomes `page.frameLocator(frame)`. For "did you mean", use Levenshtein distance ≤ 3 and pick the smallest.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit** `feat: locator repository with json/properties files, fallbacks and frames`.

---

### Task 5: Test data manager and interpolation

**Files:**
- Create: `src/core/data/TestDataManager.ts`, `src/core/data/interpolate.ts`
- Test: `tests/unit/testData.spec.ts`, `tests/unit/interpolate.spec.ts` (fixtures `tests/unit/fixtures/data/{users.json,roles.yaml,accounts.csv,limits.xlsx}`)

**Interfaces:**
- Produces:
```ts
export class TestDataManager {
  static load(dir: string): Promise<TestDataManager>;   // preloads json/yaml/yml/csv/xlsx; dir may not exist → empty
  get<T = unknown>(path: string): T;                    // 'users.valid.username', 'accounts[0].id'; throws ConfigError "Test data 'users.nope' not found in test-data/test"
}
export interface InterpolationSources {
  data: (path: string) => unknown;
  env: Record<string,string>;
  secret: (name: string) => string;
  ctx: (key: string) => unknown;
  now?: () => Date;
}
export function interpolate(input: string, s: InterpolationSources): string;
```
- CSV becomes an array of records (header row). XLSX: each sheet becomes an array of records, accessed as `<file>.<sheet>[i].<col>`.
- Placeholder grammar: `\$\{(data|env|secret|ctx|faker|today)([^}]*)\}`. Any other `${root…}` throws `InterpolationError "Unknown placeholder ${foo.x}"`. Text without a closing `}` is left unchanged. `\${` becomes a literal `${`.
- `today` modifiers: `today`, `today+2d`, `today-1w`, `today+3m`, `today+1y`, with optional `:<date-fns format>`.
- `faker.<module>.<fn>` calls `faker[module][fn]()`. If it doesn't exist, throw `InterpolationError`.
- Non-string values from `data` and `ctx` are converted with `String()`. Objects are converted with `JSON.stringify`.

- [ ] **Step 1: Write failing tests.**
```ts
// testData.spec.ts
test('json/yaml/csv/xlsx lookups', ...)  // get('users.valid.username')=='tomsmith'; get('roles.admin.level')==5; get('accounts[1].id')=='A2'; get('limits.Sheet1[0].max')==100
test('missing path names path and dir', ...)
test('missing dir is empty manager', ...)
// interpolate.spec.ts
test('data env secret ctx', ...)          // "${data.users.valid.username}/${env.A}/${secret.S}/${ctx.ref}" → "tomsmith/1/s3/R-9"
test('today math and format', ...)        // now=2026-10-29 → "${today}"=="2026-10-29"; "${today+2d:dd/MM/yyyy}"=="31/10/2026"; "${today-1m}"=="2026-09-29"
test('faker returns non-empty', ...)      // "${faker.person.firstName}".length>0
test('non-placeholder dollars untouched', ...) // ["$100", "//a[$x]", "cost ${", "a $ {b}"] each returned unchanged
test('escaped literal', ...)              // "\\${data.x}" → "${data.x}"
test('unknown root errors', ...)          // "${foo.x}" → toThrow('Unknown placeholder ${foo.x}')
test('missing secret propagates getSecret message', ...)
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Path lookup splits on `.` and `[n]`. XLSX is loaded with `exceljs` `workbook.xlsx.readFile`. Dates use `date-fns` `add`/`sub` and `format`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: test data manager and placeholder interpolation`.

---

### Task 6: ScenarioContext, logger and BasePage

**Files:**
- Create: `src/core/support/ScenarioContext.ts`, `src/core/support/logger.ts`, `src/core/pages/BasePage.ts`
- Test: `tests/unit/scenarioContext.spec.ts`, `tests/unit/basePage.spec.ts`

**Interfaces:**
- Consumes: `LocatorRepository.resolve` (Task 4), `FrameworkConfig` (Task 2).
- Produces:
```ts
export class ScenarioContext {
  set(key: string, value: unknown): void;
  get<T = unknown>(key: string): T;   // throws Error "Scenario value 'x' was never stored. Stored keys: a, b"
  has(key: string): boolean;
  keys(): string[];
}
export function createLogger(opts: { workerIndex: number; dir?: string }): import('pino').Logger; // file reports/logs/worker-<n>.log
export class BasePage {
  constructor(page: Page, locators: LocatorRepository, cfg: FrameworkConfig);
  get page(): Page;
  usePage(page: Page): void;                        // switch active tab
  el(ref: string): Promise<Locator>;
  open(target: string): Promise<void>;              // http(s) or '/' → goto; else cfg.vars[`PAGE_${NAME}`]; NAME = target upper-cased, non-alphanumerics → '_' ("sample login"/"sampleLogin" → PAGE_SAMPLE_LOGIN via camelCase split)
  click(ref: string): Promise<void>;
  doubleClick(ref: string): Promise<void>;
  hover(ref: string): Promise<void>;
  fill(ref: string, value: string): Promise<void>;
  clear(ref: string): Promise<void>;
  select(ref: string, valueOrLabel: string): Promise<void>;   // tries {label} then value
  check(ref: string): Promise<void>;
  uncheck(ref: string): Promise<void>;
  press(ref: string, keys: string): Promise<void>;
  upload(ref: string, filePath: string): Promise<void>;
  getText(ref: string): Promise<string>;           // innerText trimmed
  isVisible(ref: string): Promise<boolean>;
  acceptNextDialog(): void;
  clickAndSwitchToNewTab(ref: string): Promise<Page>;
}
```
- `open` with an unknown page name throws `ConfigError "No URL for page 'x'. Add PAGE_X=<url or /path> to config/env/<env>.env"`.

- [ ] **Step 1: Write failing tests.**
```ts
test('ctx set/get/has and helpful missing error', ...)
test('open resolves PAGE_ var, camelCase and spaces', ...)   // vars {PAGE_SAMPLE_LOGIN:'about:blank'} → open('sampleLogin') and open('sample login') both go to about:blank
test('open unknown page names the var to add', ...)          // toThrow(/PAGE_GHOST=.*config\/env\/test\.env/)
test('fill/click/getText via locator keys', ...)             // setContent form; fill('login.username','bob'); expect input value 'bob'
test('select by label then value', ...)
test('clickAndSwitchToNewTab returns new page and usePage switches', ...) // <a target=_blank href="about:blank#2">
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** BasePage methods resolve `el(ref)` and then call the matching Playwright action. No extra waits: Playwright auto-waits up to `actionTimeout`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: ScenarioContext, logger and BasePage`.

---

### Task 7: Fixtures, hooks, Playwright config, mock server and first runnable feature

**Files:**
- Create: `src/core/fixtures/index.ts`, `src/core/support/hooks.ts`, `src/core/config/projects.ts`, `src/core/index.ts`, `src/app/fixtures.ts`, `src/app/{pages,step-definitions,locators,api/services,hooks,utils}/.gitkeep`, `playwright.config.ts`, `tests/mock-server/server.ts`, `src/core/steps/web.steps.ts` (first 2 steps only), `features/_samples/web/smoke.feature`
- Test: `tests/unit/projects.spec.ts`, `tests/unit/mockServer.spec.ts`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces:
```ts
// src/core/fixtures/index.ts
type WorkerFixtures = { cfg: FrameworkConfig; locators: LocatorRepository; data: TestDataManager; log: Logger };
type TestFixtures  = { ctx: ScenarioContext; resolve: (text: string) => string; ui: BasePage; api: ApiSession /* added in Task 10 */ };
export const test: TestType<...>;   // playwright-bdd `test.extend<TestFixtures, WorkerFixtures>`
export const { Given, When, Then, Before, After, BeforeAll, AfterAll } = createBdd(test);
// src/app/fixtures.ts (consumer extension point)
export const test = coreTest.extend<{}>({});    // comment: "add your fixtures here"
export const { Given, When, Then, Before, After } = createBdd(test);
// src/core/config/projects.ts
export function buildProjects(cfg: FrameworkConfig): PlaywrightTestProject[];
// src/core/index.ts re-exports: BasePage, ScenarioContext, LocatorRepository, getConfig, getSecret, interpolate, errors, types
```
- `locators` fixture: `LocatorRepository.fromDir('src/app/locators', { onFallback })`. `onFallback` adds a test annotation `{ type: 'locator-fallback', description: 'key → #index candidate' }`.
- `data` fixture: `TestDataManager.load('test-data/<env>')`.
- `resolve`: `interpolate(text, { data: k => data.get(k), env: cfg.vars, secret: n => getSecret(cfg, n), ctx: k => ctx.get(k) })`.
- `projects.ts` mapping:
  - chromium → `devices['Desktop Chrome']`
  - chrome → `+channel:'chrome'`
  - msedge → `devices['Desktop Edge'] + channel:'msedge'`
  - firefox → `devices['Desktop Firefox']`
  - webkit → `devices['Desktop Safari']`
  - pixel → `devices['Pixel 7']`
  - iphone → `devices['iPhone 15']`
  - Every web project gets `grepInvert: /@api/`. The `api` project gets `grep: /@api/`, `use: {}` (no browser) and is always added.
  - `connection` headless → `headless:true`. local → `profile.headless`. remote → `use.connectOptions = { wsEndpoint }`. browserstack → throw `ConfigError "connection 'browserstack' is enabled in phase 5 (BrowserStack plan)"`.
- `playwright.config.ts`:
```ts
const cfg = getConfig();
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['src/core/steps/**/*.ts', 'src/core/support/hooks.ts', 'src/app/**/*.ts'],
  tags: cfg.profile.tags,
});
export default defineConfig({
  testDir, fullyParallel: true, workers: cfg.profile.workers, retries: cfg.profile.retries,
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }]],
  use: { baseURL: cfg.baseUrl, trace: cfg.profile.trace, video: cfg.profile.video, screenshot: cfg.profile.screenshot, actionTimeout: cfg.profile.actionTimeoutMs },
  projects: buildProjects(cfg),
  webServer: fs.existsSync('features/_samples')
    ? { command: 'npx tsx tests/mock-server/server.ts', url: 'http://localhost:3999/health', reuseExistingServer: true }
    : undefined,
});
```
- Hooks (`src/core/support/hooks.ts`): `After({ tags: 'not @api' }, async ({ page, $testInfo }) => …)`. When `$testInfo.status !== $testInfo.expectedStatus`, attach `page-url.txt` and `console-errors.txt` (collected by an auto fixture that listens to `page.on('console')` for type `error` and to `pageerror`).
- Mock server routes (plain `node:http`, port from `PORT` or 3999):
  - `GET /health` → 200 `ok`
  - `GET /sample/login` → HTML with `<label>Username <input name=username placeholder=Username></label>`, a password field `id=password`, `<button>Log in</button>`. Submitting with `tomsmith`/`sample-password` redirects to `/sample/secure`, otherwise it shows `<div id=flash>Your username is invalid!</div>`.
  - `GET /sample/secure` → `<h2>Secure Area</h2><div id=flash>You logged into a secure area!</div><a href=/sample/login>Logout</a>`
  - `GET /sample/table` → a table with 3 rows (John/Jane/Raj), a `<select id=country>` and a link `target=_blank`
  - `POST /api/token` with form `grant_type=client_credentials&client_id=sample-client&client_secret=sample-secret` → `{access_token:'sample-token', token_type:'Bearer', expires_in:3600}`, otherwise 401
  - `POST /api/users` with Bearer `sample-token` → 201 `{id:'u-1', name}`, otherwise 401
  - `GET /api/users/:id` → 200 `{id, name:'Sample'}`
  - `GET /api/flaky` → 503 on the first call **per server instance** (counter held on the instance created by `startMockServer`), then 200
  - `POST /soap/echo` → SOAP 1.1 envelope `<soap:Envelope><soap:Body><ns:EchoResponse><ns:Status>OK</ns:Status><ns:Message>{echoed Message}</ns:Message></ns:EchoResponse></soap:Body></soap:Envelope>`
- First steps in `web.steps.ts`: `Given('I open url {string}', …)` and `Then('the page title should contain {string}', …)`.
- `features/_samples/web/smoke.feature`: `@samples @smoke`. Opens `http://localhost:3999/sample/login` and checks the title contains `Sample Login`.

- [ ] **Step 1: Write failing tests.** `projects.spec.ts`: browsers `['chromium','firefox']` → project names `['chromium','firefox','api']`; `chrome` has `channel 'chrome'`; web projects have `grepInvert`; `remote` sets `connectOptions.wsEndpoint`; `browserstack` throws `/phase 5/`. `mockServer.spec.ts`: start the server in `beforeAll` (export `startMockServer(port): Promise<Server>` from `server.ts`), then check `/health` == ok, `POST /api/users` without a token is 401, and `/api/flaky` returns 503 then 200.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the files listed above.
- [ ] **Step 4: Run** `npm run test:unit`. Expected: PASS.
- [ ] **Step 5: Add npm scripts:**
  - `"bddgen": "bddgen"`
  - `"test": "bddgen && playwright test"`
  - `"test:web": "bddgen && playwright test --grep-invert @api"`
  - `"test:api": "bddgen && playwright test --project=api"`
  - `"test:failed": "bddgen && playwright test --last-failed"`
  - `"test:debug": "bddgen && playwright test --debug --project=chromium"`
  - `"codegen": "playwright codegen"`
  - `"report:open": "playwright show-report reports/playwright"`
- [ ] **Step 6: Run** `npm test -- --project=chromium`. Expected: `1 passed` (smoke).
- [ ] **Step 7: Commit** `feat: fixtures, hooks, playwright config, mock server and smoke feature`.

---

### Task 8: Generic web and assertion steps, plus web samples (end of phase 1)

**Files:**
- Modify: `src/core/steps/web.steps.ts`
- Create: `src/core/steps/assert.steps.ts`, `src/core/steps/context.steps.ts`, `src/app/locators/{sampleLogin.locators.json,sampleSecure.properties,sampleTable.locators.json}`, `test-data/test/users.json`, `features/_samples/web/{login.feature,table.feature}`

**Interfaces:**
- Consumes: fixtures `ui`, `resolve`, `ctx` (Task 7).
- Produces: the step catalogue below. Every `{string}` argument goes through `resolve()` first. Locator arguments are refs (`page.key` or `page.key(args)`).

| File | Step text |
|---|---|
| web | `Given I open the {string} page` · `Given I open url {string}` · `When I click {string}` · `When I double click {string}` · `When I hover over {string}` · `When I enter {string} into {string}` · `When I clear {string}` · `When I select {string} from {string}` · `When I check {string}` · `When I uncheck {string}` · `When I press {string} on {string}` · `When I upload {string} to {string}` · `When I accept the next dialog` · `When I click {string} and switch to the new tab` · `When I wait for {string} to be visible` · `When I wait for {string} to be hidden` · `When I take a screenshot named {string}` |
| assert | `Then {string} should be visible` · `Then {string} should be hidden` · `Then {string} should have text {string}` · `Then {string} should contain text {string}` · `Then {string} should have value {string}` · `Then {string} should have attribute {string} with value {string}` · `Then {string} should have count {int}` · `Then {string} should be enabled` · `Then {string} should be disabled` · `Then the page title should contain {string}` · `Then the url should contain {string}` |
| context | `When I store text of {string} as {string}` · `When I store value {string} as {string}` · `Then stored value {string} should be {string}` |

- Assertions use web-first `expect(locator)` matchers. Screenshots are attached through `$testInfo.attach`.
- Samples:
  - `sampleLogin.locators.json`: `username` = `placeholder=Username`; `password` = `["#nope-old-id","id=password"]` (shows the fallback); `loginBtn` = `role=button[name='Log in']`; `flash` = `#flash`
  - `sampleSecure.properties`: `heading = By.xpath("//h2")`, `flash = By.id("flash")`, `logout = By.linkText("Logout")`
  - `sampleTable.locators.json`: `rowByName` = `xpath=//tr[td[text()='{0}']]`, `rows` = `css=table tr`, `country` = `#country`, `newTabLink` = `a[target=_blank]`
  - `users.json`: `{ "valid": { "username": "tomsmith" } }`
  - `login.feature` (`@samples @login`): valid login uses `${data.users.valid.username}` and `${env.SAMPLE_PASSWORD}` and asserts `sampleSecure.flash` contains "secure area". A Scenario Outline covers invalid usernames (2 rows). The scenario stores the heading text and asserts the stored value.
  - `table.feature` (`@samples`): parameterised row visible, count 3, select a country, new tab.

- [ ] **Step 1: Write the sample features and locator files first.** These are the acceptance tests.
- [ ] **Step 2: Run** `npm test -- --project=chromium`. Expected: FAIL. bddgen reports missing step definitions.
- [ ] **Step 3: Implement the three step files.**
- [ ] **Step 4: Run** `$env:PROFILE='crossbrowser'; npm test` (PowerShell). Expected: all sample scenarios pass on chromium, firefox and webkit with 4 workers. `reports/playwright` shows a `locator-fallback` annotation on the login scenario.
- [ ] **Step 5: Run** `npm run lint`. Expected: no errors (no `waitForTimeout` anywhere).
- [ ] **Step 6: Commit** `feat: generic web, assertion and context steps with web samples`.

---

### Task 9: Auth providers and RestClient

**Files:**
- Create: `src/core/api/mask.ts`, `src/core/api/auth.ts`, `src/core/api/RestClient.ts`
- Test: `tests/unit/restClient.spec.ts` (starts the mock server via `startMockServer(4001)`)

**Interfaces:**
- Produces:
```ts
export function maskSecrets(text: string, secrets: string[]): string;   // each non-empty secret (len ≥ 3) → '***'
export interface AuthProvider { headers(): Promise<Record<string,string>>; secrets(): string[] }
export function noAuth(): AuthProvider;
export function bearer(token: string): AuthProvider;
export function basic(user: string, pass: string): AuthProvider;
export function apiKey(header: string, key: string): AuthProvider;
export function oauth2ClientCredentials(request: APIRequestContext, o: { tokenUrl: string; clientId: string; clientSecret: string; scope?: string }): AuthProvider; // caches token until expires_in - 30s
export function createAuth(kind: 'none'|'bearer'|'basic'|'apikey'|'oauth2', apiName: string, cfg: FrameworkConfig, request: APIRequestContext): AuthProvider;
//   NAME = apiName upper-snake. bearer: secret API_<NAME>_TOKEN; basic: API_<NAME>_USERNAME/_PASSWORD;
//   apikey: secret API_<NAME>_APIKEY, header vars.API_<NAME>_APIKEY_HEADER ?? 'x-api-key';
//   oauth2: vars API_<NAME>_TOKEN_URL, secrets API_<NAME>_CLIENT_ID/_CLIENT_SECRET, vars API_<NAME>_SCOPE optional
export interface ApiResponseData { status: number; headers: Record<string,string>; text: string; json<T = unknown>(): T }
export class RestClient {
  constructor(request: APIRequestContext, o: { baseUrl: string; auth?: AuthProvider; attach?: (name: string, body: string) => Promise<void> });
  setHeader(name: string, value: string): void;
  send(method: string, path: string, body?: unknown): Promise<ApiResponseData>;
}
```
- `send` retries once on a 5xx or network error, but **only** for GET, HEAD, PUT and DELETE. Each attempt attaches `"<METHOD> <path> request"` and `"… response"` (headers + body) after `maskSecrets` with `auth.secrets()`. An object body is sent as JSON; a string body is sent as is.

- [ ] **Step 1: Write failing tests.**
```ts
test('maskSecrets', ...)                     // ('token=abc123 x', ['abc123']) → 'token=*** x'; ignores '' and 'ab'
test('oauth2 fetches and caches token', ...) // two headers() calls → mock /api/token hit once (server exposes GET /__stats)
test('bearer auth POST /users → 201 json', ...)
test('401 without auth is returned, not thrown', ...)
test('GET /api/flaky retried once → 200', ...)
test('POST is not retried', ...)             // POST /api/flaky?mode=post → 503 returned
test('attachments mask the token', ...)      // captured attach bodies contain 'Bearer ***' and not 'sample-token'
test('createAuth error names the missing secret', ...) // toThrow('Missing secret API_FOO_TOKEN: set it in .env or as a CI parameter')
```
  Extend the mock server with `GET /__stats` (token hit count) and `POST /api/flaky` (always 503).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: REST client with auth providers, retry and secret masking`.

---

### Task 10: SoapClient, ApiSession, API steps and API samples (end of phase 2 libraries)

**Files:**
- Create: `src/core/api/SoapClient.ts`, `src/core/api/ApiSession.ts`, `src/core/steps/api.steps.ts`, `templates/json/createUser.json`, `templates/soap/echo.xml`, `templates/schemas/user.schema.json`, `features/_samples/api/{users.feature,soap.feature}`
- Modify: `src/core/fixtures/index.ts` (add the `api` fixture)
- Test: `tests/unit/soapClient.spec.ts`

**Interfaces:**
- Consumes: `RestClient`, `createAuth` (Task 9), `resolve`, `ctx` (Task 7).
- Produces:
```ts
export interface SoapResponse { status: number; text: string; doc: Record<string, unknown>; node(path: string): string | undefined }
//   path = local name ('Status') → first depth-first match, or dotted local names ('EchoResponse.Status'); namespaces ignored
export class SoapClient {
  constructor(request: APIRequestContext, o?: { attach?: (n: string, b: string) => Promise<void>; secrets?: string[] });
  send(url: string, action: string, xml: string): Promise<SoapResponse>;  // Content-Type text/xml; charset=utf-8, SOAPAction header
}
export class ApiSession {
  constructor(request: APIRequestContext, cfg: FrameworkConfig, resolve: (t: string) => string, attach: (n: string, b: string) => Promise<void>, rootDir: string);
  use(apiName: string, auth?: Parameters<typeof createAuth>[0]): void;  // base URL from vars API_<NAME>_URL, else API_DEFAULT_URL, else ConfigError naming both keys
  setHeader(name: string, value: string): void;
  send(method: string, path: string, bodyRef?: string): Promise<ApiResponseData>;
  //   bodyRef: starts with '{' or '[' → inline JSON; else file templates/json/<bodyRef>; resolved through resolve() before JSON.parse
  sendSoap(templateName: string, urlOrVar: string, action: string): Promise<SoapResponse>;
  //   template templates/soap/<name>; urlOrVar: http(s) URL or var name like 'SOAP_SAMPLE_URL'
  readonly last: ApiResponseData;   // throws "No API response yet. Send a request first." if unset
  readonly lastSoap: SoapResponse;  // same message for SOAP
  jsonPath(expr: string): unknown[]; // jsonpath-plus on last.json()
  validateSchema(schemaFile: string): string[]; // ajv + ajv-formats on templates/schemas/<file>; [] = valid
}
```
- API steps (all `{string}` args go through `resolve`):
  - `Given I use API {string}` · `Given I use API {string} with auth {string}` · `Given I set header {string} to {string}`
  - `When I send {word} to {string}` · `When I send {word} to {string} with body {string}`
  - `Then response status should be {int}` · `Then response path {string} should be {string}` · `Then response path {string} should not be empty` · `Then response should match schema {string}`
  - `When I store response path {string} as {string}`
  - `When I send SOAP request {string} to {string} with action {string}` · `Then SOAP node {string} should be {string}` · `When I store SOAP node {string} as {string}`
- When a schema assertion fails, the error lists the ajv errors (`instancePath message`).
- Samples, all tagged `@api @samples`:
  - `users.feature`: use API `sample` with auth `oauth2` → POST `/users` with `createUser.json` (`{"name":"${faker.person.firstName}"}`) → 201 → matches the `user.schema.json` schema → store `$.id` as `userId` → GET `/users/${ctx.userId}` → 200 → path `$.id` should be `${ctx.userId}`
  - `soap.feature`: send `echo.xml` (`<Message>${data.users.valid.username}</Message>`) to `SOAP_SAMPLE_URL` with action `urn:Echo` → node `Status` = `OK` and node `EchoResponse.Message` = `tomsmith`

- [ ] **Step 1: Write failing tests** in `soapClient.spec.ts`: posts to the mock with the `SOAPAction` header; `node('Status')=='OK'`; `node('EchoResponse.Message')` returns the echoed text; `node('Nope')` is `undefined`; a non-XML body raises an `Error` that includes the status and the first 200 characters of the body.
- [ ] **Step 2: Write the API sample features and templates** (acceptance tests).
- [ ] **Step 3: Run** `npm run test:unit` and `npm run test:api`. Expected: FAIL.
- [ ] **Step 4: Implement** SoapClient (`fast-xml-parser` with `removeNSPrefix: true`), ApiSession, the `api` fixture and api.steps.ts. Copy `.env.example` sample keys into `.env` for local runs.
- [ ] **Step 5: Run** `npm run test:unit && npm run test:api`. Expected: PASS.
- [ ] **Step 6: Run** `$env:PROFILE='crossbrowser'; npm test`. Expected: web samples on 3 browsers and API samples on `api` all pass.
- [ ] **Step 7: Commit** `feat: SOAP client, API session, generic API steps and API samples`.

---

### Task 11: Tooling: locators:check, steps:list, generators, Gherkin lint, hooks, CODEOWNERS, clean:samples

**Files:**
- Create: `scripts/locators-check.ts`, `scripts/clean-samples.ts`, `plopfile.cjs`, `generators/{page.hbs,steps.hbs,locators.hbs,feature.hbs,api-service.hbs}`, `.gherkin-lintrc`, `CODEOWNERS`, `.husky/pre-commit`
- Test: `tests/unit/locatorsCheck.spec.ts`

**Interfaces:**
- Produces:
```ts
// scripts/locators-check.ts
export interface LocatorCheckReport { errors: string[]; unused: string[] }
export function checkLocators(rootDir: string): LocatorCheckReport;
//   errors: syntax (parseLocator on every candidate, message "<file>: <key>: <reason>") + duplicates (from loadLocatorFiles)
//   unused: keys whose 'page.key' string appears in no file under features/ or src/app/ (ref with args counts)
//   CLI: prints both lists; exit 1 if errors.length > 0 (unused = warning only)
```
- Scripts:
  - `"locators:check": "tsx scripts/locators-check.ts"`
  - `"steps:list": "bddgen export"`
  - `"generate": "plop"`
  - `"lint:gherkin": "gherkin-lint features"`
  - `"clean:samples": "tsx scripts/clean-samples.ts"`, which deletes `features/_samples`, the `src/app/locators/sample*` files, `test-data/test/users.json`, `templates/{json/createUser.json,soap/echo.xml,schemas/user.schema.json}`, and the `PAGE_SAMPLE_*` / `API_SAMPLE_*` / `SOAP_SAMPLE_*` / `SAMPLE_*` lines in `config/env/*.env`. It prints what it removed.
  - `"prepare": "husky"`
- plop generator `page` asks for a name (e.g. `Login`) and creates:
  - `src/app/pages/login.page.ts` (`class LoginPage extends BasePage`)
  - `src/app/locators/login.locators.json` (`{}`)
  - `src/app/step-definitions/login.steps.ts` (imports `Given/When/Then` from `@app/fixtures`, one example step)
  - `features/login/login.feature` (a skeleton tagged `@wip`)
  - Generator `api-service` creates `src/app/api/services/<name>.service.ts`.
- `.gherkin-lintrc`: `no-unnamed-features`, `no-unnamed-scenarios`, `no-dupe-scenario-names` (`in-feature`), `no-empty-file`, `no-trailing-spaces`, `no-files-without-scenarios`, `indentation` (2).
- lint-staged runs `eslint --fix` and `prettier --write` on `*.ts`, and `gherkin-lint` on `*.feature`.
- `CODEOWNERS`: `/src/core/ @framework-team`, `/playwright.config.ts @framework-team`. Add a comment telling teams to replace the handle.

- [ ] **Step 1: Write failing tests** in `locatorsCheck.spec.ts` (temp dir): a bad `By.foo` lands in `errors` with the file and key; a duplicate key across two files is reported; an unreferenced key lands in `unused`; a key used as `table.rowByName(John)` in a feature doesn't count as unused.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the script, the generators and the configs.
- [ ] **Step 4: Run** the unit tests, then `npm run locators:check` (expected: 0 errors), then `npm run steps:list` (expected: lists all catalogue steps), then `npm run lint:gherkin` (expected: no errors).
- [ ] **Step 5: Smoke-test the generator.** Run `npx plop page Demo`, then `npm run typecheck` and `npx bddgen`. Expected: both succeed. Then delete the generated `demo` files.
- [ ] **Step 6: Commit** `chore: locator check, step export, generators, gherkin lint, git hooks, CODEOWNERS`.

---

### Task 12: Documentation and onboarding

**Files:**
- Create: `README.md`, `docs/{writing-features,step-catalogue,locators,test-data,api-testing,run-profiles,coming-from-selenium}.md`

**Interfaces:**
- Consumes: the step catalogue (Tasks 8 and 10), locator rules (Tasks 3 and 4), config keys (Task 2), scripts (Tasks 7 and 11).

- [ ] **Step 1: Write `README.md`.** Include:
  - Prerequisites (Node 24)
  - Quick start: `npm ci`, `npx playwright install`, copy `.env.example` to `.env`, `npm test`
  - Folder map (core vs app)
  - Commands table, with both PowerShell and bash examples for `PROFILE`, `ENV`, `TAGS`
  - "Start your own project": `npm run clean:samples`, set `BASE_URL`, `npm run generate`
  - Links to `docs/`
- [ ] **Step 2: Write the docs.**
  - `step-catalogue.md`: generate the step list from `npm run steps:list` output and add one example per step.
  - `locators.md`: formats, prefixes, Selenium `By.*`, fallbacks, frames, params, priority (role → label → testid → css → xpath), `locators:check`.
  - `test-data.md`: placeholders and file types.
  - `api-testing.md`: `API_<NAME>_*` keys, auth kinds, templates, schemas, SOAP nodes.
  - `run-profiles.md`: every profile field and its override env var.
  - `writing-features.md`: tags (`@api`, `@serial` (add `test.describe.configure({ mode: 'serial' })` guidance), `@wip`), custom steps importing from `@app/fixtures`, custom page objects extending `BasePage`.
  - `coming-from-selenium.md`: the spec's section 4 mapping table, plus before/after examples (Java step vs TS step, `Locators.properties` reused as is).
- [ ] **Step 3: Check the quick start from scratch.** Delete `node_modules` and `reports`, then follow the README literally. Expected: `npm test` passes, and the elapsed time (excluding the browser download) is noted under 10 minutes.
- [ ] **Step 4: Commit** `docs: README quick start and framework guides`.

---

## Deferred to later plans (from the spec)

| Item | Plan |
|---|---|
| Allure, Cucumber HTML/JSON/JUnit reporters, locator-health file, summary, email | Phase 3: Reporting |
| `.teamcity/settings.kts`, agents, composite build | Phase 4: TeamCity |
| `connection: browserstack`, `browserstack.yml` | Phase 5: BrowserStack |
| MCP, AI features A1–A7 | Phase 6: AI & MCP |
| Decorator-style steps, `@data(file)` external Examples, soft-assert steps, `WaitUtils` helpers (network idle, poll-until), E2–E14 extras | Phase 7: Extras (decorators and `@data` need a bddgen pre-processing spike) |
