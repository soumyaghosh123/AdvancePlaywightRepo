import type { APIRequestContext } from '@playwright/test';
import { getSecret } from '../config/loadConfig';
import type { FrameworkConfig } from '../config/schema';
import { ConfigError } from '../errors';

export interface AuthProvider {
  headers(): Promise<Record<string, string>>;
  /** Values to mask in logs and attachments. */
  secrets(): string[];
}

export type AuthKind = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';

export function noAuth(): AuthProvider {
  return { headers: async () => ({}), secrets: () => [] };
}

export function bearer(token: string): AuthProvider {
  return { headers: async () => ({ Authorization: `Bearer ${token}` }), secrets: () => [token] };
}

export function basic(user: string, pass: string): AuthProvider {
  const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
  return { headers: async () => ({ Authorization: `Basic ${encoded}` }), secrets: () => [pass, encoded] };
}

export function apiKey(header: string, key: string): AuthProvider {
  return { headers: async () => ({ [header]: key }), secrets: () => [key] };
}

/** OAuth2 client-credentials grant; the token is cached until 30s before it expires. */
export function oauth2ClientCredentials(
  request: APIRequestContext,
  o: { tokenUrl: string; clientId: string; clientSecret: string; scope?: string },
): AuthProvider {
  let token: string | undefined;
  let expiresAt = 0;
  return {
    async headers() {
      if (!token || Date.now() >= expiresAt) {
        const form: Record<string, string> = {
          grant_type: 'client_credentials',
          client_id: o.clientId,
          client_secret: o.clientSecret,
          ...(o.scope ? { scope: o.scope } : {}),
        };
        const res = await request.post(o.tokenUrl, { form, failOnStatusCode: false });
        if (!res.ok()) throw new Error(`OAuth2 token request to ${o.tokenUrl} failed: ${res.status()} ${await res.text()}`);
        const body = (await res.json()) as { access_token: string; expires_in?: number };
        token = body.access_token;
        expiresAt = Date.now() + ((body.expires_in ?? 300) - 30) * 1000;
      }
      return { Authorization: `Bearer ${token}` };
    },
    secrets: () => [o.clientSecret, ...(token ? [token] : [])],
  };
}

function apiVarPrefix(apiName: string): string {
  return `API_${apiName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`;
}

function requiredVar(cfg: FrameworkConfig, key: string): string {
  const v = cfg.vars[key];
  if (!v) throw new ConfigError(`Missing config key ${key}: add it to config/env/<env>.env`);
  return v;
}

/** Builds an auth provider from API_<NAME>_* config keys and secrets. */
export function createAuth(kind: AuthKind, apiName: string, cfg: FrameworkConfig, request: APIRequestContext): AuthProvider {
  const p = apiVarPrefix(apiName);
  switch (kind) {
    case 'none':
      return noAuth();
    case 'bearer':
      return bearer(getSecret(cfg, `${p}_TOKEN`));
    case 'basic':
      return basic(getSecret(cfg, `${p}_USERNAME`), getSecret(cfg, `${p}_PASSWORD`));
    case 'apikey':
      return apiKey(cfg.vars[`${p}_APIKEY_HEADER`] ?? 'x-api-key', getSecret(cfg, `${p}_APIKEY`));
    case 'oauth2':
      return oauth2ClientCredentials(request, {
        tokenUrl: requiredVar(cfg, `${p}_TOKEN_URL`),
        clientId: getSecret(cfg, `${p}_CLIENT_ID`),
        clientSecret: getSecret(cfg, `${p}_CLIENT_SECRET`),
        scope: cfg.vars[`${p}_SCOPE`],
      });
    default:
      throw new ConfigError(`Unknown auth '${kind as string}'. Use one of: none, bearer, basic, apikey, oauth2`);
  }
}

export { apiVarPrefix };
