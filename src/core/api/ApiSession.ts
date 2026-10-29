import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { JSONPath } from 'jsonpath-plus';
import type { FrameworkConfig } from '../config/schema';
import { ConfigError } from '../errors';
import { apiVarPrefix, createAuth, type AuthKind } from './auth';
import { RestClient, type ApiResponseData } from './RestClient';
import { SoapClient, type SoapResponse } from './SoapClient';

type Attach = (name: string, body: string) => Promise<void>;

/** State of the API steps within one scenario: the API in use, headers, and the last responses. */
export class ApiSession {
  private client?: RestClient;
  private pendingHeaders: Record<string, string> = {};
  private lastRest?: ApiResponseData;
  private lastSoapRes?: SoapResponse;
  private readonly ajv = addFormats(new Ajv({ allErrors: true, strict: false }));

  constructor(
    private readonly request: APIRequestContext,
    private readonly cfg: FrameworkConfig,
    private readonly resolve: (t: string) => string,
    private readonly attach: Attach,
    private readonly rootDir: string,
  ) {}

  /** Base URL from API_<NAME>_URL, else API_DEFAULT_URL. */
  use(apiName: string, auth: AuthKind = 'none'): void {
    const key = `${apiVarPrefix(apiName)}_URL`;
    const baseUrl = this.cfg.vars[key] ?? this.cfg.vars.API_DEFAULT_URL;
    if (!baseUrl) {
      throw new ConfigError(`No base URL for API '${apiName}'. Add ${key} or API_DEFAULT_URL to config/env/${this.cfg.env}.env`);
    }
    this.client = new RestClient(this.request, {
      baseUrl,
      auth: createAuth(auth, apiName, this.cfg, this.request),
      attach: this.attach,
    });
    for (const [k, v] of Object.entries(this.pendingHeaders)) this.client.setHeader(k, v);
  }

  setHeader(name: string, value: string): void {
    this.pendingHeaders[name] = value;
    this.client?.setHeader(name, value);
  }

  /** bodyRef: inline JSON ('{...}' / '[...]') or a file in templates/json; ${...} placeholders are expanded first. */
  async send(method: string, apiPath: string, bodyRef?: string): Promise<ApiResponseData> {
    if (!this.client) this.use('default');
    let body: unknown;
    if (bodyRef !== undefined) {
      const trimmed = bodyRef.trim();
      const raw = trimmed.startsWith('{') || trimmed.startsWith('[') ? trimmed : this.readTemplate('json', trimmed);
      try {
        body = JSON.parse(this.resolve(raw));
      } catch (e) {
        throw new ConfigError(`Request body '${bodyRef}' is not valid JSON after placeholders: ${(e as Error).message}`);
      }
    }
    this.lastRest = await this.client!.send(method, apiPath, body);
    return this.lastRest;
  }

  /** templateName in templates/soap; urlOrVar is a URL or a config key such as SOAP_SAMPLE_URL. */
  async sendSoap(templateName: string, urlOrVar: string, action: string): Promise<SoapResponse> {
    const url = /^https?:\/\//i.test(urlOrVar) ? urlOrVar : this.cfg.vars[urlOrVar];
    if (!url) throw new ConfigError(`No SOAP URL: add ${urlOrVar} to config/env/${this.cfg.env}.env`);
    const xml = this.resolve(this.readTemplate('soap', templateName));
    this.lastSoapRes = await new SoapClient(this.request, { attach: this.attach }).send(url, action, xml);
    return this.lastSoapRes;
  }

  get last(): ApiResponseData {
    if (!this.lastRest) throw new Error('No API response yet. Send a request first.');
    return this.lastRest;
  }

  get lastSoap(): SoapResponse {
    if (!this.lastSoapRes) throw new Error('No API response yet. Send a request first.');
    return this.lastSoapRes;
  }

  jsonPath(expr: string): unknown[] {
    return JSONPath({ path: expr, json: this.last.json<object>(), wrap: true }) as unknown[];
  }

  /** Validates the last JSON response against templates/schemas/<file>; returns error lines ([] = valid). */
  validateSchema(schemaFile: string): string[] {
    const schema = JSON.parse(this.readTemplate('schemas', schemaFile)) as object;
    const validate = this.ajv.compile(schema);
    if (validate(this.last.json())) return [];
    return (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message ?? ''}`.trim());
  }

  private readTemplate(kind: 'json' | 'soap' | 'schemas', name: string): string {
    const file = path.join(this.rootDir, 'templates', kind, name);
    if (!fs.existsSync(file)) throw new ConfigError(`Template not found: templates/${kind}/${name}`);
    return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  }
}
