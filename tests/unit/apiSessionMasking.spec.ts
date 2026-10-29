import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import type { Server } from 'node:http';
import { startMockServer } from '../mock-server/server';
import { ApiSession } from '@core/api/ApiSession';
import type { FrameworkConfig } from '@core/config/schema';
import { tempRoot } from './helpers/tempRoot';

const PORT = 4003;
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

test('secrets resolved into headers, bodies and SOAP templates are masked in attachments', async () => {
  const SECRET = 'top-secret-value';
  const root = tempRoot('', {
    'templates/json/login.json': '{ "name": "a", "password": "${secret.PWD}" }',
    'templates/soap/auth.xml':
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Echo><Message>${secret.PWD}</Message></Echo></soap:Body></soap:Envelope>',
  });
  const cfg = {
    env: 'test',
    vars: { API_DEFAULT_URL: `http://localhost:${PORT}/api`, SOAP_URL: `http://localhost:${PORT}/soap/echo` },
    secrets: { PWD: SECRET },
  } as unknown as FrameworkConfig;
  const used: string[] = [];
  const resolve = (t: string) =>
    t.replace(/\$\{secret\.(\w+)\}/g, (_, n: string) => {
      used.push(SECRET);
      return (cfg.secrets as Record<string, string>)[n];
    });
  const bodies: string[] = [];
  const api = new ApiSession(
    request,
    cfg,
    resolve,
    async (_n, b) => void bodies.push(b),
    root,
    () => used,
  );

  api.use('default');
  api.setHeader('X-Auth', resolve('${secret.PWD}'));
  await api.send('POST', '/users', 'login.json');
  await api.sendSoap('auth.xml', 'SOAP_URL', 'urn:Echo');

  const all = bodies.join('\n');
  expect(bodies.length).toBeGreaterThanOrEqual(4);
  expect(all).not.toContain(SECRET);
  expect(all).toContain('***');
});
