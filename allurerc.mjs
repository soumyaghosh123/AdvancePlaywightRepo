// Allure 3 report settings. `npm run report:allure` builds reports/allure-report from reports/allure-results.
import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Playwright BDD Test Report',
  output: './reports/allure-report',
  // Keeps one entry per run so the report can show trends and flaky/new failures across runs.
  historyPath: './reports/allure-history.jsonl',
  historyLimit: 20,
  plugins: {
    awesome: {
      options: {
        reportName: 'Playwright BDD Test Report',
        // One self-contained index.html: opens by double-click (file://) and is easy to keep as a CI artifact.
        singleFile: true,
        // Browser, then Feature name (playwright-bdd puts the Feature in subSuite).
        groupBy: ['parentSuite', 'subSuite'],
      },
    },
  },
});
