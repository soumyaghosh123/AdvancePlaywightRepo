import fs from 'node:fs';
import path from 'node:path';
import { ConfigError } from '../errors';

export interface LocatorEntry {
  candidates: string[];
  frame?: string;
  /** File the entry came from. */
  source: string;
}

/** Keyed by 'page.key'. */
export type LocatorMap = Record<string, LocatorEntry>;

const JSON_SUFFIX = '.locators.json';
const PROPS_SUFFIX = '.properties';

/**
 * Java-style .properties: `key = value`, split on the first '='.
 * Lines starting with #, ! or // are comments; lines without '=' (section headers) are ignored.
 */
export function parseProperties(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith('//')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && (d.name.endsWith(JSON_SUFFIX) || d.name.endsWith(PROPS_SUFFIX)))
    .map((d) => path.join(d.parentPath, d.name))
    .sort();
}

function jsonEntry(value: unknown, file: string, key: string): Omit<LocatorEntry, 'source'> {
  if (typeof value === 'string') return { candidates: [value] };
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) {
    return { candidates: value };
  }
  if (value && typeof value === 'object') {
    const o = value as { candidates?: unknown; value?: unknown; frame?: unknown };
    const candidates = Array.isArray(o.candidates) ? o.candidates : typeof o.value === 'string' ? [o.value] : undefined;
    if (candidates?.length && candidates.every((v) => typeof v === 'string')) {
      return typeof o.frame === 'string' ? { candidates, frame: o.frame } : { candidates };
    }
  }
  throw new ConfigError(
    `${file}: locator '${key}' must be a string, a non-empty string array, or { "candidates": [...], "frame": "..." }`,
  );
}

function readFile(file: string): Record<string, Omit<LocatorEntry, 'source'>> {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith(PROPS_SUFFIX)) {
    return Object.fromEntries(Object.entries(parseProperties(text)).map(([k, v]) => [k, { candidates: [v] }]));
  }
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^﻿/, ''));
  } catch (e) {
    throw new ConfigError(`${file}: invalid JSON: ${(e as Error).message}`);
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new ConfigError(`${file}: expected an object of locator keys`);
  }
  return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, jsonEntry(v, file, k)]));
}

/** Loads every *.locators.json and *.properties under dir (recursive). Page name = file name without suffix. */
export function loadLocatorFiles(dir: string): LocatorMap {
  const map: LocatorMap = {};
  for (const file of listFiles(dir)) {
    const base = path.basename(file);
    const pageName = base.slice(0, -(base.endsWith(JSON_SUFFIX) ? JSON_SUFFIX : PROPS_SUFFIX).length);
    for (const [key, entry] of Object.entries(readFile(file))) {
      const fullKey = `${pageName}.${key}`;
      const existing = map[fullKey];
      if (existing) {
        throw new ConfigError(`Duplicate locator '${fullKey}' in ${existing.source} and ${file}`);
      }
      map[fullKey] = { ...entry, source: file };
    }
  }
  return map;
}
