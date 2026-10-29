# Run profiles and configuration

A run profile, `config/run-profiles/<name>.json`, replaces the TestNG suite XML (`localRun.xml`). Choose one with `PROFILE`. The default is `local`.

```json
{
  "connection": "headless",
  "env": "uat",
  "browsers": ["chromium", "firefox", "webkit"],
  "tags": "@smoke and not @wip",
  "workers": 4,
  "retries": 1
}
```

| Field | Values | Default | Override with |
|---|---|---|---|
| `connection` | `local` (uses `headless`), `headless`, `remote`, `browserstack` (phase 5) | `local` | `CONNECTION` |
| `env` | name of a file in `config/env/` | `test` | `ENV` |
| `browsers` | `chromium`, `chrome`, `msedge`, `firefox`, `webkit`, `pixel`, `iphone` | `["chromium"]` | `BROWSERS=chrome,firefox` |
| `tags` | Cucumber tag expression | all | `TAGS` |
| `workers` | number of parallel workers | Playwright default (half the CPU cores) | `WORKERS` or `--workers` |
| `retries` | retries per failed scenario | `0` | `RETRIES` |
| `headless` | `true` / `false` (only with `connection: local`) | `true` | `HEADLESS` |
| `trace` | `off`, `on`, `retain-on-failure`, `on-first-retry` | `on-first-retry` | |
| `video` | `off`, `on`, `retain-on-failure` | `retain-on-failure` | |
| `screenshot` | `off`, `on`, `only-on-failure` | `only-on-failure` | |
| `actionTimeoutMs` | timeout for each action and assertion | `15000` | |
| `remoteWsEndpoint` | Playwright server URL, required for `remote` | | |

Bundled profiles: `local` (headed Chromium, for writing tests), `headless`, `crossbrowser` (Chromium + Firefox + WebKit, 4 workers, 1 retry) and `ci`.

Unknown fields or invalid values stop the run before any test starts, naming the file and field.

## Environment files

`config/env/<env>.env` holds **non-secret** values for one environment:

```properties
BASE_URL=https://uat.example.com
PAGE_LOGIN=/login                  # used by: Given I open the "login" page
PAGE_ACCOUNT_SUMMARY=/account      # "accountSummary" or "account summary" both map here
API_ORDERS_URL=https://uat.example.com/api
SOAP_MARKET_URL=https://uat.example.com/ws/market
```

`BASE_URL` is required.

## Precedence

Later sources win:

1. `config/env/<env>.env`
2. `config/run-profiles/<profile>.json`
3. `.env` (local secrets, git-ignored)
4. Process environment (CI parameters, `$env:X` / `X=`)
5. Playwright CLI options (`--project`, `--workers`, `--grep`)

**Secrets** (`${secret.X}` and API credentials) are read only from `.env` and the process environment.

## Projects

Each profile browser becomes a Playwright project that runs every scenario **not** tagged `@api`. An `api` project is always added and runs only `@api` scenarios. Run one project with `npm test -- --project=firefox`.
