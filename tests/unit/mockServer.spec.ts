import { test, expect } from '@playwright/test';
import type { Server } from 'node:http';
import { startMockServer } from '../mock-server/server';

const PORT = 4000;
const BASE = `http://localhost:${PORT}`;
let server: Server;

test.beforeAll(async () => {
  server = await startMockServer(PORT);
});
test.afterAll(() => {
  server.close();
});

test('health', async ({ request }) => {
  expect(await (await request.get(`${BASE}/health`)).text()).toBe('ok');
});

test('POST /api/users needs the bearer token', async ({ request }) => {
  expect((await request.post(`${BASE}/api/users`, { data: { name: 'A' } })).status()).toBe(401);
  const ok = await request.post(`${BASE}/api/users`, {
    data: { name: 'A' },
    headers: { Authorization: 'Bearer sample-token' },
  });
  expect(ok.status()).toBe(201);
  expect(await ok.json()).toEqual({ id: 'u-1', name: 'A' });
});

test('token endpoint issues sample-token for the sample client', async ({ request }) => {
  const good = await request.post(`${BASE}/api/token`, {
    form: { grant_type: 'client_credentials', client_id: 'sample-client', client_secret: 'sample-secret' },
  });
  expect(await good.json()).toMatchObject({ access_token: 'sample-token', expires_in: 3600 });
  const bad = await request.post(`${BASE}/api/token`, { form: { grant_type: 'client_credentials', client_id: 'x' } });
  expect(bad.status()).toBe(401);
});

test('flaky endpoint fails once then succeeds', async ({ request }) => {
  expect((await request.get(`${BASE}/api/flaky`)).status()).toBe(503);
  expect((await request.get(`${BASE}/api/flaky`)).status()).toBe(200);
});

test('soap echo returns Status OK and echoes Message', async ({ request }) => {
  const res = await request.post(`${BASE}/soap/echo`, {
    headers: { 'Content-Type': 'text/xml', SOAPAction: 'urn:Echo' },
    data: '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Echo><Message>hi</Message></Echo></soap:Body></soap:Envelope>',
  });
  const text = await res.text();
  expect(text).toContain('<ns:Status>OK</ns:Status>');
  expect(text).toContain('<ns:Message>hi</ns:Message>');
});

test('sample login page has the form and title', async ({ page }) => {
  await page.goto(`${BASE}/sample/login`);
  await expect(page).toHaveTitle(/Sample Login/);
  await page.getByPlaceholder('Username').fill('tomsmith');
  await page.locator('#password').fill('sample-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.locator('#flash')).toContainText('secure area');
});
