/**
 * Builds the Allure HTML report (reports/allure-report/index.html) when the run ends.
 * Listed after allure-playwright in buildReporters, so the results are complete. Never fails the run.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Reporter } from '@playwright/test/reporter';
import { REPORT_DIRS } from '../config/reporters';

export default class AllureReportBuilder implements Reporter {
  printsToStdio(): boolean {
    return false;
  }

  onEnd(): void {
    const root = process.cwd();
    const results = path.join(root, REPORT_DIRS.allureResults);
    if (!fs.existsSync(results) || !fs.readdirSync(results).some((f) => f.endsWith('-result.json'))) return;
    try {
      execFileSync(
        process.execPath,
        [path.join(root, 'node_modules', 'allure', 'cli.js'), 'generate', REPORT_DIRS.allureResults, '--clean'],
        { cwd: root, stdio: 'pipe', env: { ...process.env, NO_COLOR: '1' } },
      );
      console.log(`\n  Allure report: ${path.join(root, REPORT_DIRS.allureReport, 'index.html')}`);
    } catch (e) {
      console.warn(
        `\n  Allure report was not built: ${(e as Error).message.split('\n')[0]}. Run: npm run report:allure`,
      );
    }
  }
}
