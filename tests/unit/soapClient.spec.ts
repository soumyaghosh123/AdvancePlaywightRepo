import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import type { Server } from 'node:http';
import { startMockServer } from '../mock-server/server';
import { SoapClient } from '@core/api/SoapClient';

const PORT = 4002;
const URL = `http://localhost:${PORT}/soap/echo`;
const ENVELOPE =
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Echo><Message>hello</Message></Echo></soap:Body></soap:Envelope>';
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

test('posts the envelope with SOAPAction and reads nodes by local name', async () => {
  const names: string[] = [];
  const soap = new SoapClient(request, { attach: async (n) => void names.push(n) });
  const res = await soap.send(URL, 'urn:Echo', ENVELOPE);
  expect(res.status).toBe(200);
  expect(res.node('Status')).toBe('OK');
  expect(res.node('EchoResponse.Message')).toBe('hello');
  expect(res.node('Envelope.Body.EchoResponse.Status')).toBe('OK');
  expect(res.node('Nope')).toBeUndefined();
  expect(names).toEqual(['SOAP urn:Echo request', 'SOAP urn:Echo response']);
});

test('non-XML response raises an error with status and body', async () => {
  const soap = new SoapClient(request);
  await expect(soap.send(`http://localhost:${PORT}/health`, 'urn:x', ENVELOPE)).rejects.toThrow(
    /SOAP response \(status \d+\) is not XML: .*/,
  );
});
