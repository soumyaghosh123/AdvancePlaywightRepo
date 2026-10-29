/** Runs once before all workers. Clears last run's Allure results so the report shows only this run. */
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config/loadConfig';
import { REPORT_DIRS } from '../config/reporters';

export default function globalSetup(): void {
  const cfg = getConfig();
  if (cfg.profile.reports.includes('allure')) {
    fs.rmSync(path.join(cfg.rootDir, REPORT_DIRS.allureResults), { recursive: true, force: true });
  }
}
