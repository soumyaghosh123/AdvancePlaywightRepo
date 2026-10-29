# Test data and placeholders

## Data files

Put data files in `test-data/<env>/`. The folder is chosen by `ENV` (default `test`). The file name is the first part of the path:

| File | Content | Reference |
|---|---|---|
| `users.json` | `{ "valid": { "username": "tomsmith" } }` | `${data.users.valid.username}` |
| `roles.yaml` | `admin:\n  level: 5` | `${data.roles.admin.level}` |
| `accounts.csv` | header row + rows | `${data.accounts[1].id}` (rows start at 0) |
| `limits.xlsx` | one table per sheet, header in row 1 | `${data.limits.Sheet1[0].max}` |

In code: `data.get('users.valid.username')` (the `data` fixture).

Keep secrets out of data files. Use `${secret.X}` for them.

## Placeholders

Every string argument of the built-in steps, and every JSON/SOAP template, is expanded before use:

| Placeholder | Value |
|---|---|
| `${data.path}` | Test data (above) |
| `${env.NAME}` | `config/env/<env>.env`, `.env` or the process environment |
| `${secret.NAME}` | `.env` or the process environment only (CI password parameters). Never from `config/env` files. |
| `${ctx.name}` | A value stored earlier in the scenario (`I store … as "name"`) |
| `${faker.module.fn}` | Random data from [Faker](https://fakerjs.dev/api/), e.g. `${faker.person.firstName}`, `${faker.string.uuid}`, `${faker.internet.email}` |
| `${today}` | Today as `yyyy-MM-dd` |
| `${today+2d}` / `${today-1w}` / `${today+3m}` / `${today+1y}` | Date arithmetic (days, weeks, months, years) |
| `${today+2d:dd/MM/yyyy}` | Any [date-fns format](https://date-fns.org/docs/format) after `:` |
| `\${...}` | A literal `${...}` |

Text that isn't a well-formed placeholder is left alone, so `$100` or an XPath containing `$x` are safe. A placeholder that can't be resolved stops the step with a clear message, e.g. `Missing secret APP_PASSWORD: set it in .env or as a CI parameter`.

In custom steps, use the `resolve` fixture:

```ts
When('I search for {string}', async ({ ui, resolve }, term: string) => {
  await ui.fill('search.box', resolve(term));
});
```
