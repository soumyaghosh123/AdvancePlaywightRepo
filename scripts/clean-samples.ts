/**
 * npm run clean:samples
 * Removes the bundled samples so the template is blank for your application.
 * The mock server (tests/mock-server) stays: the framework's own unit tests use it.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const removed: string[] = [];

function rm(rel: string): void {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    removed.push(rel);
  }
}

rm('features/_samples');
for (const f of fs.existsSync(path.join(root, 'src/app/locators'))
  ? fs.readdirSync(path.join(root, 'src/app/locators'))
  : []) {
  if (f.startsWith('sample')) rm(`src/app/locators/${f}`);
}
const locatorsFile = path.join(root, 'src/app/locators/locators.json');
if (fs.existsSync(locatorsFile)) {
  const sections = JSON.parse(fs.readFileSync(locatorsFile, 'utf8')) as Record<string, unknown>;
  const samples = Object.keys(sections).filter((page) => page.startsWith('sample'));
  if (samples.length) {
    samples.forEach((page) => delete sections[page]);
    fs.writeFileSync(locatorsFile, `${JSON.stringify(sections, null, 2)}\n`);
    removed.push(`src/app/locators/locators.json: section(s) ${samples.join(', ')}`);
  }
}
[
  'test-data/test/users.json',
  'templates/json/createUser.json',
  'templates/soap/echo.xml',
  'templates/schemas/user.schema.json',
].forEach(rm);

const SAMPLE_LINE = /^(PAGE_SAMPLE_|API_SAMPLE_|SOAP_SAMPLE_|SAMPLE_)\w*=|^# ---- Samples/;
for (const env of fs.readdirSync(path.join(root, 'config/env')).filter((f) => f.endsWith('.env'))) {
  const file = path.join(root, 'config/env', env);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const kept = lines.filter((l) => !SAMPLE_LINE.test(l));
  if (kept.length !== lines.length) {
    fs.writeFileSync(file, kept.join('\n').replace(/\n{3,}/g, '\n\n'));
    removed.push(`config/env/${env}: ${lines.length - kept.length} sample line(s)`);
  }
}

console.log(removed.length ? `Removed:\n  ${removed.join('\n  ')}` : 'Nothing to remove: samples already cleaned.');
console.log('Next: set BASE_URL in config/env/<env>.env, then `npm run generate` to scaffold your first page.');
