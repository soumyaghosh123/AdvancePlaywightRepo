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

/** The project locator file: one top-level section per page. */
const SECTIONED_FILE = 'locators.json';
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
    .filter(
      (d) => d.isFile() && (d.name === SECTIONED_FILE || d.name.endsWith(JSON_SUFFIX) || d.name.endsWith(PROPS_SUFFIX)),
    )
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

type Entries = Record<string, Omit<LocatorEntry, 'source'>>;

function readJson(file: string): Record<string, unknown> {
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    throw new ConfigError(`${file}: invalid JSON: ${(e as Error).message}`);
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new ConfigError(`${file}: expected an object of locator keys`);
  }
  return json as Record<string, unknown>;
}

function entries(obj: Record<string, unknown>, file: string): Entries {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, jsonEntry(v, file, k)]));
}

/** Page name → its entries. locators.json holds many pages; other files are one page named after the file. */
function readFile(file: string): Record<string, Entries> {
  const base = path.basename(file);
  if (base === SECTIONED_FILE) {
    return Object.fromEntries(
      Object.entries(readJson(file)).map(([page, section]) => {
        if (!section || typeof section !== 'object' || Array.isArray(section)) {
          throw new ConfigError(`${file}: section '${page}' must be an object of locator keys`);
        }
        return [page, entries(section as Record<string, unknown>, file)];
      }),
    );
  }
  if (base.endsWith(PROPS_SUFFIX)) {
    const props = parseProperties(fs.readFileSync(file, 'utf8'));
    return {
      [base.slice(0, -PROPS_SUFFIX.length)]: Object.fromEntries(
        Object.entries(props).map(([k, v]) => [k, { candidates: [v] }]),
      ),
    };
  }
  return { [base.slice(0, -JSON_SUFFIX.length)]: entries(readJson(file), file) };
}

/**
 * Loads src/app/locators/locators.json (a section per page) plus any legacy *.locators.json / *.properties
 * files (page name = file name), recursively. A 'page.key' defined twice is an error.
 */
export function loadLocatorFiles(dir: string): LocatorMap {
  const map: LocatorMap = {};
  for (const file of listFiles(dir)) {
    for (const [pageName, pageEntries] of Object.entries(readFile(file))) {
      for (const [key, entry] of Object.entries(pageEntries)) {
        const fullKey = `${pageName}.${key}`;
        const existing = map[fullKey];
        if (existing) {
          throw new ConfigError(`Duplicate locator '${fullKey}' in ${existing.source} and ${file}`);
        }
        map[fullKey] = { ...entry, source: file };
      }
    }
  }
  return map;
}
