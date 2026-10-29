import type { APIRequestContext, APIResponse } from '@playwright/test';
import { noAuth, type AuthProvider } from './auth';
import { maskSecrets } from './mask';

export interface ApiResponseData {
  status: number;
  headers: Record<string, string>;
  text: string;
  json<T = unknown>(): T;
}

const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function toData(res: APIResponse): Promise<ApiResponseData> {
  const text = await res.text();
  return {
    status: res.status(),
    headers: res.headers(),
    text,
    json<T>() {
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`Response (status ${res.status()}) is not JSON: ${text.slice(0, 200)}`);
      }
    },
  };
}

/** REST calls with auth, one retry for idempotent requests on 5xx/network errors, and masked request/response attachments. */
export class RestClient {
  private readonly headers: Record<string, string> = {};
  private readonly auth: AuthProvider;

  constructor(
    private readonly request: APIRequestContext,
    private readonly o: { baseUrl: string; auth?: AuthProvider; attach?: (name: string, body: string) => Promise<void> },
  ) {
    this.auth = o.auth ?? noAuth();
  }

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  async send(method: string, path: string, body?: unknown): Promise<ApiResponseData> {
    const m = method.toUpperCase();
    const url = joinUrl(this.o.baseUrl, path);
    const headers = { ...this.headers, ...(await this.auth.headers()) };
    const attempts = IDEMPOTENT.has(m) ? 2 : 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.attach(`${m} ${path} request`, { url, headers, body });
      try {
        const res = await toData(
          await this.request.fetch(url, { method: m, headers, data: body, failOnStatusCode: false }),
        );
        await this.attach(`${m} ${path} response`, { status: res.status, headers: res.headers, body: res.text });
        if (res.status < 500 || attempt === attempts) return res;
      } catch (e) {
        lastError = e;
        if (attempt === attempts) throw e;
      }
    }
    throw lastError;
  }

  private async attach(name: string, payload: unknown): Promise<void> {
    if (!this.o.attach) return;
    await this.o.attach(name, maskSecrets(JSON.stringify(payload, null, 2), this.auth.secrets()));
  }
}
