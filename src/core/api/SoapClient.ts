import type { APIRequestContext } from '@playwright/test';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { maskSecrets } from './mask';

export interface SoapResponse {
  status: number;
  text: string;
  doc: Record<string, unknown>;
  /** 'Status' (first match anywhere) or dotted local names 'EchoResponse.Status'; namespaces are ignored. */
  node(path: string): string | undefined;
}

const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, parseTagValue: false, trimValues: true });

type Node = Record<string, unknown>;

function textOf(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return textOf(v[0]);
  if (typeof v === 'object') return textOf((v as Node)['#text']);
  return String(v);
}

function descend(start: unknown, parts: string[]): unknown {
  let cur = start;
  for (const p of parts) {
    if (Array.isArray(cur)) cur = cur[0];
    if (!cur || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = (cur as Node)[p];
  }
  return cur;
}

/** Depth-first: the first element named parts[0] from which the remaining parts resolve. */
function find(node: unknown, parts: string[]): unknown {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = find(n, parts);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
  for (const [k, v] of Object.entries(node as Node)) {
    if (k === parts[0]) {
      const hit = descend(v, parts.slice(1));
      if (hit !== undefined) return hit;
    }
    const deeper = find(v, parts);
    if (deeper !== undefined) return deeper;
  }
  return undefined;
}

export class SoapClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly o: { attach?: (name: string, body: string) => Promise<void>; secrets?: string[] } = {},
  ) {}

  async send(url: string, action: string, xml: string): Promise<SoapResponse> {
    const headers = { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: action };
    await this.attach(`SOAP ${action} request`, `POST ${url}\n\n${xml}`);
    const res = await this.request.post(url, { headers, data: xml, failOnStatusCode: false });
    const text = await res.text();
    await this.attach(`SOAP ${action} response`, `${res.status()}\n\n${text}`);
    if (!text.trim().startsWith('<') || XMLValidator.validate(text) !== true) {
      throw new Error(`SOAP response (status ${res.status()}) is not XML: ${text.slice(0, 200)}`);
    }
    const doc = parser.parse(text) as Record<string, unknown>;
    return { status: res.status(), text, doc, node: (path) => textOf(find(doc, path.split('.'))) };
  }

  private async attach(name: string, body: string): Promise<void> {
    await this.o.attach?.(name, maskSecrets(body, this.o.secrets ?? []));
  }
}
