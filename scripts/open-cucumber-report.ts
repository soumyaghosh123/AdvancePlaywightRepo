/** npm run report:cucumber — opens reports/cucumber/report.html in the default browser. */
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('reports/cucumber/report.html');
if (!fs.existsSync(file)) {
  console.error(`No Cucumber report at ${file}. Run the tests first (with "cucumber" in the profile's reports).`);
  process.exit(1);
}
const open = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${open} "${file}"`);
console.log(`Opened ${file}`);
