# Locators

Locators live in files under `src/app/locators/`, one file per page, just like `Locators.properties` in the Selenium framework.
The file name is the page name, and every key is referenced as `page.key`:

| File | Key in file | Referenced as |
|---|---|---|
| `login.locators.json` | `username` | `login.username` |
| `orders.properties` | `submitBtn` | `orders.submitBtn` |

Sub-folders are allowed (`src/app/locators/trading/orders.properties`). The page name is still the file name, so keep names unique across folders.

## JSON format (recommended)

```json
{
  "username": "placeholder=Username",
  "loginBtn": ["role=button[name='Log in']", "xpath=(//*[@type='submit'])[1]"],
  "rowByName": "xpath=//tr[td[text()='{0}']]",
  "frameField": { "candidates": ["#amount"], "frame": "iframe#payment" }
}
```

A value can be one of three forms:

- **A string:** one locator.
- **An array:** fallbacks, tried in order.
- **An object:** `candidates` (or `value`) plus `frame`, for an element inside an iframe.

## Selenium `.properties` format

Existing Selenium locator files work as-is:

```properties
# Login page
username = By.xpath(".//input[@placeholder='Username']")
password = By.id("password")
loginBtn = By.cssSelector("button[type=submit]")
help     = By.linkText("Help")
```

Supported: `By.xpath`, `By.id`, `By.cssSelector`, `By.name`, `By.linkText`, `By.partialLinkText`, `By.className` and `By.tagName`.

- Lines starting with `#`, `!` or `//` are comments.
- Lines without `=` are ignored, such as section headers like `Login_Page`.
- The first `=` separates the key from the value, so `=` and quotes inside XPath are fine.
- Windows line endings and a UTF-8 BOM are handled.

## Locator prefixes

| Prefix | Meaning | Example |
|---|---|---|
| `role=` | Accessible role and name (preferred) | `role=button[name='Log in']` |
| `label=` | Form field by its label | `label=Email` |
| `placeholder=` | Input by placeholder | `placeholder=Search` |
| `testid=` | `data-testid` attribute | `testid=submit-order` |
| `text=` | Text match | `text=Log in` |
| `css=` | CSS selector | `css=button.primary` |
| `xpath=` | XPath | `xpath=//h2` |
| `id=` | Element id | `id=password` |
| (none) | CSS; strings starting with `/`, `./` or `(/` are treated as XPath | `#flash`, `//h2` |

**Priority:** role → label/placeholder → testid → CSS → XPath. Role and label locators survive layout changes. Long XPaths break the most.

## Fallbacks

With an array, the first candidate that matches within 5 seconds is used. When a candidate other than the first one is used, the test passes but gets a `locator-fallback` annotation in the report. That annotation tells you the primary locator is stale and should be fixed.

If none matches, the error lists the key and every candidate tried:

```
Locator 'login.loginBtn' not found after 5000ms. Tried:
  1. role=button[name='Log in']
  2. xpath=(//*[@type='submit'])[1]
```

A single-candidate locator is returned immediately, and Playwright's normal auto-wait applies to the action.

## Parameters

Use `{0}`, `{1}`, … in the value and pass arguments in brackets: `table.rowByName(John)` or `grid.cell(John, 3)`.

## Using locators in code

```ts
export class OrdersPage extends BasePage {
  async submit(): Promise<void> {
    await this.click('orders.submitBtn');               // BasePage action
    const row = await this.el('orders.rowByRef(R-12)'); // raw Playwright Locator
    await expect(row).toBeVisible();
  }
}
```

## Checking and recording

- `npm run locators:check` reports syntax errors and duplicate keys (both fail the check) and keys that no feature or `src/app` file references (warning).
- `npm run codegen -- https://your.app` records locators you can paste into the files.
- Unknown keys fail with a suggestion: `Unknown locator 'login.usrname'. Did you mean 'login.username'?`
