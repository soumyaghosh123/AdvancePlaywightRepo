import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/unit',
  reporter: 'list',
  projects: [{ name: 'unit', use: { ...devices['Desktop Chrome'] } }],
});
