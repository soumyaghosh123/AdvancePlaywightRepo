import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import type { Server } from 'node:http';
import { startMockServer } from '../mock-server/server';
import { maskSecrets } from '@core/api/mask';
import { bearer, createAuth, oauth2ClientCredentials } from '@core/api/auth';
import { RestClient } from '@core/api/RestClient';
import type { FrameworkConfig } from '@core/config/schema';

const PORT = 4001;
const BASE = `http://localhost:${PORT}`;
let server: Server;
let request: APIRequestContext;

test.beforeAll(async () => {
  server = await startMockServer(PORT);
  request = await pwRequest.newContext();
});
test.afterAll(async () => {
  await request.dispose();
  server.close();
});

const cfg = (vars: Record<string, string>, secrets: Record<string, string>) =>
  ({ vars: { ...vars, ...secrets }, secrets }) as unknown as FrameworkConfig;

test('maskSecrets', () => {
  expect(maskSecrets('token=abc123 x abc123', ['abc123'])).toBe('token=*** x ***');
  expect(maskSecrets('ab and more', ['', 'ab'])).toBe('ab and more');
});

test('oauth2 fetches the token once and caches it', async () => {
  const before = (await (await request.get(`${BASE}/__stats`)).json()) as { tokenCalls: number };
  const auth = oauth2ClientCredentials(request, {
    tokenUrl: `${BASE}/api/token`,
    clientId: 'sample-client',
    clientSecret: 'sample-secret',
  });
  expect(await auth.headers()).toEqual({ Authorization: 'Bearer sample-token' });
  await auth.headers();
  const after = (await (await request.get(`${BASE}/__stats`)).json()) as { tokenCalls: number };
  expect(after.tokenCalls - before.tokenCalls).toBe(1);
  expect(auth.secrets()).toEqual(expect.arrayContaining(['sample-secret', 'sample-token']));
});

test('bearer auth POST /users returns 201 json', async () => {
  const api = new RestClient(request, { baseUrl: `${BASE}/api`, auth: bearer('sample-token') });
  const res = await api.send('POST', '/users', { name: 'Ann' });
  expect(res.status).toBe(201);
  expect(res.json()).toEqual({ id: 'u-1', name: 'Ann' });
  expect(res.headers['content-type']).toContain('application/json');
});

test('401 without auth is returned, not thrown', async () => {
  const api = new RestClient(request, { baseUrl: `${BASE}/api` });
  expect((await api.send('POST', '/users', { name: 'x' })).status).toBe(401);
});

test('GET is retried once on 5xx', async () => {
  const api = new RestClient(request, { baseUrl: `${BASE}/api` });
  expect((await api.send('GET', '/flaky')).status).toBe(200);
});

test('POST is not retried', async () => {
  const api = new RestClient(request, { baseUrl: `${BASE}/api` });
  expect((await api.send('POST', '/flaky')).status).toBe(503);
});

test('custom headers and string bodies are sent', async () => {
  const api = new RestClient(request, { baseUrl: `${BASE}/api` });
  api.setHeader('Authorization', 'Bearer sample-token');
  api.setHeader('Content-Type', 'application/json');
  expect((await api.send('POST', '/users', '{"name":"Raw"}')).json()).toEqual({ id: 'u-1', name: 'Raw' });
});

test('attachments mask the token', async () => {
  const bodies: string[] = [];
  const api = new RestClient(request, {
    baseUrl: `${BASE}/api`,
    auth: bearer('sample-token'),
    attach: async (_name, body) => {
      bodies.push(body);
    },
  });
  await api.send('POST', '/users', { name: 'Ann' });
  const all = bodies.join('\n');
  expect(bodies).toHaveLength(2);
  expect(all).toContain('Bearer ***');
  expect(all).not.toContain('sample-token');
});

test('createAuth reads names from config', async () => {
  const c = cfg({ API_FOO_APIKEY_HEADER: 'X-Key' }, { API_FOO_TOKEN: 't1', API_FOO_APIKEY: 'k1', API_FOO_USERNAME: 'u', API_FOO_PASSWORD: 'p' });
  expect(await createAuth('bearer', 'foo', c, request).headers()).toEqual({ Authorization: 'Bearer t1' });
  expect(await createAuth('apikey', 'foo', c, request).headers()).toEqual({ 'X-Key': 'k1' });
  expect(await createAuth('basic', 'foo', c, request).headers()).toEqual({ Authorization: `Basic ${Buffer.from('u:p').toString('base64')}` });
  expect(await createAuth('none', 'foo', c, request).headers()).toEqual({});
});

test('createAuth error names the missing secret', () => {
  expect(() => createAuth('bearer', 'foo', cfg({}, {}), request)).toThrow(
    'Missing secret API_FOO_TOKEN: set it in .env or as a CI parameter',
  );
});
