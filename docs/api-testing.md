# API testing (REST and SOAP)

Tag API features with **`@api`**. They then run in the `api` project, which doesn't start a browser, and the browser projects skip them. `npm run test:api` runs only these.

## Configuration keys

`<NAME>` is the API name used in the step, upper-cased with `_` (`"orders"` → `ORDERS`, `"marketData"` → `MARKET_DATA`).

| Key | Where | Used for |
|---|---|---|
| `API_<NAME>_URL` | `config/env/<env>.env` | Base URL (e.g. `https://uat.example.com/api`). Falls back to `API_DEFAULT_URL`. |
| `API_<NAME>_TOKEN` | `.env` / CI secret | `bearer` auth |
| `API_<NAME>_USERNAME`, `API_<NAME>_PASSWORD` | `.env` / CI secret | `basic` auth |
| `API_<NAME>_APIKEY` | `.env` / CI secret | `apikey` auth |
| `API_<NAME>_APIKEY_HEADER` | `config/env` | API-key header name (default `x-api-key`) |
| `API_<NAME>_TOKEN_URL` | `config/env` | `oauth2` client-credentials token endpoint |
| `API_<NAME>_CLIENT_ID`, `API_<NAME>_CLIENT_SECRET` | `.env` / CI secret | `oauth2` client |
| `API_<NAME>_SCOPE` | `config/env` | `oauth2` scope (optional) |

OAuth2 tokens are cached until 30 seconds before they expire.

## REST example

```gherkin
@api
Feature: Orders API

  Scenario: Create and fetch an order
    Given I use API "orders" with auth "oauth2"
    And I set header "X-Correlation-Id" to "${faker.string.uuid}"
    When I send POST to "/orders" with body "createOrder.json"
    Then response status should be 201
    And response should match schema "order.schema.json"
    When I store response path "$.id" as "orderId"
    And I send GET to "/orders/${ctx.orderId}"
    Then response path "$.status" should be "OPEN"
```

- **Bodies:** a file in `templates/json/` or inline JSON in single quotes (`'{"qty": 1}'`). Placeholders are expanded before the JSON is parsed.
- **Schemas:** JSON Schema files in `templates/schemas/`. All violations are listed in the failure message.
- **Paths:** [JSONPath](https://github.com/JSONPath-Plus/JSONPath), e.g. `$.items[0].id`.
- **Retries:** `GET`, `HEAD`, `PUT` and `DELETE` are retried once on a 5xx or network error. `POST` is never retried.
- **Report:** every request and response is attached to the report, with tokens, passwords and client secrets replaced by `***`.

## SOAP example

`templates/soap/getPrice.xml`:

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><GetPrice xmlns="urn:market"><Code>${data.securities.default.code}</Code></GetPrice></soap:Body>
</soap:Envelope>
```

```gherkin
@api
Feature: Market data SOAP

  Scenario: Price is returned
    When I send SOAP request "getPrice.xml" to "SOAP_MARKET_URL" with action "urn:GetPrice"
    Then SOAP node "Status" should be "OK"
    And SOAP node "GetPriceResponse.Currency" should be "AUD"
    When I store SOAP node "Price" as "price"
```

The SOAP steps work like this:

- **URL:** the second argument is a full URL or a config key from `config/env/<env>.env`.
- **Node lookup:** namespaces are ignored. `"Status"` finds the first `Status` element anywhere. A dotted path such as `"GetPriceResponse.Price"` narrows the search.

## Service wrappers in code

`npm run generate` → `api-service` creates `src/app/api/services/<name>.service.ts`. It wraps a `RestClient`, so you can write business-level calls (`orders.create(...)`) in custom steps.
