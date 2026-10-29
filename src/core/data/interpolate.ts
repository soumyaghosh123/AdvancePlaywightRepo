import { faker } from '@faker-js/faker';
import { add, format, sub } from 'date-fns';
import { InterpolationError } from '../errors';

export interface InterpolationSources {
  data: (path: string) => unknown;
  env: Record<string, string>;
  secret: (name: string) => string;
  ctx: (key: string) => unknown;
  now?: () => Date;
}

/** `${root...}` optionally preceded by a backslash (escape). Text that is not a well-formed placeholder is left alone. */
const PLACEHOLDER = /(\\?)\$\{([A-Za-z_]\w*)([^}]*)\}/g;
const TODAY = /^(?:([+-])(\d+)([dwmy]))?(?::(.+))?$/;
const UNITS = { d: 'days', w: 'weeks', m: 'months', y: 'years' } as const;

function stringify(value: unknown): string {
  return value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function today(rest: string, now: Date, whole: string): string {
  const m = TODAY.exec(rest);
  if (!m) throw new InterpolationError(`Malformed date placeholder ${whole} (use \${today+2d:dd/MM/yyyy})`);
  const [, sign, amount, unit, fmt] = m;
  const date = sign ? (sign === '+' ? add : sub)(now, { [UNITS[unit as keyof typeof UNITS]]: Number(amount) }) : now;
  return format(date, fmt ?? 'yyyy-MM-dd');
}

function fake(path: string, whole: string): string {
  const [mod, fn] = path.split('.');
  const target = (faker as unknown as Record<string, Record<string, unknown>>)[mod]?.[fn];
  if (typeof target !== 'function') throw new InterpolationError(`Unknown faker function ${whole}`);
  return stringify((target as () => unknown).call((faker as unknown as Record<string, unknown>)[mod]));
}

function resolveOne(root: string, rest: string, s: InterpolationSources, whole: string): string {
  if (root === 'today') return today(rest, (s.now ?? (() => new Date()))(), whole);
  const name = rest.startsWith('.') ? rest.slice(1) : '';
  if (!name) throw new InterpolationError(`Unknown placeholder ${whole}`);
  let value: unknown;
  switch (root) {
    case 'data':
      value = s.data(name);
      break;
    case 'env':
      value = s.env[name];
      break;
    case 'secret':
      return s.secret(name);
    case 'ctx':
      value = s.ctx(name);
      break;
    case 'faker':
      return fake(name, whole);
    default:
      throw new InterpolationError(`Unknown placeholder ${whole}`);
  }
  if (value === undefined) throw new InterpolationError(`Placeholder ${whole} has no value`);
  return stringify(value);
}

/** Replaces ${data.x} ${env.X} ${secret.X} ${ctx.x} ${faker.mod.fn} ${today±N(d|w|m|y)[:format]}; \${ is a literal. */
export function interpolate(input: string, s: InterpolationSources): string {
  return input.replace(PLACEHOLDER, (whole: string, escape: string, root: string, rest: string) => {
    if (escape) return whole.slice(1);
    return resolveOne(root, rest, s, whole);
  });
}
