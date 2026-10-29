/**
 * npm run locators:check
 * Errors (exit 1): locator syntax, duplicate keys. Warnings: keys not referenced from features/ or src/app/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadLocatorFiles, type LocatorMap } from '../src/core/locators/loadLocatorFiles';
import { parseLocator } from '../src/core/locators/parseLocator';

export interface LocatorCheckReport {
  errors: string[];
  unused: string[];
}

function readAll(dir: string, skip: string): string {
  if (!fs.existsSync(dir)) return '';
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && /\.(feature|ts|js)$/.test(d.name) && !path.join(d.parentPath, d.name).startsWith(skip))
    .map((d) => fs.readFileSync(path.join(d.parentPath, d.name), 'utf8'))
    .join('\n');
}

export function checkLocators(rootDir: string): LocatorCheckReport {
  const locatorDir = path.join(rootDir, 'src', 'app', 'locators');
  let map: LocatorMap;
  try {
    map = loadLocatorFiles(locatorDir);
  } catch (e) {
    return { errors: [(e as Error).message], unused: [] };
  }

  const errors: string[] = [];
  for (const [key, entry] of Object.entries(map)) {
    for (const candidate of entry.candidates) {
      try {
        parseLocator(candidate);
      } catch (e) {
        errors.push(`${path.relative(rootDir, entry.source)}: ${key}: ${(e as Error).message}`);
      }
    }
  }

  const corpus =
    readAll(path.join(rootDir, 'features'), locatorDir) + readAll(path.join(rootDir, 'src', 'app'), locatorDir);
  const unused = Object.keys(map)
    .filter((key) => !new RegExp(`${key.replace(/\./g, '\\.')}(?![\\w.])`).test(corpus))
    .sort();
  return { errors, unused };
}

if (require.main === module) {
  const { errors, unused } = checkLocators(process.cwd());
  for (const u of unused) console.warn(`warning: unused locator ${u}`);
  for (const e of errors) console.error(`error: ${e}`);
  console.log(`${errors.length} error(s), ${unused.length} unused locator(s)`);
  process.exit(errors.length ? 1 : 0);
}
