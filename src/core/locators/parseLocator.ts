import { LocatorSyntaxError } from '../errors';

export type LocatorDescriptor =
  | { kind: 'selector'; selector: string }
  | { kind: 'role'; role: string; name?: string; exact?: boolean }
  | { kind: 'testid' | 'label' | 'placeholder'; value: string };

/** Selenium By.<strategy>("value") → Playwright selector. */
const seleniumStrategies: Record<string, (v: string) => string> = {
  xpath: (v) => `xpath=${v}`,
  id: (v) => `id=${v}`,
  cssSelector: (v) => `css=${v}`,
  name: (v) => `css=[name="${v}"]`,
  linkText: (v) => `css=a:text-is("${v}")`,
  partialLinkText: (v) => `css=a:has-text("${v}")`,
  className: (v) => `css=.${v}`,
  tagName: (v) => `css=${v}`,
};

const SELENIUM = /^By\.(\w+)\(\s*"((?:[^"\\]|\\.)*)"\s*\)$/;
const ROLE = /^role=([a-z]+)(?:\[name=(['"])(.*)\2\])?$/;

export function parseLocator(raw: string): LocatorDescriptor {
  const s = raw.trim();
  if (!s) throw new LocatorSyntaxError('empty locator');

  if (s.startsWith('By.')) {
    const m = SELENIUM.exec(s);
    if (!m) throw new LocatorSyntaxError(`Malformed Selenium locator: ${s} (expected By.<strategy>("value"))`);
    const toSelector = seleniumStrategies[m[1]];
    if (!toSelector) {
      throw new LocatorSyntaxError(
        `Unsupported Selenium strategy By.${m[1]} in ${s}. Supported: ${Object.keys(seleniumStrategies).join(', ')}`,
      );
    }
    return { kind: 'selector', selector: toSelector(m[2].replace(/\\(.)/g, '$1')) };
  }

  if (s.startsWith('role=')) {
    const m = ROLE.exec(s);
    if (!m) throw new LocatorSyntaxError(`Malformed role locator: ${s} (expected role=<role> or role=<role>[name='...'])`);
    return m[3] === undefined ? { kind: 'role', role: m[1] } : { kind: 'role', role: m[1], name: m[3] };
  }

  for (const kind of ['testid', 'label', 'placeholder'] as const) {
    if (s.startsWith(`${kind}=`)) return { kind, value: s.slice(kind.length + 1) };
  }

  if (s.startsWith('/') || s.startsWith('./') || s.startsWith('(/') || s.startsWith('(./')) {
    return { kind: 'selector', selector: `xpath=${s}` };
  }
  return { kind: 'selector', selector: s };
}

const KEY_REF = /^([^()]+?)\s*(?:\((.*)\))?$/;

/** "table.row(John, 2)" → { key: 'table.row', args: ['John', '2'] } */
export function parseKeyRef(ref: string): { key: string; args: string[] } {
  const m = KEY_REF.exec(ref.trim());
  if (!m) throw new LocatorSyntaxError(`Malformed locator reference: ${ref}`);
  const args = m[2]?.trim() ? m[2].split(',').map((a) => a.trim()) : [];
  return { key: m[1].trim(), args };
}

/** Replaces {0}, {1}, ... with args. */
export function fillParams(raw: string, args: string[]): string {
  return raw.replace(/\{(\d+)\}/g, (_, i: string) => {
    const arg = args[Number(i)];
    if (arg === undefined) {
      throw new LocatorSyntaxError(`Locator needs a value for {${i}} but got ${args.length} argument(s): ${raw}`);
    }
    return arg;
  });
}
